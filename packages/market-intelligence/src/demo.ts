import type {
  Annotation,
  CaptureBatch,
  Fixture,
  Forecast,
  ForecastComponents,
  ForecastRecipe,
  ForecastSignal,
  Source,
} from "./contracts.ts";
import { createMarketIntelligence } from "./market-intelligence.ts";
import { createMemoryStore } from "./memory-store.ts";

export const demoRoomQuery = {
  competition: "EPL",
  season: "2025/26",
  gameweek: 34,
} as const;

const deadlineAt = "2026-04-24T17:30:00.000Z";
const observedTimes = [
  "2026-04-22T17:30:00.000Z",
  "2026-04-23T05:30:00.000Z",
  "2026-04-23T17:30:00.000Z",
  "2026-04-24T05:30:00.000Z",
  "2026-04-24T11:30:00.000Z",
  "2026-04-24T15:30:00.000Z",
  "2026-04-24T16:45:00.000Z",
  "2026-04-24T17:25:00.000Z",
] as const;

const fixtures: Fixture[] = [
  {
    key: "epl:2025:34:ars-liv",
    ...demoRoomQuery,
    homeTeam: "ARS",
    awayTeam: "LIV",
    kickoffAt: "2026-04-25T16:30:00.000Z",
    deadlineAt,
  },
  {
    key: "epl:2025:34:mci-che",
    ...demoRoomQuery,
    homeTeam: "MCI",
    awayTeam: "CHE",
    kickoffAt: "2026-04-26T14:00:00.000Z",
    deadlineAt,
  },
  {
    key: "epl:2025:34:new-tot",
    ...demoRoomQuery,
    homeTeam: "NEW",
    awayTeam: "TOT",
    kickoffAt: "2026-04-26T16:30:00.000Z",
    deadlineAt,
  },
];

const sourceDefinitions: Source[] = [
  { key: "fpl", label: "FPL", kind: "fpl", metadata: { captureMethod: "json" } },
  {
    key: "odds-api",
    label: "Bookmaker consensus",
    kind: "aggregator",
    metadata: { captureMethod: "api", books: 14 },
  },
  {
    key: "smarkets",
    label: "Smarkets",
    kind: "exchange",
    metadata: { captureMethod: "browser-network" },
  },
  {
    key: "polymarket",
    label: "Polymarket",
    kind: "prediction-market",
    metadata: { captureMethod: "clob-api" },
  },
];

const playerDefinitions = [
  {
    playerKey: "player:saka",
    playerName: "Bukayo Saka",
    teamKey: "ARS",
    position: "MID" as const,
    values: [6.4, 6.5, 6.8, 7, 7.6, 7.9, 8.3, 8.1],
    ratios: [0.49, 0.27, 0.12, 0.12],
  },
  {
    playerKey: "player:haaland",
    playerName: "Erling Haaland",
    teamKey: "MCI",
    position: "FWD" as const,
    values: [7.4, 7.3, 7.5, 7.2, 7.1, 7.4, 7.7, 7.9],
    ratios: [0.68, 0.1, 0, 0.22],
  },
  {
    playerKey: "player:salah",
    playerName: "Mohamed Salah",
    teamKey: "LIV",
    position: "MID" as const,
    values: [7, 7.1, 7, 7.2, 7.3, 7.1, 7, 7],
    ratios: [0.55, 0.22, 0.08, 0.15],
  },
  {
    playerKey: "player:gordon",
    playerName: "Anthony Gordon",
    teamKey: "NEW",
    position: "MID" as const,
    values: [5.4, 5.5, 5.7, 5.9, 6.1, 6.3, 6.5, 6.6],
    ratios: [0.43, 0.31, 0.1, 0.16],
  },
  {
    playerKey: "player:palmer",
    playerName: "Cole Palmer",
    teamKey: "CHE",
    position: "MID" as const,
    values: [6.9, 6.8, 6.6, 6.3, 6, 5.8, 5.6, 5.5],
    ratios: [0.52, 0.28, 0.06, 0.14],
  },
];

const replayHeadlines = [
  "Opening consensus",
  "Liverpool total firms",
  "City attack drifts",
  "Palmer minutes questioned",
  "Arsenal team total climbs",
  "Saka scorer market shortens",
  "Press conference confirms role",
  "Deadline consensus locked",
] as const;

const replayDetails = [
  "The first cross-source snapshot establishes the baseline.",
  "Liverpool's goal expectation rises without changing the player order.",
  "Exchange prices soften for the City attack and tighten the top four.",
  "Availability uncertainty pulls Palmer below the market consensus.",
  "Bookmakers move Arsenal's team total and Saka gains across goal and bonus components.",
  "The player market confirms the team move and raises Saka's explosive tail.",
  "The minutes prior firms after the press conference, narrowing uncertainty.",
  "The final pre-deadline snapshot freezes the evidence used by the recommendation.",
] as const;

const annotationsByPoint: Partial<Record<number, Annotation[]>> = {
  2: [
    {
      key: "demo:annotation:city-drift",
      observedAt: observedTimes[2],
      sourceKey: "smarkets",
      category: "market-move",
      title: "City attack price eases",
      detail: "Back prices lengthen across the main exchange while the spread remains stable.",
      impact: -0.3,
      fixtureKey: fixtures[1]?.key,
      playerKey: "player:haaland",
    },
  ],
  3: [
    {
      key: "demo:annotation:palmer-flag",
      observedAt: observedTimes[3],
      sourceKey: "fpl",
      category: "availability",
      title: "Palmer availability drops",
      detail: "The minutes prior falls after a new availability flag appears in FPL.",
      impact: -0.6,
      fixtureKey: fixtures[1]?.key,
      playerKey: "player:palmer",
    },
  ],
  4: [
    {
      key: "demo:annotation:arsenal-total",
      observedAt: observedTimes[4],
      sourceKey: "odds-api",
      category: "market-move",
      title: "Arsenal team total rises",
      detail: "The multi-book consensus moves by six probability points in ninety minutes.",
      impact: 0.6,
      fixtureKey: fixtures[0]?.key,
      playerKey: "player:saka",
    },
  ],
  5: [
    {
      key: "demo:annotation:saka-scorer",
      observedAt: observedTimes[5],
      sourceKey: "smarkets",
      category: "market-move",
      title: "Saka scorer price shortens",
      detail: "The player market corroborates the team-total move rather than merely following it.",
      impact: 0.3,
      fixtureKey: fixtures[0]?.key,
      playerKey: "player:saka",
    },
  ],
  6: [
    {
      key: "demo:annotation:press-conference",
      observedAt: observedTimes[6],
      sourceKey: "fpl",
      category: "team-news",
      title: "Role and minutes firm",
      detail: "The final press conference removes the main start-risk branch from the forecast.",
      impact: 0.4,
      fixtureKey: fixtures[0]?.key,
      playerKey: "player:saka",
    },
  ],
};

function componentsFor(expectedPoints: number, ratios: number[]): ForecastComponents {
  const appearance = 1.8;
  const remainder = Math.max(0, expectedPoints - appearance);
  const [goals = 0, assists = 0, cleanSheet = 0, bonus = 0] = ratios.map((ratio) =>
    Number((remainder * ratio).toFixed(2)),
  );
  return { appearance, goals, assists, cleanSheet, bonus };
}

function signalDirection(movement: number): ForecastSignal["direction"] {
  if (Math.abs(movement) < 0.01) return "flat";
  return movement > 0 ? "up" : "down";
}

function signalsFor(player: (typeof playerDefinitions)[number], index: number): ForecastSignal[] {
  const expectedPoints = player.values[index] ?? 0;
  const previousPoints = player.values[Math.max(0, index - 1)] ?? expectedPoints;
  const playerIndex = playerDefinitions.findIndex(
    (candidate) => candidate.playerKey === player.playerKey,
  );
  const availability =
    player.playerKey === "player:palmer"
      ? Math.max(58, 98 - index * 5.5)
      : Math.min(99, 88 + expectedPoints * 1.25);
  const previousAvailability =
    player.playerKey === "player:palmer"
      ? Math.max(58, 98 - Math.max(0, index - 1) * 5.5)
      : Math.min(99, 88 + previousPoints * 1.25);
  const ownership = 18 + playerIndex * 4.6 + index * 0.18;
  const scorerPrice = Math.max(1.45, 6 - expectedPoints * 0.48);
  const previousScorerPrice = Math.max(1.45, 6 - previousPoints * 0.48);
  const teamGoalLine = 1.2 + expectedPoints * 0.09;
  const previousTeamGoalLine = 1.2 + previousPoints * 0.09;

  return [
    {
      key: "availability",
      sourceKey: "fpl",
      label: "Availability",
      value: `${Math.round(availability)}%`,
      movement: roundSignal(availability - previousAvailability),
      direction: signalDirection(availability - previousAvailability),
      detail: "FPL status and the current minutes prior",
    },
    {
      key: "ownership",
      sourceKey: "fpl",
      label: "Ownership",
      value: `${ownership.toFixed(1)}%`,
      movement: index === 0 ? 0 : 0.18,
      direction: index === 0 ? "flat" : "up",
      detail: "FPL selected-by percentage at capture time",
    },
    {
      key: "scorer-price",
      sourceKey: "smarkets",
      label: "Anytime scorer",
      value: scorerPrice.toFixed(2),
      movement: roundSignal(scorerPrice - previousScorerPrice),
      direction: signalDirection(previousScorerPrice - scorerPrice),
      detail: "Best executable decimal price before commission",
    },
    {
      key: "team-goal-line",
      sourceKey: "odds-api",
      label: "Team goal line",
      value: teamGoalLine.toFixed(2),
      movement: roundSignal(teamGoalLine - previousTeamGoalLine),
      direction: signalDirection(teamGoalLine - previousTeamGoalLine),
      detail: "De-vigged multi-book team goal expectation",
    },
  ];
}

function roundSignal(value: number): number {
  return Number(value.toFixed(2));
}

function recipeFor(player: (typeof playerDefinitions)[number], index: number): ForecastRecipe {
  const expectedPoints = player.values[index] ?? 0;
  const basePrice = Math.max(1.45, 6 - expectedPoints * 0.48);
  const quoteDefinitions = [
    ["smarkets", "Smarkets", basePrice],
    ["bet365", "bet365", basePrice + 0.16],
    ["polymarket", "Polymarket", Math.max(1.2, basePrice - 0.1)],
  ] as const;
  const quotes = quoteDefinitions.map(([sourceKey, label, decimalOdds]) => ({
    sourceKey,
    label,
    marketFamily: "goal",
    decimalOdds: roundSignal(decimalOdds),
    impliedProbability: roundSignal(1 / decimalOdds),
  }));
  const probabilities = quotes.map((quote) => quote.impliedProbability);
  const probability =
    probabilities.reduce((total, current) => total + current, 0) / probabilities.length;
  const low = Math.min(...probabilities);
  const high = Math.max(...probabilities);
  const availability =
    player.playerKey === "player:palmer"
      ? Math.max(0.58, 0.98 - index * 0.055)
      : Math.min(0.99, (88 + expectedPoints * 1.25) / 100);
  const sixtyMinuteProbability = availability * 0.88;

  return {
    quotes,
    consensus: [
      {
        marketFamily: "goal",
        label: "Anytime scorer",
        probability: roundSignal(probability),
        low: roundSignal(low),
        high: roundSignal(high),
        spread: roundSignal(high - low),
        quoteCount: quotes.length,
        adjustmentMethod: "exchange midpoint and bookmaker implied mean",
      },
    ],
    minutes: {
      playProbability: roundSignal(availability),
      sixtyMinuteProbability: roundSignal(sixtyMinuteProbability),
      expectedMinutes: roundSignal(availability * 30 + sixtyMinuteProbability * 45),
    },
    rates: {
      goal: roundSignal((componentsFor(expectedPoints, player.ratios).goals ?? 0) / 5),
      assist: roundSignal((componentsFor(expectedPoints, player.ratios).assists ?? 0) / 3),
      cleanSheet: roundSignal(0.24 + expectedPoints * 0.018),
    },
  };
}

function forecastsAt(index: number): Forecast[] {
  const ranks = new Map(
    playerDefinitions
      .map((player) => ({ playerKey: player.playerKey, value: player.values[index] ?? 0 }))
      .toSorted((a, b) => b.value - a.value)
      .map((player, rank) => [player.playerKey, rank + 1]),
  );

  return playerDefinitions.map((player) => {
    const expectedPoints = player.values[index] ?? 0;
    return {
      modelKey: "market-room-v1",
      playerKey: player.playerKey,
      playerName: player.playerName,
      teamKey: player.teamKey,
      position: player.position,
      ...demoRoomQuery,
      observedAt: observedTimes[index] ?? observedTimes[0],
      deadlineAt,
      expectedPoints,
      p10: Number(Math.max(1, expectedPoints * 0.28).toFixed(1)),
      p50: Number(Math.max(0, expectedPoints - 0.7).toFixed(1)),
      p90: Number((expectedPoints + 5.2).toFixed(1)),
      rank: ranks.get(player.playerKey) ?? playerDefinitions.length,
      components: componentsFor(expectedPoints, player.ratios),
      evidence: {
        headline: replayHeadlines[index] ?? replayHeadlines[0],
        detail: replayDetails[index] ?? replayDetails[0],
        sourceKeys: sourceDefinitions.map((source) => source.key),
        confidence: Number((0.61 + index * 0.035).toFixed(2)),
        signals: signalsFor(player, index),
        recipe: recipeFor(player, index),
      },
    };
  });
}

function sourceBatch(source: Source, observedAt: string, index: number): CaptureBatch {
  const baseValue = 1.42 + index * 0.035;
  return {
    id: `demo:${source.key}:${observedAt}`,
    source,
    capturedAt: observedAt,
    fixtures,
    rawSnapshots: [
      {
        key: `demo:raw:${source.key}:${observedAt}`,
        endpoint: `demo://${source.key}/epl/gw34`,
        observedAt,
        payload: { replay: true, source: source.key, point: index },
        statusCode: 200,
      },
    ],
    observations: [
      {
        key: `demo:observation:${source.key}:${observedAt}`,
        fixtureKey: fixtures[0]?.key,
        entityKey: "team:ars",
        metric: source.key === "fpl" ? "ownership_index" : "team_goal_expectation",
        observedAt,
        numericValue: Number((baseValue + sourceDefinitions.indexOf(source) * 0.025).toFixed(3)),
        unit: source.key === "fpl" ? "index" : "goals",
        metadata: { replay: true },
      },
    ],
    forecasts: [],
    annotations: [],
  };
}

export function createDemoBatches(): CaptureBatch[] {
  return observedTimes.flatMap((observedAt, index) => [
    ...sourceDefinitions.map((source) => sourceBatch(source, observedAt, index)),
    {
      id: `demo:model:${observedAt}`,
      source: { key: "market-room-v1", label: "Room model", kind: "model" },
      capturedAt: observedAt,
      fixtures,
      rawSnapshots: [],
      observations: [],
      forecasts: forecastsAt(index),
      annotations: annotationsByPoint[index] ?? [],
    },
  ]);
}

export async function createDemoDeadlineRoom() {
  const intelligence = createMarketIntelligence({ store: createMemoryStore({ mode: "demo" }) });
  for (const batch of createDemoBatches()) await intelligence.ingest(batch);
  return intelligence.getDeadlineRoom(demoRoomQuery);
}
