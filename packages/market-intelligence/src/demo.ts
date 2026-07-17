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
import { opportunitySnapshotSchema, type OpportunitySnapshot } from "./opportunity-map.ts";

export const demoRoomQuery = {
  competition: "EPL",
  season: "2025/26",
  gameweek: 34,
  datasetKey: "demo-2025-26-gw34-v1",
} as const;

export const demoOpportunityQuery = {
  datasetKey: "prelaunch-2026-27-v1",
  seasonKey: "epl:2026-27",
  fromGameweek: 1,
  horizon: 3,
} as const;

const opportunityPlayers = [
  ["David Raya", "ARS", "GKP", 14.2, 5.5, 26, 0.29, 0.9],
  ["Jordan Pickford", "EVE", "GKP", 12.8, 5, 18, 0.23, 0.88],
  ["Alisson", "LIV", "GKP", 12.1, 5.5, 12, 0.21, 0.86],
  ["Dean Henderson", "CRY", "GKP", 11.7, 4.5, 8, 0.19, 0.83],
  ["William Saliba", "ARS", "DEF", 16.8, 6, 31, 0.34, 0.93],
  ["Virgil van Dijk", "LIV", "DEF", 16.1, 6.5, 25, 0.33, 0.91],
  ["Joško Gvardiol", "MCI", "DEF", 15.4, 6, 21, 0.31, 0.84],
  ["Daniel Muñoz", "CRY", "DEF", 15.1, 5.5, 11, 0.36, 0.79],
  ["Micky van de Ven", "TOT", "DEF", 12.7, 5, 7, 0.24, 0.75],
  ["Ezri Konsa", "AVL", "DEF", 11.9, 5, 9, 0.2, 0.8],
  ["Leif Davis", "IPS", "DEF", 11.6, 4.5, 3, 0.25, 0.68],
  ["Bukayo Saka", "ARS", "MID", 22.4, 10, 38, 0.49, 0.94],
  ["Mohamed Salah", "LIV", "MID", 21.8, 13.5, 44, 0.51, 0.92],
  ["Cole Palmer", "CHE", "MID", 20.1, 10.5, 36, 0.46, 0.87],
  ["Bruno Fernandes", "MUN", "MID", 18.7, 9, 19, 0.41, 0.9],
  ["Anthony Gordon", "NEW", "MID", 17.8, 7.5, 14, 0.39, 0.82],
  ["Morgan Rogers", "AVL", "MID", 16.9, 7, 22, 0.34, 0.78],
  ["Eberechi Eze", "CRY", "MID", 16.6, 7.5, 13, 0.38, 0.76],
  ["Antoine Semenyo", "BOU", "MID", 15.5, 7, 8, 0.35, 0.72],
  ["Omari Hutchinson", "IPS", "MID", 13.8, 5.5, 2, 0.28, 0.65],
  ["Erling Haaland", "MCI", "FWD", 23.1, 14, 41, 0.57, 0.91],
  ["Alexander Isak", "NEW", "FWD", 21.2, 11, 32, 0.54, 0.88],
  ["Ollie Watkins", "AVL", "FWD", 18.4, 9, 24, 0.43, 0.85],
  ["Jean-Philippe Mateta", "CRY", "FWD", 16.7, 7.5, 12, 0.4, 0.79],
  ["Dominic Solanke", "TOT", "FWD", 15.9, 8, 15, 0.37, 0.74],
  ["Liam Delap", "IPS", "FWD", 14.8, 6.5, 6, 0.36, 0.69],
  ["Yoane Wissa", "BRE", "FWD", 14.5, 7, 9, 0.34, 0.73],
  ["Viktor Gyökeres", "ARS", "FWD", 19.6, 10.5, 29, 0.5, 0.62],
] as const;

export function createDemoOpportunitySnapshot(): OpportunitySnapshot {
  const observedAt = "2026-07-17T12:00:00.000Z";
  const positionRanks = new Map<string, number>();
  return opportunitySnapshotSchema.parse({
    key: "prelaunch-2026-27-v1:gw1:h3",
    datasetKey: demoOpportunityQuery.datasetKey,
    season: {
      key: demoOpportunityQuery.seasonKey,
      label: "2026/27",
      lifecycle: "prelaunch",
      priceState: "unpublished",
      rulesetKey: "fpl:2026-27:provisional-v1",
      rulesetStatus: "provisional",
    },
    observedAt,
    fromGameweek: 1,
    horizon: 3,
    sourceHealth: [
      {
        sourceKey: "premier-league-schedule",
        label: "Premier League fixtures",
        status: "fresh",
        lastCapturedAt: observedAt,
        coverage: 1,
        detail: "All 380 fixtures imported; kick-off times remain subject to change.",
      },
      {
        sourceKey: "fpl",
        label: "FPL 2026/27",
        status: "missing",
        coverage: 0,
        detail: "The new-season player list, prices, and ownership are not published yet.",
      },
      {
        sourceKey: "odds-api",
        label: "Market priors",
        status: "partial",
        lastCapturedAt: observedAt,
        coverage: 0.38,
        detail: "Early match prices are blended with prior-season player rates.",
      },
    ],
    players: opportunityPlayers
      .map(([name, team, position, expectedPoints, price, ownership, haul, agreement]) => ({
        name,
        team,
        position,
        expectedPoints,
        price,
        ownership,
        haul,
        agreement,
      }))
      .toSorted((left, right) => {
        const position = left.position.localeCompare(right.position);
        return position === 0 ? right.expectedPoints - left.expectedPoints : position;
      })
      .map((player, index) => {
        const rank = (positionRanks.get(player.position) ?? 0) + 1;
        positionRanks.set(player.position, rank);
        const slug = player.name
          .normalize("NFKD")
          .toLocaleLowerCase()
          .replaceAll(/[^a-z0-9]+/g, "-")
          .replaceAll(/^-|-$/g, "");
        return {
          registrationKey: `epl:2026-27:registration:scenario-${slug}`,
          playerKey: `epl:person:scenario:${slug}`,
          name: player.name,
          team: player.team,
          position: player.position,
          registrationStatus: "provisional",
          price: {
            status: "estimated",
            low: player.price - 0.5,
            midpoint: player.price,
            high: player.price + 0.5,
            method: "prior price, role, and promoted-club band",
          },
          ownership: { status: "provisional", value: player.ownership },
          expectedPoints: player.expectedPoints,
          p10: Math.max(2, Math.round(player.expectedPoints * 0.42)),
          p50: Math.round(player.expectedPoints * 0.91),
          p90: Math.round(player.expectedPoints * 1.68),
          haulProbability: player.haul,
          sixtyMinuteProbability: Math.max(0.58, 0.94 - (index % 7) * 0.035),
          marketCoverage: Math.min(0.74, 0.32 + (index % 6) * 0.07),
          sourceAgreement: player.agreement,
          forecastRankWithinPosition: rank,
          gameweeks: [1, 2, 3].map((gameweek, gameweekIndex) => {
            const expected = Number(
              ((player.expectedPoints / 3) * [1.06, 0.88, 1.06][gameweekIndex]!).toFixed(2),
            );
            return {
              gameweek,
              expectedPoints: expected,
              p10: Math.max(0, Math.floor(expected * 0.25)),
              p50: Math.round(expected * 0.88),
              p90: Math.ceil(expected * 1.85),
              fixtures: [`epl:2026-27:scenario:gw${gameweek}:${player.team.toLocaleLowerCase()}`],
            };
          }),
          trail: [
            {
              observedAt: "2026-06-19T10:00:00.000Z",
              expectedPoints: Number((player.expectedPoints * 0.92).toFixed(2)),
              price: player.price,
            },
            {
              observedAt: "2026-07-07T12:00:00.000Z",
              expectedPoints: Number((player.expectedPoints * 0.97).toFixed(2)),
              price: player.price,
            },
            { observedAt, expectedPoints: player.expectedPoints, price: player.price },
          ],
          provenance: {
            seasonKey: demoOpportunityQuery.seasonKey,
            rulesetKey: "fpl:2026-27:provisional-v1",
            rulesetStatus: "provisional",
            modelKey: "market-xp",
            modelVersion: "2.0.0-prelaunch",
            cutoffAt: observedAt,
            codeVersion: "prelaunch-scenario-v1",
            inputBatchIds: ["official-fixtures:2026-06-19", "prior-season:2025-26"],
          },
        };
      }),
  });
}

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
    metadata: { datasetKey: demoRoomQuery.datasetKey, synthetic: true },
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
      metadata: { datasetKey: demoRoomQuery.datasetKey, synthetic: true },
    },
  ]);
}

export async function createDemoDeadlineRoom() {
  const intelligence = createMarketIntelligence({ store: createMemoryStore({ mode: "demo" }) });
  for (const batch of createDemoBatches()) await intelligence.ingest(batch);
  return intelligence.getDeadlineRoom(demoRoomQuery);
}
