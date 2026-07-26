import { z } from "zod";
import { resolvePremierLeagueTeam } from "./entity-resolution.ts";
import type { JsonValue } from "./contracts.ts";
import {
  defaultFplRuleset,
  type ForecastFixtureInput,
  type ForecastRunRequest,
  type FplPosition,
  type FplRuleset,
} from "./model/v2.ts";
import type {
  OpportunitySeasonContext,
  OpportunityTrailPoint,
  OwnershipState,
  PriceState,
  SourceHealth,
  FplPlayerState,
  SeasonRulesSnapshot,
} from "./opportunity-map.ts";

export type AutomatedForecastBatch = {
  id: string;
  sourceKey: string;
  capturedAt: string;
  publishedAt?: string;
  metadata?: Record<string, JsonValue>;
};

export type AutomatedForecastAttempt = {
  sourceKey: string;
  scheduledFor: string;
  status: "running" | "succeeded" | "partial" | "failed" | "skipped";
  error?: string;
};

export type AutomatedForecastObservation = {
  batchId: string;
  sourceKey: string;
  entityKey: string;
  fixtureKey?: string;
  metric: string;
  observedAt: string;
  publishedAt?: string;
  numericValue?: number;
  stringValue?: string;
  marketFamily?: string;
  outcome?: string;
  metadata?: Record<string, JsonValue>;
};

export type AutomatedForecastFixture = {
  key: string;
  gameweek: number;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  homeDifficulty?: number;
  awayDifficulty?: number;
};

export type AutomatedForecastRegistration = {
  registrationKey: string;
  playerKey: string;
  name: string;
  team: string;
  position: FplPosition;
  status: "provisional" | "active" | "departed" | "unresolved";
};

export type AutomatedForecastInput = {
  datasetKey: string;
  season: OpportunitySeasonContext;
  fromGameweek: number;
  horizon: 1 | 3 | 5;
  cutoffAt: string;
  codeVersion: string;
  batches: AutomatedForecastBatch[];
  attempts?: AutomatedForecastAttempt[];
  fixtures: AutomatedForecastFixture[];
  registrations: AutomatedForecastRegistration[];
  observations: AutomatedForecastObservation[];
  playerTrails?: Record<string, OpportunityTrailPoint[]>;
};

export type AutomatedForecastPreparation =
  | { status: "ready"; request: ForecastRunRequest }
  | { status: "skipped"; reason: string };

type FixtureMarketEstimate = ForecastFixtureInput & { agreement: number };

const officialFplConfigurationSchema = z.object({
  gameConfig: z.object({
    rules: z.object({
      squad_squadplay: z.number().int().positive(),
      squad_squadsize: z.number().int().positive(),
      squad_team_limit: z.number().int().positive(),
      squad_total_spend: z.number().positive(),
      ui_currency_multiplier: z.number().positive(),
    }),
    scoring: z.object({
      long_play: z.number().finite(),
      short_play: z.number().finite(),
      goals_conceded: z.object({
        GKP: z.number().finite(),
        DEF: z.number().finite(),
        MID: z.number().finite(),
        FWD: z.number().finite(),
      }),
      goals_scored: z.object({
        GKP: z.number().finite(),
        DEF: z.number().finite(),
        MID: z.number().finite(),
        FWD: z.number().finite(),
      }),
      assists: z.number().finite(),
      clean_sheets: z.object({
        GKP: z.number().finite(),
        DEF: z.number().finite(),
        MID: z.number().finite(),
        FWD: z.number().finite(),
      }),
      penalties_saved: z.number().finite(),
      penalties_missed: z.number().finite(),
      yellow_cards: z.number().finite(),
      red_cards: z.number().finite(),
      own_goals: z.number().finite(),
      defensive_contribution: z.object({
        GKP: z.number().finite(),
        DEF: z.number().finite(),
        MID: z.number().finite(),
        FWD: z.number().finite(),
      }),
    }),
  }),
  elementTypes: z.array(
    z.object({
      plural_name_short: z.enum(["GKP", "DEF", "MID", "FWD"]),
      squad_select: z.number().int().positive(),
      squad_min_play: z.number().int().nonnegative(),
      squad_max_play: z.number().int().positive(),
    }),
  ),
  rulesetChecksum: z.string().min(1),
});

const priors: Record<
  FplPosition,
  { goalsPer90: number; assistsPer90: number; sixtyProbability: number }
> = {
  GKP: { goalsPer90: 0, assistsPer90: 0.01, sixtyProbability: 0.92 },
  DEF: { goalsPer90: 0.08, assistsPer90: 0.1, sixtyProbability: 0.8 },
  MID: { goalsPer90: 0.24, assistsPer90: 0.18, sixtyProbability: 0.78 },
  FWD: { goalsPer90: 0.38, assistsPer90: 0.16, sixtyProbability: 0.76 },
};

function clamp(value: number, low = 0, high = 1): number {
  return Math.min(high, Math.max(low, value));
}

function officialFplRules(
  input: AutomatedForecastInput,
): { snapshot: SeasonRulesSnapshot; ruleset: FplRuleset } | undefined {
  const fplBatch = input.batches.find((batch) => batch.sourceKey === "fpl");
  if (!fplBatch?.metadata) return undefined;
  const parsed = officialFplConfigurationSchema.safeParse(fplBatch.metadata);
  if (!parsed.success) return undefined;
  const { gameConfig, elementTypes, rulesetChecksum } = parsed.data;
  const { rules, scoring } = gameConfig;
  const positionRules = Object.fromEntries(
    elementTypes.map((position) => [
      position.plural_name_short,
      {
        squad: position.squad_select,
        minStart: position.squad_min_play,
        maxStart: position.squad_max_play,
      },
    ]),
  ) as SeasonRulesSnapshot["positionRules"];
  if (Object.keys(positionRules).length !== 4) return undefined;

  return {
    snapshot: {
      source: "fpl-game-config",
      checksum: rulesetChecksum,
      observedAt: fplBatch.capturedAt,
      budget: rules.squad_total_spend / rules.ui_currency_multiplier,
      squadSize: rules.squad_squadsize,
      startingSize: rules.squad_squadplay,
      clubLimit: rules.squad_team_limit,
      positionRules,
    },
    ruleset: {
      ...defaultFplRuleset,
      key: input.season.rulesetKey,
      appearance: {
        underSixty: scoring.short_play,
        sixtyPlus: scoring.long_play,
      },
      goal: scoring.goals_scored,
      assist: scoring.assists,
      cleanSheet: scoring.clean_sheets,
      defensiveContributions: {
        ...defaultFplRuleset.defensiveContributions,
        points: scoring.defensive_contribution.DEF,
      },
      yellowCard: scoring.yellow_cards,
      redCard: scoring.red_cards,
      ownGoal: scoring.own_goals,
      penaltyMiss: scoring.penalties_missed,
      penaltySave: scoring.penalties_saved,
    },
  };
}

function mean(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function deviation(values: number[]): number {
  const average = mean(values);
  if (average === undefined || values.length < 2) return 0.1;
  return Math.sqrt(
    values.reduce((total, value) => total + (value - average) ** 2, 0) / values.length,
  );
}

function sourceOutcomeTeam(outcome: string): string | undefined {
  try {
    return resolvePremierLeagueTeam(outcome);
  } catch {
    return undefined;
  }
}

function bookmakerKey(observation: AutomatedForecastObservation): string {
  const value = observation.metadata?.bookmakerKey;
  return typeof value === "string" ? value : "market";
}

function groupByBook(observations: AutomatedForecastObservation[]) {
  const grouped = new Map<string, AutomatedForecastObservation[]>();
  for (const observation of observations) {
    const key = bookmakerKey(observation);
    grouped.set(key, [...(grouped.get(key) ?? []), observation]);
  }
  return grouped;
}

function estimateFixture(
  fixture: AutomatedForecastFixture,
  observations: AutomatedForecastObservation[],
): FixtureMarketEstimate {
  const rows = observations.filter(
    (observation) =>
      observation.fixtureKey === fixture.key && observation.numericValue !== undefined,
  );
  const h2hByBook = groupByBook(rows.filter((row) => row.marketFamily === "h2h"));
  const homeProbabilities: number[] = [];
  const awayProbabilities: number[] = [];
  for (const bookRows of h2hByBook.values()) {
    const implied = bookRows.flatMap((row) => {
      const team = row.outcome ? sourceOutcomeTeam(row.outcome) : undefined;
      const probability = row.numericValue ? 1 / row.numericValue : undefined;
      return probability === undefined ? [] : [{ team, outcome: row.outcome, probability }];
    });
    const total = implied.reduce((sum, row) => sum + row.probability, 0);
    if (total <= 0) continue;
    const home = implied.find((row) => row.team === fixture.homeTeam);
    const away = implied.find((row) => row.team === fixture.awayTeam);
    if (home && away) {
      homeProbabilities.push(home.probability / total);
      awayProbabilities.push(away.probability / total);
    }
  }

  const totalsByBook = groupByBook(rows.filter((row) => row.marketFamily === "totals"));
  const totalGoalRates: number[] = [];
  for (const bookRows of totalsByBook.values()) {
    const availablePoints = bookRows
      .map((row) => row.metadata?.point)
      .filter((point): point is number => typeof point === "number");
    const selectedPoint = availablePoints.toSorted(
      (left, right) => Math.abs(left - 2.5) - Math.abs(right - 2.5),
    )[0];
    if (selectedPoint === undefined) continue;
    const atPoint = bookRows.filter((row) => row.metadata?.point === selectedPoint);
    const over = atPoint.find((row) => row.outcome?.toLocaleLowerCase() === "over");
    const under = atPoint.find((row) => row.outcome?.toLocaleLowerCase() === "under");
    if (!over?.numericValue || !under?.numericValue) continue;
    const overImplied = 1 / over.numericValue;
    const underImplied = 1 / under.numericValue;
    const overProbability = overImplied / (overImplied + underImplied);
    totalGoalRates.push(clamp(selectedPoint + (overProbability - 0.5) * 1.4, 1.5, 4.5));
  }

  const totalGoalRate = mean(totalGoalRates) ?? 2.65;
  const homeProbability = mean(homeProbabilities);
  const awayProbability = mean(awayProbabilities);
  const homeShare =
    homeProbability !== undefined && awayProbability !== undefined
      ? clamp(homeProbability / (homeProbability + awayProbability), 0.35, 0.7)
      : 0.55;
  const familyCoverage = Number(homeProbabilities.length > 0) + Number(totalGoalRates.length > 0);
  const marketCoverage = familyCoverage / 2;
  const agreement =
    familyCoverage === 0
      ? 0.4
      : clamp(
          1 -
            (deviation(homeProbabilities) + deviation(totalGoalRates.map((rate) => rate / 4.5))) *
              1.5,
          0.4,
          1,
        );

  return {
    ...fixture,
    homeGoalRate: Number((totalGoalRate * homeShare).toFixed(3)),
    awayGoalRate: Number((totalGoalRate * (1 - homeShare)).toFixed(3)),
    marketCoverage,
    agreement,
  };
}

function metricMap(observations: AutomatedForecastObservation[]) {
  const byPlayer = new Map<string, Map<string, number>>();
  for (const observation of observations) {
    if (
      !["fpl", "fpl-element-summary"].includes(observation.sourceKey) ||
      observation.metric.startsWith("historical_") ||
      observation.numericValue === undefined
    )
      continue;
    const metrics = byPlayer.get(observation.entityKey) ?? new Map<string, number>();
    metrics.set(observation.metric, observation.numericValue);
    byPlayer.set(observation.entityKey, metrics);
  }
  return byPlayer;
}

type HistoricalPrior = {
  minutes: number;
  goalsPer90?: number;
  assistsPer90?: number;
};

function historicalPriorMap(
  observations: AutomatedForecastObservation[],
): Map<string, HistoricalPrior> {
  const byPlayerAndSeason = new Map<string, Map<string, Map<string, number>>>();
  for (const observation of observations) {
    const sourceSeason = observation.metadata?.sourceSeason;
    if (
      observation.sourceKey !== "fpl-element-summary" ||
      !observation.metric.startsWith("historical_") ||
      observation.metric === "historical_season" ||
      observation.numericValue === undefined ||
      typeof sourceSeason !== "string"
    ) {
      continue;
    }
    const bySeason =
      byPlayerAndSeason.get(observation.entityKey) ?? new Map<string, Map<string, number>>();
    const metrics = bySeason.get(sourceSeason) ?? new Map<string, number>();
    metrics.set(observation.metric.slice("historical_".length), observation.numericValue);
    bySeason.set(sourceSeason, metrics);
    byPlayerAndSeason.set(observation.entityKey, bySeason);
  }

  const result = new Map<string, HistoricalPrior>();
  for (const [playerKey, bySeason] of byPlayerAndSeason) {
    const seasons = [...bySeason.entries()]
      .toSorted(([left], [right]) => right.localeCompare(left))
      .slice(0, 3);
    let weightedMinutes = 0;
    let weightedGoals = 0;
    let weightedAssists = 0;
    let goalMinutes = 0;
    let assistMinutes = 0;
    seasons.forEach(([, metrics], index) => {
      const weight = [1, 0.65, 0.4][index] ?? 0;
      const minutes = metrics.get("minutes") ?? 0;
      const goals = metrics.get("expected_goals") ?? metrics.get("goals_scored");
      const assists = metrics.get("expected_assists") ?? metrics.get("assists");
      weightedMinutes += minutes * weight;
      if (goals !== undefined) {
        weightedGoals += goals * weight;
        goalMinutes += minutes * weight;
      }
      if (assists !== undefined) {
        weightedAssists += assists * weight;
        assistMinutes += minutes * weight;
      }
    });
    result.set(playerKey, {
      minutes: weightedMinutes,
      ...(goalMinutes > 0 ? { goalsPer90: (weightedGoals * 90) / goalMinutes } : {}),
      ...(assistMinutes > 0 ? { assistsPer90: (weightedAssists * 90) / assistMinutes } : {}),
    });
  }
  return result;
}

function textMetricMap(observations: AutomatedForecastObservation[]) {
  const byPlayer = new Map<string, Map<string, string>>();
  for (const observation of observations) {
    if (observation.sourceKey !== "fpl" || observation.stringValue === undefined) continue;
    const metrics = byPlayer.get(observation.entityKey) ?? new Map<string, string>();
    metrics.set(observation.metric, observation.stringValue);
    byPlayer.set(observation.entityKey, metrics);
  }
  return byPlayer;
}

function sourceHealth(
  input: AutomatedForecastInput,
  fixtureEstimates: FixtureMarketEstimate[],
  playerMetricCount: number,
  historicalPlayerCount: number,
  observedAt: string,
): SourceHealth[] {
  const specs = [
    {
      key: "premier-league-schedule",
      label: "Premier League schedule",
      freshMinutes: 2_160,
      coverage: clamp(fixtureEstimates.length / Math.max(1, input.horizon * 10)),
      detail: `${fixtureEstimates.length} fixtures in the selected horizon`,
    },
    {
      key: "fpl",
      label: "Fantasy Premier League",
      freshMinutes: 90,
      coverage: clamp(playerMetricCount / Math.max(1, input.registrations.length)),
      detail: `${playerMetricCount} of ${input.registrations.length} registrations observed`,
    },
    {
      key: "fpl-element-summary",
      label: "FPL season history",
      freshMinutes: 2_160,
      coverage: clamp(historicalPlayerCount / Math.max(1, input.registrations.length)),
      detail: `${historicalPlayerCount} registrations have season-labelled historical priors`,
    },
    {
      key: "odds-api",
      label: "Bookmaker consensus",
      freshMinutes: 60,
      coverage: mean(fixtureEstimates.map((fixture) => fixture.marketCoverage)) ?? 0,
      detail: "H2H and totals markets are de-vigged before conversion to goal rates",
    },
    {
      key: "polymarket",
      label: "Polymarket",
      freshMinutes: 60,
      coverage: 0,
      detail: "Captured for research; unmatched markets do not influence player forecasts",
    },
  ] as const;
  const cutoff = Date.parse(observedAt);
  return specs.map((spec) => {
    const batch = input.batches.find((candidate) => candidate.sourceKey === spec.key);
    const attempt = input.attempts?.find((candidate) => candidate.sourceKey === spec.key);
    const failedAfterBatch =
      attempt?.status === "failed" &&
      (!batch || Date.parse(attempt.scheduledFor) >= Date.parse(batch.capturedAt));
    if (failedAfterBatch) {
      return {
        sourceKey: spec.key,
        label: spec.label,
        status: "failed" as const,
        ...(batch ? { lastCapturedAt: batch.capturedAt } : {}),
        coverage: spec.coverage,
        detail: attempt.error ? `Latest attempt failed: ${attempt.error}` : "Latest attempt failed",
      };
    }
    if (!batch) {
      return {
        sourceKey: spec.key,
        label: spec.label,
        status: "missing" as const,
        coverage: spec.coverage,
        detail: spec.detail,
      };
    }
    const ageMinutes = Math.max(0, cutoff - Date.parse(batch.capturedAt)) / 60_000;
    const status =
      ageMinutes > spec.freshMinutes
        ? ("stale" as const)
        : spec.coverage < 0.85
          ? ("partial" as const)
          : ("fresh" as const);
    return {
      sourceKey: spec.key,
      label: spec.label,
      status,
      lastCapturedAt: batch.capturedAt,
      coverage: spec.coverage,
      detail: spec.detail,
    };
  });
}

function shortHash(value: string): string {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

export function prepareAutomatedForecast(
  input: AutomatedForecastInput,
): AutomatedForecastPreparation {
  const fplBatch = input.batches.find((batch) => batch.sourceKey === "fpl");
  if (!fplBatch) {
    return { status: "skipped", reason: "No current-season FPL capture is available" };
  }
  if (input.registrations.length === 0) {
    return { status: "skipped", reason: "No current-season player registrations are available" };
  }
  const horizonFixtures = input.fixtures.filter(
    (fixture) =>
      fixture.gameweek >= input.fromGameweek &&
      fixture.gameweek < input.fromGameweek + input.horizon,
  );
  if (horizonFixtures.length === 0) {
    return { status: "skipped", reason: "No fixtures are available in the forecast horizon" };
  }

  const metricsByPlayer = metricMap(input.observations);
  const textByPlayer = textMetricMap(input.observations);
  const historicalByPlayer = historicalPriorMap(input.observations);
  const officialConfiguration = officialFplRules(input);
  const fixtureEstimates = horizonFixtures.map((fixture) =>
    estimateFixture(fixture, input.observations),
  );
  const ownershipRank = new Map<string, number>();
  for (const position of ["GKP", "DEF", "MID", "FWD"] as const) {
    input.registrations
      .filter((registration) => registration.position === position)
      .map((registration) => ({
        key: registration.registrationKey,
        value: metricsByPlayer.get(registration.playerKey)?.get("ownership"),
      }))
      .filter((entry): entry is { key: string; value: number } => entry.value !== undefined)
      .toSorted((left, right) => right.value - left.value)
      .forEach((entry, index) => ownershipRank.set(entry.key, index + 1));
  }

  let observedPlayers = 0;
  const modelCutoffAt = [
    ...input.batches.map((batch) => batch.capturedAt),
    ...input.batches.flatMap((batch) => (batch.publishedAt ? [batch.publishedAt] : [])),
    ...(input.attempts ?? []).map((attempt) => attempt.scheduledFor),
  ]
    .toSorted((left, right) => Date.parse(left) - Date.parse(right))
    .at(-1)!;
  const players = input.registrations
    .filter((registration) => registration.status !== "departed")
    .map((registration) => {
      const metrics = metricsByPlayer.get(registration.playerKey) ?? new Map<string, number>();
      const textMetrics = textByPlayer.get(registration.playerKey) ?? new Map<string, string>();
      const history = historicalByPlayer.get(registration.playerKey);
      if (metrics.size > 0) observedPlayers += 1;
      const prior = priors[registration.position];
      const completedGameweeks = Math.max(0, input.fromGameweek - 1);
      const minutes = completedGameweeks > 0 ? (metrics.get("minutes") ?? 0) : 0;
      const historicalMinutes = history?.minutes ?? 0;
      const historicalSampleWeight = clamp(historicalMinutes / 900, 0, 0.8);
      const sampleWeight = completedGameweeks > 0 ? clamp(minutes / 450) : historicalSampleWeight;
      const historicalGoalsPer90 = history?.goalsPer90 ?? prior.goalsPer90;
      const historicalAssistsPer90 = history?.assistsPer90 ?? prior.assistsPer90;
      const rawGoalsPer90 =
        completedGameweeks > 0
          ? (metrics.get("expected_goals_per_90") ??
            (minutes > 0
              ? ((metrics.get("expected_goals") ?? 0) * 90) / minutes
              : prior.goalsPer90))
          : historicalGoalsPer90;
      const rawAssistsPer90 =
        completedGameweeks > 0
          ? (metrics.get("expected_assists_per_90") ??
            (minutes > 0
              ? ((metrics.get("expected_assists") ?? 0) * 90) / minutes
              : prior.assistsPer90))
          : historicalAssistsPer90;
      const availability = clamp(metrics.get("availability_probability") ?? 1);
      const starts = completedGameweeks > 0 ? (metrics.get("starts") ?? 0) : 0;
      const substituteAppearances = Math.max(0, minutes - starts * 75) / 25;
      const observedPlayProbability =
        completedGameweeks > 0
          ? clamp((starts + substituteAppearances) / completedGameweeks, 0.05, 0.99)
          : undefined;
      const expectedPointsSignal = metrics.get("expected_points_next");
      const ownershipSignal = metrics.get("ownership");
      const preseasonRoleProbability =
        expectedPointsSignal !== undefined
          ? clamp(expectedPointsSignal / 4.5, 0.08, 0.99)
          : ownershipSignal !== undefined
            ? clamp(0.35 + Math.log1p(ownershipSignal) / 5, 0.35, 0.95)
            : 0.65;
      const playProbability = availability * (observedPlayProbability ?? preseasonRoleProbability);
      const empiricalSixty =
        starts > 0 && minutes > 0
          ? clamp(minutes / starts / 75, 0.55, 0.98)
          : prior.sixtyProbability;
      const observedStartProbability =
        completedGameweeks > 0 ? clamp(starts / completedGameweeks) : undefined;
      const teamFixtures = fixtureEstimates.filter(
        (fixture) =>
          fixture.homeTeam === registration.team || fixture.awayTeam === registration.team,
      );
      const sourceAgreement = mean(teamFixtures.map((fixture) => fixture.agreement)) ?? 0.4;
      const priceValue = metrics.get("price");
      const price: PriceState =
        priceValue === undefined
          ? { status: "unpublished" }
          : input.season.priceState === "official" || input.season.priceState === "partial"
            ? { status: "official", value: priceValue, observedAt: fplBatch.capturedAt }
            : { status: "unpublished" };
      const ownershipValue = metrics.get("ownership");
      const rank = ownershipRank.get(registration.registrationKey);
      const ownership: OwnershipState =
        ownershipValue === undefined
          ? { status: "unavailable" }
          : input.season.priceState === "official" && rank
            ? {
                status: "official",
                value: clamp(ownershipValue, 0, 100),
                rankWithinPosition: rank,
                observedAt: fplBatch.capturedAt,
              }
            : { status: "provisional", value: clamp(ownershipValue, 0, 100) };
      const fpl: FplPlayerState = {
        pricePressureStatus: input.fromGameweek <= 1 ? "locked" : "unavailable",
        ...(metrics.get("start_price") === undefined
          ? {}
          : { startPrice: metrics.get("start_price") }),
        ...(metrics.get("price_change_event") === undefined
          ? {}
          : { priceChangeEvent: metrics.get("price_change_event") }),
        ...(metrics.get("price_change_start") === undefined
          ? {}
          : { priceChangeStart: metrics.get("price_change_start") }),
        ...(metrics.get("transfers_in") === undefined
          ? {}
          : { transfersIn: Math.round(metrics.get("transfers_in")!) }),
        ...(metrics.get("transfers_out") === undefined
          ? {}
          : { transfersOut: Math.round(metrics.get("transfers_out")!) }),
        ...(metrics.get("transfers_in_event") === undefined
          ? {}
          : { transfersInEvent: Math.round(metrics.get("transfers_in_event")!) }),
        ...(metrics.get("transfers_out_event") === undefined
          ? {}
          : { transfersOutEvent: Math.round(metrics.get("transfers_out_event")!) }),
        ...(metrics.get("net_transfers_event") === undefined
          ? {}
          : { netTransfersEvent: Math.round(metrics.get("net_transfers_event")!) }),
        ...(metrics.get("price_change_percent_raw") === undefined
          ? {}
          : { priceChangePercentRaw: metrics.get("price_change_percent_raw") }),
        ...(metrics.get("chance_of_playing_this_round") === undefined
          ? {}
          : {
              chanceOfPlayingThisRound: clamp(metrics.get("chance_of_playing_this_round")!),
            }),
        ...(textMetrics.get("news") ? { news: textMetrics.get("news") } : {}),
        ...(textMetrics.get("news_added_at")
          ? { newsAddedAt: textMetrics.get("news_added_at") }
          : {}),
      };
      return {
        registrationKey: registration.registrationKey,
        playerKey: registration.playerKey,
        name: registration.name,
        team: registration.team,
        position: registration.position,
        registrationStatus: registration.status,
        price,
        ownership,
        fpl,
        playProbability,
        sixtyMinuteProbability: clamp(
          availability *
            (observedStartProbability === undefined
              ? preseasonRoleProbability * prior.sixtyProbability
              : observedStartProbability * empiricalSixty),
          0,
          playProbability,
        ),
        goalsPer90: prior.goalsPer90 * (1 - sampleWeight) + rawGoalsPer90 * sampleWeight,
        assistsPer90: prior.assistsPer90 * (1 - sampleWeight) + rawAssistsPer90 * sampleWeight,
        savesPer90: metrics.get("saves_per_90"),
        defensiveContributionsPer90: metrics.get("defensive_contributions_per_90"),
        cardsPer90: metrics.get("cards_per_90"),
        sourceAgreement,
      };
    });

  const inputBatches = input.batches
    .toSorted((left, right) => left.sourceKey.localeCompare(right.sourceKey))
    .map((batch) => ({
      id: batch.id,
      role: batch.sourceKey,
      capturedAt: batch.capturedAt,
      ...(batch.publishedAt ? { publishedAt: batch.publishedAt } : {}),
    }));
  const identity = JSON.stringify({
    season: input.season.key,
    rulesetKey: input.season.rulesetKey,
    rulesetStatus: input.season.rulesetStatus,
    rulesetChecksum: officialConfiguration?.snapshot.checksum,
    fromGameweek: input.fromGameweek,
    horizon: input.horizon,
    batches: inputBatches.map((batch) => batch.id),
    cutoffAt: modelCutoffAt,
    codeVersion: input.codeVersion,
  });
  const playerTrails = Object.fromEntries(
    Object.entries(input.playerTrails ?? {}).flatMap(([registrationKey, points]) => {
      const priorPoints = points.filter((point) => point.observedAt < modelCutoffAt);
      return priorPoints.length > 0 ? [[registrationKey, priorPoints]] : [];
    }),
  );
  return {
    status: "ready",
    request: {
      runId: `market-xp-v2:${input.season.key}:gw${input.fromGameweek}:h${input.horizon}:${shortHash(identity)}`,
      datasetKey: input.datasetKey,
      season: {
        ...input.season,
        ...(officialConfiguration ? { officialRules: officialConfiguration.snapshot } : {}),
      },
      fromGameweek: input.fromGameweek,
      horizon: input.horizon,
      modelKey: "market-xp",
      modelVersion: "2.0.0",
      codeVersion: input.codeVersion,
      inputBatches,
      cutoffAt: modelCutoffAt,
      sourceHealth: sourceHealth(
        input,
        fixtureEstimates,
        observedPlayers,
        historicalByPlayer.size,
        modelCutoffAt,
      ),
      ...(Object.keys(playerTrails).length > 0 ? { playerTrails } : {}),
      fixtures: fixtureEstimates.map(({ agreement: _agreement, ...fixture }) => fixture),
      players,
      ...(officialConfiguration ? { ruleset: officialConfiguration.ruleset } : {}),
    },
  };
}
