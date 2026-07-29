import { describe, expect, it } from "vitest";
import {
  defaultFplRuleset,
  prepareCompactForecast,
  type ForecastInputState,
} from "../src/index.ts";

function state(): ForecastInputState {
  return {
    seasonKey: "epl:2026-27",
    season: {
      key: "epl:2026-27",
      label: "2026/27",
      lifecycle: "prelaunch",
      priceState: "official",
      rulesetKey: "fpl:2026-27:official-v1",
      rulesetStatus: "official",
    },
    ruleset: defaultFplRuleset,
    sourceHeads: [
      {
        sourceKey: "fpl",
        seasonKey: "epl:2026-27",
        scopeKey: "epl:2026-27:gw1",
        lastAttemptStatus: "succeeded",
        lastAttemptAt: "2026-08-20T10:00:00.000Z",
        lastSuccessfulCapturedAt: "2026-08-20T10:00:00.000Z",
        captureHash: "1".repeat(64),
        modelInputHash: "a".repeat(64),
        rawObjects: [
          {
            key: "raw/fpl/one.json.gz",
            sha256: "b".repeat(64),
            compressedBytes: 10,
            uncompressedBytes: 20,
          },
        ],
        stateRowCount: 1,
        healthMetadata: {},
      },
      {
        sourceKey: "odds-api",
        seasonKey: "epl:2026-27",
        scopeKey: "epl:2026-27:gw1",
        lastAttemptStatus: "succeeded",
        lastAttemptAt: "2026-08-20T10:00:00.000Z",
        lastSuccessfulCapturedAt: "2026-08-20T10:00:00.000Z",
        captureHash: "2".repeat(64),
        modelInputHash: "c".repeat(64),
        rawObjects: [
          {
            key: "raw/odds/one.json.gz",
            sha256: "d".repeat(64),
            compressedBytes: 10,
            uncompressedBytes: 20,
          },
        ],
        stateRowCount: 1,
        healthMetadata: {},
      },
    ],
    playerStates: [
      {
        registrationKey: "epl:2026-27:registration:fpl-1",
        seasonKey: "epl:2026-27",
        observedAt: "2026-08-20T10:00:00.000Z",
        price: 9.5,
        ownership: 20,
        availabilityProbability: 1,
        minutes: 0,
        starts: 0,
        expectedPointsNext: 5,
        news: "Available",
        rowHash: "e".repeat(64),
      },
    ],
    playerPriors: [
      {
        registrationKey: "epl:2026-27:registration:fpl-1",
        seasonKey: "epl:2026-27",
        observedAt: "2026-08-20T10:00:00.000Z",
        weightedMinutes: 2_000,
        goalsPer90: 0.4,
        assistsPer90: 0.3,
        sourceSeasons: [{ season: "2025/26", weight: 1 }],
        calculationVersion: "fpl-prior-v1",
        rowHash: "f".repeat(64),
      },
    ],
    fixtureMarkets: [
      {
        sourceKey: "odds-api",
        fixtureKey: "fixture:1",
        seasonKey: "epl:2026-27",
        observedAt: "2026-08-20T10:00:00.000Z",
        homeGoalRate: 1.8,
        awayGoalRate: 1.2,
        marketCoverage: 1,
        sourceAgreement: 0.8,
        bookmakerCount: 4,
        projectionVersion: "odds-consensus-v1",
        rowHash: "0".repeat(64),
      },
    ],
    fixtures: [
      {
        key: "fixture:1",
        gameweek: 1,
        homeTeam: "ARS",
        awayTeam: "LIV",
        kickoffAt: "2026-08-22T16:30:00.000Z",
        deadlineAt: "2026-08-21T17:30:00.000Z",
      },
    ],
    registrations: [
      {
        registrationKey: "epl:2026-27:registration:fpl-1",
        playerKey: "person:1",
        name: "Player One",
        team: "ARS",
        position: "MID",
        status: "active",
      },
    ],
  };
}

describe("compact forecast preparation", () => {
  it("creates one horizon-independent semantic run ID", async () => {
    const first = await prepareCompactForecast(state(), {
      cutoffAt: "2026-08-20T12:00:00.000Z",
      codeVersion: "test-sha",
    });
    const changedTransport = state();
    changedTransport.sourceHeads[0] = {
      ...changedTransport.sourceHeads[0]!,
      lastAttemptAt: "2026-08-20T11:00:00.000Z",
      lastSuccessfulCapturedAt: "2026-08-20T11:00:00.000Z",
      rawObjects: [
        {
          key: "raw/fpl/different-key.json.gz",
          sha256: "9".repeat(64),
          compressedBytes: 99,
          uncompressedBytes: 100,
        },
      ],
    };
    const second = await prepareCompactForecast(changedTransport, {
      cutoffAt: "2026-08-20T12:30:00.000Z",
      codeVersion: "test-sha",
    });

    expect(first.status).toBe("ready");
    expect(second.status).toBe("ready");
    if (first.status !== "ready" || second.status !== "ready") return;
    expect(first.runId).toBe(second.runId);
    expect(first.request.horizons).toEqual([1, 3, 5]);
    expect(first.request.ruleset).toEqual(defaultFplRuleset);
    expect(first.request.players[0]?.fpl).not.toHaveProperty("transfersIn");
    expect(first.request.fixtures[0]).toMatchObject({
      homeGoalRate: 1.8,
      awayGoalRate: 1.2,
      marketCoverage: 1,
    });
  });
});
