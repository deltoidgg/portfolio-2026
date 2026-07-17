import { describe, expect, test } from "vite-plus/test";
import {
  createMarketXpForecastRunner,
  defaultFplRuleset,
  scoreFplFixture,
  type ForecastRunRequest,
} from "market-intelligence";

const request: ForecastRunRequest = {
  runId: "run:2026-27:gw1-3:test",
  datasetKey: "live",
  season: {
    key: "epl:2026-27",
    label: "2026/27",
    lifecycle: "prelaunch",
    priceState: "unpublished",
    rulesetKey: "fpl:2026-27:provisional-v1",
    rulesetStatus: "provisional",
  },
  fromGameweek: 1,
  horizon: 3,
  cutoffAt: "2026-08-20T12:00:00.000Z",
  modelKey: "market-xp",
  modelVersion: "2.0.0",
  codeVersion: "test-sha",
  inputBatches: [
    { id: "fpl:1", role: "player-priors", capturedAt: "2026-08-20T10:00:00.000Z" },
    { id: "odds:1", role: "fixture-market", capturedAt: "2026-08-20T11:00:00.000Z" },
  ],
  fixtures: [
    {
      key: "fixture:ars-liv",
      gameweek: 1,
      homeTeam: "ARS",
      awayTeam: "LIV",
      homeGoalRate: 1.8,
      awayGoalRate: 1.2,
      kickoffAt: "2026-08-22T16:30:00.000Z",
      marketCoverage: 1,
    },
    {
      key: "fixture:ars-che",
      gameweek: 3,
      homeTeam: "ARS",
      awayTeam: "CHE",
      homeGoalRate: 1.6,
      awayGoalRate: 1,
      kickoffAt: "2026-09-05T14:00:00.000Z",
      marketCoverage: 0.75,
    },
    {
      key: "fixture:bou-ars",
      gameweek: 3,
      homeTeam: "BOU",
      awayTeam: "ARS",
      homeGoalRate: 0.9,
      awayGoalRate: 1.7,
      kickoffAt: "2026-09-09T19:45:00.000Z",
      marketCoverage: 0.6,
    },
  ],
  players: [
    {
      registrationKey: "registration:saka",
      playerKey: "person:saka",
      name: "Bukayo Saka",
      team: "ARS",
      position: "MID",
      registrationStatus: "active",
      price: { status: "unpublished" },
      ownership: { status: "unavailable" },
      playProbability: 0.96,
      sixtyMinuteProbability: 0.88,
      goalsPer90: 0.42,
      assistsPer90: 0.31,
      sourceAgreement: 0.8,
    },
  ],
};

describe("market-xp-v2 forecast runner", () => {
  test("scores a complete FPL event through a season ruleset", () => {
    expect(
      scoreFplFixture(defaultFplRuleset, {
        position: "MID",
        minutes: 80,
        goals: 1,
        assists: 1,
        cleanSheet: true,
        bonus: 2,
        defensiveContributions: 12,
        yellowCards: 1,
      }),
    ).toBe(14);
  });

  test("emits blank and double gameweeks from exact team fixtures with required provenance", () => {
    const runner = createMarketXpForecastRunner();
    const snapshot = runner.run(request);
    const player = snapshot.players[0]!;

    expect(player.gameweeks.map((gameweek) => gameweek.fixtures.length)).toEqual([1, 0, 2]);
    expect(player.gameweeks[1]).toMatchObject({ gameweek: 2, expectedPoints: 0, p90: 0 });
    expect(player.gameweeks[2]!.expectedPoints).toBeGreaterThan(
      player.gameweeks[0]!.expectedPoints,
    );
    expect(player.provenance).toEqual({
      seasonKey: "epl:2026-27",
      rulesetKey: "fpl:2026-27:provisional-v1",
      rulesetStatus: "provisional",
      modelKey: "market-xp",
      modelVersion: "2.0.0",
      cutoffAt: "2026-08-20T12:00:00.000Z",
      codeVersion: "test-sha",
      inputBatchIds: ["fpl:1", "odds:1"],
    });
    expect(player.haulProbability).toBeGreaterThan(0);

    const artifact = runner.runArtifact(request);
    expect(artifact.fixtureForecasts).toHaveLength(3);
    expect(
      artifact.fixtureForecasts[0]!.distribution.reduce(
        (total, [, probability]) => total + probability,
        0,
      ),
    ).toBeCloseTo(1, 8);
    expect(artifact.fixtureForecasts[0]).toEqual(
      expect.objectContaining({
        runId: request.runId,
        registrationKey: "registration:saka",
        fixtureKey: "fixture:ars-liv",
      }),
    );
  });

  test("rejects evidence captured after the point-in-time cutoff", () => {
    expect(() =>
      createMarketXpForecastRunner().run({
        ...request,
        inputBatches: [
          ...request.inputBatches,
          {
            id: "late-team-news",
            role: "availability",
            capturedAt: "2026-08-20T12:01:00.000Z",
          },
        ],
      }),
    ).toThrow(/after cutoff/);
  });

  test("retains bounded pre-deadline trails for snapshot replay", () => {
    const snapshot = createMarketXpForecastRunner().run({
      ...request,
      playerTrails: {
        "registration:saka": [
          { observedAt: "2026-08-20T08:00:00.000Z", expectedPoints: 18.2 },
          { observedAt: "2026-08-20T10:00:00.000Z", expectedPoints: 19.1 },
        ],
      },
    });
    expect(snapshot.players[0]?.trail).toEqual([
      { observedAt: "2026-08-20T08:00:00.000Z", expectedPoints: 18.2 },
      { observedAt: "2026-08-20T10:00:00.000Z", expectedPoints: 19.1 },
      { observedAt: request.cutoffAt, expectedPoints: expect.any(Number) },
    ]);
  });
});
