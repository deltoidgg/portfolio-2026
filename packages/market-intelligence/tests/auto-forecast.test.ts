import { describe, expect, test } from "vite-plus/test";
import { prepareAutomatedForecast, type AutomatedForecastInput } from "market-intelligence";

function input(): AutomatedForecastInput {
  const cutoffAt = "2026-08-14T10:00:00.000Z";
  return {
    datasetKey: "live",
    season: {
      key: "epl:2026-27",
      label: "2026/27",
      lifecycle: "prelaunch",
      priceState: "official",
      rulesetKey: "fpl:2026-27:official-v1",
      rulesetStatus: "official",
    },
    fromGameweek: 1,
    horizon: 3,
    cutoffAt,
    codeVersion: "test-sha",
    batches: [
      { id: "schedule:1", sourceKey: "premier-league-schedule", capturedAt: cutoffAt },
      { id: "fpl:1", sourceKey: "fpl", capturedAt: cutoffAt },
      { id: "odds:1", sourceKey: "odds-api", capturedAt: cutoffAt },
    ],
    fixtures: [
      {
        key: "epl:2026-27:fixture:ars-liv",
        gameweek: 1,
        homeTeam: "ARS",
        awayTeam: "LIV",
        kickoffAt: "2026-08-15T15:00:00.000Z",
      },
    ],
    registrations: [
      {
        registrationKey: "epl:2026-27:registration:fpl-7",
        playerKey: "epl:person:opta:p223340",
        name: "Bukayo Saka",
        team: "ARS",
        position: "MID",
        status: "active",
      },
      {
        registrationKey: "epl:2026-27:registration:fpl-8",
        playerKey: "epl:person:fpl-code:8",
        name: "New player",
        team: "LIV",
        position: "FWD",
        status: "provisional",
      },
    ],
    observations: [
      ...[
        ["price", 10.5],
        ["ownership", 25],
        ["availability_probability", 1],
        ["minutes", 900],
        ["starts", 10],
        ["expected_goals_per_90", 0.42],
        ["expected_assists_per_90", 0.28],
      ].map(([metric, numericValue]) => ({
        batchId: "fpl:1",
        sourceKey: "fpl",
        entityKey: "epl:person:opta:p223340",
        metric: String(metric),
        observedAt: cutoffAt,
        numericValue: Number(numericValue),
      })),
      ...[
        ["Arsenal", 2.1, "h2h", undefined],
        ["Draw", 3.4, "h2h", undefined],
        ["Liverpool", 3.6, "h2h", undefined],
        ["Over", 1.82, "totals", 2.5],
        ["Under", 2.02, "totals", 2.5],
      ].map(([outcome, numericValue, marketFamily, point], index) => ({
        batchId: "odds:1",
        sourceKey: "odds-api",
        entityKey: `market:${index}`,
        fixtureKey: "epl:2026-27:fixture:ars-liv",
        metric: "decimal_odds",
        observedAt: cutoffAt,
        numericValue: Number(numericValue),
        marketFamily: String(marketFamily),
        outcome: String(outcome),
        metadata: { bookmakerKey: "bet365", ...(point ? { point: Number(point) } : {}) },
      })),
    ],
  };
}

describe("automated market-xP preparation", () => {
  test("turns canonical captures into deterministic, provenance-complete model inputs", () => {
    const first = prepareAutomatedForecast(input());
    const second = prepareAutomatedForecast(input());
    expect(first).toEqual(second);
    expect(first.status).toBe("ready");
    if (first.status !== "ready") throw new Error(first.reason);
    expect(first.request.runId).toMatch(/^market-xp-v2:epl:2026-27:gw1:h3:/);
    expect(first.request.inputBatches.map((batch) => batch.id)).toEqual([
      "fpl:1",
      "odds:1",
      "schedule:1",
    ]);
    expect(first.request.fixtures[0]).toEqual(
      expect.objectContaining({ marketCoverage: 1, homeGoalRate: expect.any(Number) }),
    );
    expect(first.request.players[0]).toEqual(
      expect.objectContaining({
        goalsPer90: 0.42,
        assistsPer90: 0.28,
        price: expect.objectContaining({ status: "official", value: 10.5 }),
        ownership: expect.objectContaining({ status: "official", rankWithinPosition: 1 }),
      }),
    );
    expect(first.request.players[1]).toEqual(
      expect.objectContaining({
        goalsPer90: 0.38,
        price: { status: "unpublished" },
        ownership: { status: "unavailable" },
      }),
    );
    expect(first.request.sourceHealth).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceKey: "odds-api", coverage: 1, status: "fresh" }),
        expect.objectContaining({ sourceKey: "polymarket", status: "missing" }),
      ]),
    );
  });

  test("waits for the guarded current-season FPL capture", () => {
    const missing = input();
    missing.batches = missing.batches.filter((batch) => batch.sourceKey !== "fpl");
    expect(prepareAutomatedForecast(missing)).toEqual({
      status: "skipped",
      reason: "No current-season FPL capture is available",
    });
  });

  test("reuses the same immutable run when a workflow wakes without new input batches", () => {
    const initial = prepareAutomatedForecast(input());
    expect(initial.status).toBe("ready");
    if (initial.status !== "ready") throw new Error(initial.reason);
    const laterWake = input();
    laterWake.cutoffAt = "2026-08-14T10:05:00.000Z";
    laterWake.playerTrails = {
      "epl:2026-27:registration:fpl-7": [
        { observedAt: initial.request.cutoffAt, expectedPoints: 9.8 },
      ],
    };
    const repeated = prepareAutomatedForecast(laterWake);
    expect(repeated.status).toBe("ready");
    if (repeated.status !== "ready") throw new Error(repeated.reason);
    expect(repeated.request).toEqual(initial.request);
  });

  test("makes a failed provider attempt visible without discarding the last good batch", () => {
    const failed = input();
    failed.attempts = [
      {
        sourceKey: "odds-api",
        scheduledFor: "2026-08-14T10:03:00.000Z",
        status: "failed",
        error: "provider unavailable",
      },
    ];
    const prepared = prepareAutomatedForecast(failed);
    expect(prepared.status).toBe("ready");
    if (prepared.status !== "ready") throw new Error(prepared.reason);
    expect(prepared.request.cutoffAt).toBe("2026-08-14T10:03:00.000Z");
    expect(prepared.request.sourceHealth).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceKey: "odds-api",
          status: "failed",
          coverage: 1,
          detail: "Latest attempt failed: provider unavailable",
        }),
      ]),
    );
  });
});
