import { describe, expect, test } from "vite-plus/test";
import {
  captureDeadlineIntelligence,
  createLiveBaselineForecastBatch,
  createMemoryStore,
  type CaptureBatch,
} from "market-intelligence";

const capturedAt = "2026-08-14T16:30:00.000Z";
const fixture = {
  key: "epl:2026-27:gw1:ars-liv",
  competition: "EPL",
  season: "2026/27",
  gameweek: 1,
  homeTeam: "ARS",
  awayTeam: "LIV",
  kickoffAt: "2026-08-15T16:30:00.000Z",
  deadlineAt: "2026-08-14T17:30:00.000Z",
};
const playerMetadata = { playerName: "Saka", teamKey: "ARS", position: "MID" };

const fplBatch: CaptureBatch = {
  id: `fpl:2026/27:1:${capturedAt}`,
  source: { key: "fpl", label: "Fantasy Premier League", kind: "fpl" },
  capturedAt,
  fixtures: [fixture],
  rawSnapshots: [],
  observations: [
    ["availability_probability", 1],
    ["ownership", 42.5],
    ["price", 10.5],
    ["minutes", 2_850],
    ["starts", 34],
    ["expected_goals", 12],
    ["expected_assists", 10],
  ].map(([metric, numericValue]) => ({
    key: `saka:${metric}:${capturedAt}`,
    entityKey: "epl:player:7",
    metric: String(metric),
    observedAt: capturedAt,
    numericValue: Number(numericValue),
    metadata: playerMetadata,
  })),
  forecasts: [],
  annotations: [],
  entities: [
    { key: "ARS", type: "team", name: "Arsenal" },
    { key: "epl:player:7", type: "player", name: "Saka", teamKey: "ARS" },
  ],
};

const oddsBatch: CaptureBatch = {
  id: `odds-api:2026/27:1:${capturedAt}`,
  source: { key: "odds-api", label: "The Odds API", kind: "aggregator" },
  capturedAt,
  fixtures: [fixture],
  rawSnapshots: [],
  observations: [
    ...[
      ["Arsenal", 1.9],
      ["Draw", 3.5],
      ["Liverpool", 4.2],
    ].map(([outcome, numericValue]) => ({
      key: `h2h:smarkets:${outcome}`,
      fixtureKey: fixture.key,
      entityKey: `market:smarkets:${outcome}`,
      metric: "decimal_odds",
      observedAt: capturedAt,
      numericValue: Number(numericValue),
      marketFamily: "h2h",
      outcome: String(outcome),
      metadata: { bookmakerKey: "smarkets", bookmakerName: "Smarkets" },
    })),
    {
      key: "saka:goal:smarkets",
      fixtureKey: fixture.key,
      entityKey: "market:smarkets:saka",
      metric: "decimal_odds",
      observedAt: capturedAt,
      numericValue: 2.5,
      marketFamily: "player_goal_scorer_anytime",
      outcome: "Saka",
      metadata: { bookmakerKey: "smarkets", bookmakerName: "Smarkets" },
    },
    {
      key: "saka:goal:bet365",
      fixtureKey: fixture.key,
      entityKey: "market:bet365:saka",
      metric: "decimal_odds",
      observedAt: capturedAt,
      numericValue: 2.8,
      marketFamily: "player_goal_scorer_anytime",
      outcome: "Yes",
      metadata: {
        bookmakerKey: "bet365",
        bookmakerName: "bet365",
        description: "Bukayo Saka",
      },
    },
    {
      key: "saka:no-goal:bet365",
      fixtureKey: fixture.key,
      entityKey: "market:bet365:saka:no",
      metric: "decimal_odds",
      observedAt: capturedAt,
      numericValue: 1.5,
      marketFamily: "player_goal_scorer_anytime",
      outcome: "No",
      metadata: {
        bookmakerKey: "bet365",
        bookmakerName: "bet365",
        description: "Bukayo Saka",
      },
    },
  ],
  forecasts: [],
  annotations: [],
};

describe("live deadline pipeline", () => {
  test("turns captured FPL and bookmaker observations directly into an explainable room", async () => {
    const modelBatch = createLiveBaselineForecastBatch({ fplBatch, oddsBatch });
    const forecast = modelBatch.forecasts[0];

    expect(modelBatch.metadata).toMatchObject({
      inputBatchIds: [fplBatch.id, oddsBatch.id],
      pipeline: "live-fpl-odds-baseline-v1",
    });
    expect(forecast?.evidence.recipe?.quotes).toHaveLength(3);
    expect(
      forecast?.evidence.recipe?.consensus.find((market) => market.marketFamily === "goal"),
    ).toMatchObject({ quoteCount: 2, adjustmentMethod: "paired-outcome de-vig, then mean" });
    expect(
      forecast?.evidence.recipe?.consensus.find((market) => market.marketFamily === "goal")?.spread,
    ).toBeGreaterThan(0);
    expect(modelBatch.entityAliases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceKey: "odds-api",
          sourceEntityKey: "player-name:Bukayo Saka",
          entityKey: "epl:player:7",
        }),
      ]),
    );

    const run = await captureDeadlineIntelligence({
      store: createMemoryStore(),
      fplSource: { key: "fpl", capture: async () => fplBatch },
      oddsSource: { key: "odds-api", capture: async () => oddsBatch },
      query: { competition: "EPL", season: "2026/27", gameweek: 1 },
      capturedAt,
    });

    expect(run.receipts.model.forecasts).toBe(1);
    expect(run.room.players[0]?.playerName).toBe("Saka");
    expect(run.room.players[0]?.series[0]?.evidence.recipe?.quotes).toHaveLength(3);
  });
});
