import { z } from "zod";
import {
  fixtureSchema,
  gameweekScopeSchema,
  jsonValueSchema,
  type CaptureBatch,
  type Forecast,
  type ForecastComponents,
} from "../contracts.ts";

const probabilitySchema = z.number().min(0).max(1);
const baselineMarketQuoteSchema = z.object({
  sourceKey: z.string().min(1),
  label: z.string().min(1),
  marketFamily: z.enum(["goal", "assist", "clean-sheet", "team-win"]),
  decimalOdds: z.number().gt(1),
  adjustedProbability: probabilitySchema.optional(),
});

export const baselinePlayerInputSchema = z.object({
  playerKey: z.string().min(1),
  playerName: z.string().min(1),
  teamKey: z.string().min(1),
  position: z.enum(["GKP", "DEF", "MID", "FWD"]),
  playProbability: probabilitySchema,
  sixtyMinuteProbability: probabilitySchema,
  ownershipPercent: z.number().min(0).max(100).optional(),
  price: z.number().positive().optional(),
  market: z.object({
    goalProbability: probabilitySchema.optional(),
    assistProbability: probabilitySchema.optional(),
    cleanSheetProbability: probabilitySchema.optional(),
    teamWinProbability: probabilitySchema.optional(),
    sourceKeys: z.array(z.string().min(1)).min(1),
    quotes: z.array(baselineMarketQuoteSchema).default([]),
  }),
  history: z.object({
    goalsPer90: z.number().min(0),
    assistsPer90: z.number().min(0),
  }),
});

export const baselineForecastInputSchema = gameweekScopeSchema.extend({
  observedAt: z.iso.datetime({ offset: true }),
  deadlineAt: z.iso.datetime({ offset: true }),
  fixtures: z.array(fixtureSchema).default([]),
  players: z.array(baselinePlayerInputSchema).min(1),
});

export type BaselineForecastInput = z.input<typeof baselineForecastInputSchema>;
type ParsedBaselineForecastInput = z.output<typeof baselineForecastInputSchema>;
type BaselinePlayerInput = z.output<typeof baselinePlayerInputSchema>;
type BaselineMarketQuote = z.infer<typeof baselineMarketQuoteSchema>;

type WeightedOutcome = { points: number; probability: number };

const goalPoints = { GKP: 10, DEF: 6, MID: 5, FWD: 4 } as const;
const cleanSheetPoints = { GKP: 4, DEF: 4, MID: 1, FWD: 0 } as const;

function round(value: number): number {
  return Number(value.toFixed(2));
}

function clampProbability(value: number): number {
  return Math.max(0, Math.min(0.999, value));
}

function quoteProbability(quote: BaselineMarketQuote): number {
  return quote.adjustedProbability ?? clampProbability(1 / quote.decimalOdds);
}

function quoteConsensus(
  quotes: BaselineMarketQuote[],
  marketFamily: BaselineMarketQuote["marketFamily"],
): number | undefined {
  const selected = quotes.filter((quote) => quote.marketFamily === marketFamily);
  if (selected.length === 0) return undefined;
  return selected.reduce((total, quote) => total + quoteProbability(quote), 0) / selected.length;
}

function marketLabel(marketFamily: BaselineMarketQuote["marketFamily"]): string {
  if (marketFamily === "goal") return "Anytime scorer";
  if (marketFamily === "assist") return "Assist";
  if (marketFamily === "team-win") return "Team win";
  return "Clean sheet";
}

function poissonRateForAtLeastOne(probability: number): number {
  return -Math.log(1 - clampProbability(probability));
}

function poissonBins(rate: number, lastBin: number): Array<{ count: number; probability: number }> {
  const bins: Array<{ count: number; probability: number }> = [];
  let assigned = 0;
  for (let count = 0; count < lastBin; count += 1) {
    const probability = (Math.exp(-rate) * rate ** count) / factorial(count);
    assigned += probability;
    bins.push({ count, probability });
  }
  bins.push({ count: lastBin, probability: Math.max(0, 1 - assigned) });
  return bins;
}

function factorial(value: number): number {
  let result = 1;
  for (let current = 2; current <= value; current += 1) result *= current;
  return result;
}

function quantile(outcomes: WeightedOutcome[], target: number): number {
  const ordered = outcomes.toSorted((a, b) => a.points - b.points);
  let cumulative = 0;
  for (const outcome of ordered) {
    cumulative += outcome.probability;
    if (cumulative >= target) return outcome.points;
  }
  return ordered.at(-1)?.points ?? 0;
}

export function devigDecimalOdds(odds: number[]): number[] {
  if (odds.length < 2 || odds.some((price) => !Number.isFinite(price) || price <= 1)) {
    throw new Error("At least two decimal prices greater than 1 are required");
  }
  const implied = odds.map((price) => 1 / price);
  const overround = implied.reduce((total, probability) => total + probability, 0);
  return implied.map((probability) => probability / overround);
}

function rateFor(
  marketProbability: number | undefined,
  historyPer90: number,
  playProbability: number,
  sixtyMinuteProbability: number,
): { unconditional: number; usedFallback: boolean } {
  if (marketProbability !== undefined) {
    return { unconditional: poissonRateForAtLeastOne(marketProbability), usedFallback: false };
  }
  const expectedMinutes = playProbability * 30 + sixtyMinuteProbability * 45;
  return {
    unconditional: historyPer90 * (expectedMinutes / 90),
    usedFallback: true,
  };
}

function distributionFor(
  player: BaselinePlayerInput,
  goalRate: number,
  assistRate: number,
  bonusPerAppearance: number,
  cleanProbability: number,
): WeightedOutcome[] {
  const playProbability = player.playProbability;
  const sixtyProbability = Math.min(player.sixtyMinuteProbability, playProbability);
  const minuteScenarios = [
    { appearancePoints: 0, probability: 1 - playProbability, overSixty: false },
    { appearancePoints: 1, probability: playProbability - sixtyProbability, overSixty: false },
    { appearancePoints: 2, probability: sixtyProbability, overSixty: true },
  ];
  const conditionalGoalRate = playProbability > 0 ? goalRate / playProbability : 0;
  const conditionalAssistRate = playProbability > 0 ? assistRate / playProbability : 0;
  const goalBins = poissonBins(conditionalGoalRate, 4);
  const assistBins = poissonBins(conditionalAssistRate, 3);
  const outcomes: WeightedOutcome[] = [];

  for (const minute of minuteScenarios) {
    if (minute.probability <= 0) continue;
    if (minute.appearancePoints === 0) {
      outcomes.push({ points: 0, probability: minute.probability });
      continue;
    }
    const cleanScenarios = minute.overSixty
      ? [
          { clean: 0, probability: 1 - cleanProbability },
          { clean: 1, probability: cleanProbability },
        ]
      : [{ clean: 0, probability: 1 }];
    for (const goals of goalBins) {
      for (const assists of assistBins) {
        for (const clean of cleanScenarios) {
          outcomes.push({
            points: round(
              minute.appearancePoints +
                goals.count * goalPoints[player.position] +
                assists.count * 3 +
                clean.clean * cleanSheetPoints[player.position] +
                bonusPerAppearance,
            ),
            probability:
              minute.probability * goals.probability * assists.probability * clean.probability,
          });
        }
      }
    }
  }
  return outcomes;
}

function unrankedForecast(
  input: ParsedBaselineForecastInput,
  player: BaselinePlayerInput,
): Omit<Forecast, "rank"> {
  const sixtyProbability = Math.min(player.sixtyMinuteProbability, player.playProbability);
  const goalProbability =
    player.market.goalProbability ?? quoteConsensus(player.market.quotes, "goal");
  const assistProbability =
    player.market.assistProbability ?? quoteConsensus(player.market.quotes, "assist");
  const teamWinProbability =
    player.market.teamWinProbability ?? quoteConsensus(player.market.quotes, "team-win");
  const cleanSheetProbability =
    player.market.cleanSheetProbability ??
    quoteConsensus(player.market.quotes, "clean-sheet") ??
    (teamWinProbability === undefined ? 0 : Math.min(0.72, 0.12 + teamWinProbability * 0.48));
  const goal = rateFor(
    goalProbability,
    player.history.goalsPer90,
    player.playProbability,
    sixtyProbability,
  );
  const assist = rateFor(
    assistProbability,
    player.history.assistsPer90,
    player.playProbability,
    sixtyProbability,
  );
  const bonus = Math.min(1.5, (goal.unconditional * 0.7 + assist.unconditional * 0.35) * 1.25);
  const components: ForecastComponents = {
    appearance: round(player.playProbability + sixtyProbability),
    goals: round(goal.unconditional * goalPoints[player.position]),
    assists: round(assist.unconditional * 3),
    cleanSheet: round(sixtyProbability * cleanSheetProbability * cleanSheetPoints[player.position]),
    bonus: round(bonus),
    other: 0,
  };
  const expectedPoints = round(
    Object.values(components).reduce((total, component) => total + component, 0),
  );
  const bonusPerAppearance = player.playProbability > 0 ? bonus / player.playProbability : 0;
  const outcomes = distributionFor(
    player,
    goal.unconditional,
    assist.unconditional,
    bonusPerAppearance,
    cleanSheetProbability,
  );
  const fallbackLabels = [
    goal.usedFallback ? "goals" : undefined,
    assist.usedFallback ? "assists" : undefined,
  ].filter((label) => label !== undefined);
  const marketCoverage = 3 - fallbackLabels.length;
  const confidence = round(0.45 + (marketCoverage / 3) * 0.4);
  const expectedMinutes = round(player.playProbability * 30 + sixtyProbability * 45);
  const consensus = (["goal", "assist", "team-win", "clean-sheet"] as const).flatMap(
    (marketFamily) => {
      const quotes = player.market.quotes.filter((quote) => quote.marketFamily === marketFamily);
      const explicit =
        marketFamily === "goal"
          ? goalProbability
          : marketFamily === "assist"
            ? assistProbability
            : marketFamily === "team-win"
              ? teamWinProbability
              : cleanSheetProbability;
      if (quotes.length === 0 && explicit === undefined) return [];
      const probabilities = quotes.map(quoteProbability);
      const probability =
        quotes.length > 0
          ? probabilities.reduce((total, value) => total + value, 0) / quotes.length
          : explicit;
      if (probability === undefined) return [];
      const low = probabilities.length > 0 ? Math.min(...probabilities) : probability;
      const high = probabilities.length > 0 ? Math.max(...probabilities) : probability;
      return [
        {
          marketFamily,
          label: marketLabel(marketFamily),
          probability: round(probability),
          low: round(low),
          high: round(high),
          spread: round(high - low),
          quoteCount: quotes.length,
          adjustmentMethod: quotes.some((quote) => quote.adjustedProbability !== undefined)
            ? "paired-outcome de-vig, then mean"
            : "mean implied probability",
        },
      ];
    },
  );

  return {
    modelKey: "baseline-xp-v1",
    playerKey: player.playerKey,
    playerName: player.playerName,
    teamKey: player.teamKey,
    position: player.position,
    competition: input.competition,
    season: input.season,
    gameweek: input.gameweek,
    observedAt: input.observedAt,
    deadlineAt: input.deadlineAt,
    expectedPoints,
    p10: round(quantile(outcomes, 0.1)),
    p50: round(quantile(outcomes, 0.5)),
    p90: round(quantile(outcomes, 0.9)),
    components,
    evidence: {
      headline:
        fallbackLabels.length === 0
          ? "Player markets and minutes aligned"
          : "Partial market coverage",
      detail:
        fallbackLabels.length === 0
          ? "Goal, assist, clean-sheet, and minutes evidence feed the FPL rules engine."
          : `${fallbackLabels.join(" and ")} use a minutes-adjusted historical fallback; available market evidence remains explicit.`,
      sourceKeys: [...new Set(player.market.sourceKeys)],
      confidence,
      signals: [
        {
          key: "availability",
          sourceKey: "model",
          label: "Availability",
          value: `${Math.round(player.playProbability * 100)}%`,
          detail: "Probability of any appearance from the minutes prior",
        },
        ...(player.ownershipPercent === undefined
          ? []
          : [
              {
                key: "ownership",
                sourceKey: "fpl",
                label: "Ownership",
                value: `${player.ownershipPercent.toFixed(1)}%`,
                detail: "Current FPL selected-by percentage",
              },
            ]),
        ...consensus.map((market) => ({
          key: `${market.marketFamily}-probability`,
          sourceKey:
            market.quoteCount > 1 ? "consensus" : (player.market.sourceKeys[0] ?? "market"),
          label: market.label,
          value: `${Math.round(market.probability * 100)}%`,
          detail:
            market.quoteCount > 0
              ? `${market.quoteCount} quotes span ${Math.round(market.low * 100)}–${Math.round(market.high * 100)}%`
              : "Model input probability",
        })),
      ],
      recipe: {
        quotes: player.market.quotes.map((quote) => ({
          sourceKey: quote.sourceKey,
          label: quote.label,
          marketFamily: quote.marketFamily,
          decimalOdds: quote.decimalOdds,
          impliedProbability: round(quoteProbability(quote)),
        })),
        consensus,
        minutes: {
          playProbability: player.playProbability,
          sixtyMinuteProbability: sixtyProbability,
          expectedMinutes,
        },
        rates: {
          goal: round(goal.unconditional),
          assist: round(assist.unconditional),
          cleanSheet: round(cleanSheetProbability),
        },
      },
    },
    metadata: {
      ruleset: "fpl-2025-26-v1",
      marketCoverage,
      goalRate: round(goal.unconditional),
      assistRate: round(assist.unconditional),
      expectedMinutes,
      ...(player.ownershipPercent === undefined
        ? {}
        : { ownershipPercent: player.ownershipPercent }),
      ...(player.price === undefined ? {} : { price: player.price }),
    },
  };
}

export function createBaselineForecastBatch(value: BaselineForecastInput): CaptureBatch {
  const input = baselineForecastInputSchema.parse(value);
  const ranked = input.players
    .map((player) => unrankedForecast(input, player))
    .toSorted((a, b) => b.expectedPoints - a.expectedPoints)
    .map((forecast, index): Forecast => ({ ...forecast, rank: index + 1 }));

  return {
    id: `baseline-xp-v1:${input.competition}:${input.season}:${input.gameweek}:${input.observedAt}`,
    source: {
      key: "baseline-xp-v1",
      label: "Baseline odds-to-points model",
      kind: "model",
      metadata: { ruleset: "fpl-2025-26-v1" },
    },
    capturedAt: input.observedAt,
    fixtures: input.fixtures,
    rawSnapshots: [
      {
        key: `baseline-xp-v1:input:${input.observedAt}`,
        endpoint: "model://baseline-xp-v1/input",
        observedAt: input.observedAt,
        payload: jsonValueSchema.parse(input),
      },
    ],
    observations: [],
    forecasts: ranked,
    annotations: [],
    metadata: { ruleset: "fpl-2025-26-v1" },
  };
}
