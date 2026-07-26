import { describe, expect, test } from "vite-plus/test";
import {
  createMarketXpForecastRunner,
  prepareAutomatedForecast,
  type AutomatedForecastInput,
} from "market-intelligence";

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
      {
        id: "fpl:1",
        sourceKey: "fpl",
        capturedAt: cutoffAt,
        metadata: {
          rulesetChecksum: "official-checksum",
          gameConfig: {
            rules: {
              squad_squadplay: 11,
              squad_squadsize: 15,
              squad_team_limit: 3,
              squad_total_spend: 1000,
              ui_currency_multiplier: 10,
            },
            scoring: {
              long_play: 2,
              short_play: 1,
              goals_conceded: { GKP: -1, DEF: -1, MID: 0, FWD: 0 },
              goals_scored: { GKP: 10, DEF: 6, MID: 5, FWD: 4 },
              assists: 3,
              clean_sheets: { GKP: 4, DEF: 4, MID: 1, FWD: 0 },
              penalties_saved: 5,
              penalties_missed: -2,
              yellow_cards: -1,
              red_cards: -3,
              own_goals: -2,
              defensive_contribution: { GKP: 0, DEF: 2, MID: 2, FWD: 2 },
            },
          },
          elementTypes: [
            {
              plural_name_short: "GKP",
              squad_select: 2,
              squad_min_play: 1,
              squad_max_play: 1,
            },
            {
              plural_name_short: "DEF",
              squad_select: 5,
              squad_min_play: 3,
              squad_max_play: 5,
            },
            {
              plural_name_short: "MID",
              squad_select: 5,
              squad_min_play: 2,
              squad_max_play: 5,
            },
            {
              plural_name_short: "FWD",
              squad_select: 3,
              squad_min_play: 1,
              squad_max_play: 3,
            },
          ],
        },
      },
      { id: "fpl-history:1", sourceKey: "fpl-element-summary", capturedAt: cutoffAt },
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
        ["historical_minutes", 2_700],
        ["historical_expected_goals", 9],
        ["historical_expected_assists", 7],
      ].map(([metric, numericValue]) => ({
        batchId: "fpl-history:1",
        sourceKey: "fpl-element-summary",
        entityKey: "epl:person:opta:p223340",
        metric: String(metric),
        observedAt: cutoffAt,
        numericValue: Number(numericValue),
        metadata: { sourceSeason: "2024/25" },
      })),
      ...[
        ["historical_minutes", 2_850],
        ["historical_expected_goals", 13.4],
        ["historical_expected_assists", 9.2],
      ].map(([metric, numericValue]) => ({
        batchId: "fpl-history:1",
        sourceKey: "fpl-element-summary",
        entityKey: "epl:person:opta:p223340",
        metric: String(metric),
        observedAt: cutoffAt,
        numericValue: Number(numericValue),
        metadata: { sourceSeason: "2025/26" },
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
      "fpl-history:1",
      "odds:1",
      "schedule:1",
    ]);
    expect(first.request.season.officialRules).toMatchObject({
      source: "fpl-game-config",
      checksum: "official-checksum",
      budget: 100,
      squadSize: 15,
      startingSize: 11,
      clubLimit: 3,
    });
    expect(first.request.ruleset).toMatchObject({
      key: "fpl:2026-27:official-v1",
      goal: { GKP: 10, DEF: 6, MID: 5, FWD: 4 },
      penaltySave: 5,
    });
    expect(first.request.fixtures[0]).toEqual(
      expect.objectContaining({ marketCoverage: 1, homeGoalRate: expect.any(Number) }),
    );
    expect(first.request.players[0]).toEqual(
      expect.objectContaining({
        goalsPer90: expect.closeTo(0.349, 2),
        assistsPer90: expect.closeTo(0.251, 2),
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
        expect.objectContaining({
          sourceKey: "fpl-element-summary",
          coverage: 0.5,
          status: "partial",
        }),
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

  test("creates a new immutable run when the season ruleset changes", () => {
    const official = prepareAutomatedForecast(input());
    const provisionalInput = input();
    provisionalInput.season.rulesetKey = "fpl:2026-27:provisional-v1";
    provisionalInput.season.rulesetStatus = "provisional";
    const provisional = prepareAutomatedForecast(provisionalInput);
    expect(official.status).toBe("ready");
    expect(provisional.status).toBe("ready");
    if (official.status !== "ready" || provisional.status !== "ready") return;
    expect(official.request.runId).not.toBe(provisional.request.runId);
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

  test("uses the latest provider publication as the point-in-time cutoff", () => {
    const publication = input();
    publication.batches = publication.batches.map((batch) =>
      batch.sourceKey === "odds-api"
        ? { ...batch, publishedAt: "2026-08-14T10:00:00.250Z" }
        : batch,
    );
    const prepared = prepareAutomatedForecast(publication);
    expect(prepared.status).toBe("ready");
    if (prepared.status !== "ready") throw new Error(prepared.reason);
    expect(prepared.request.cutoffAt).toBe("2026-08-14T10:00:00.250Z");
    expect(() => createMarketXpForecastRunner().run(prepared.request)).not.toThrow();
  });
});
