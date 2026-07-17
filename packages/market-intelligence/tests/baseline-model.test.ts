import { describe, expect, it } from "vitest";
import { createBaselineForecastBatch, devigDecimalOdds } from "../src/model/index.ts";

describe("baseline odds-to-points model", () => {
  it("removes the market margin and emits ranked, explainable FPL distributions", () => {
    expect(devigDecimalOdds([1.8, 2.2])).toEqual([
      expect.closeTo(0.55, 2),
      expect.closeTo(0.45, 2),
    ]);

    const batch = createBaselineForecastBatch({
      competition: "EPL",
      season: "2025/26",
      gameweek: 34,
      observedAt: "2026-04-24T16:45:00.000Z",
      deadlineAt: "2026-04-24T17:30:00.000Z",
      fixtures: [],
      players: [
        {
          playerKey: "player:market-led",
          playerName: "Market Led",
          teamKey: "ARS",
          position: "MID",
          playProbability: 0.94,
          sixtyMinuteProbability: 0.82,
          market: {
            goalProbability: 0.4,
            assistProbability: 0.28,
            cleanSheetProbability: 0.42,
            sourceKeys: ["odds-api", "smarkets"],
          },
          history: { goalsPer90: 0.3, assistsPer90: 0.2 },
        },
        {
          playerKey: "player:fallback",
          playerName: "History Fallback",
          teamKey: "NEW",
          position: "MID",
          playProbability: 0.88,
          sixtyMinuteProbability: 0.74,
          market: { cleanSheetProbability: 0.3, sourceKeys: ["odds-api"] },
          history: { goalsPer90: 0.25, assistsPer90: 0.18 },
        },
      ],
    });

    expect(batch.source.key).toBe("baseline-xp-v1");
    expect(batch.forecasts).toHaveLength(2);
    expect(batch.rawSnapshots).toHaveLength(1);

    const marketLed = batch.forecasts.find(
      (forecast) => forecast.playerKey === "player:market-led",
    );
    const fallback = batch.forecasts.find((forecast) => forecast.playerKey === "player:fallback");
    expect(marketLed?.rank).toBe(1);
    expect(marketLed?.expectedPoints).toBeGreaterThan(fallback?.expectedPoints ?? 0);
    expect(marketLed?.components.goals).toBeGreaterThan(2);
    expect(marketLed?.p10).toBeLessThanOrEqual(marketLed?.p50 ?? 0);
    expect(marketLed?.p50).toBeLessThanOrEqual(marketLed?.p90 ?? 0);
    expect(marketLed?.evidence.sourceKeys).toEqual(["odds-api", "smarkets"]);
    expect(marketLed?.evidence.signals?.map((signal) => signal.label)).toEqual(
      expect.arrayContaining(["Availability", "Anytime scorer", "Assist", "Clean sheet"]),
    );
    expect(fallback?.evidence.detail).toContain("historical fallback");
    expect(fallback?.evidence.confidence).toBeLessThan(marketLed?.evidence.confidence ?? 0);
  });

  it("uses inferred clean-sheet probability consistently in means and quantiles", () => {
    const player = {
      playerKey: "player:defender",
      playerName: "Example Defender",
      teamKey: "ARS",
      position: "DEF" as const,
      playProbability: 1,
      sixtyMinuteProbability: 1,
      history: { goalsPer90: 0, assistsPer90: 0 },
    };
    const input = {
      competition: "EPL",
      season: "2025/26",
      gameweek: 34,
      observedAt: "2026-04-24T16:45:00.000Z",
      deadlineAt: "2026-04-24T17:30:00.000Z",
      fixtures: [],
    };
    const inferred = createBaselineForecastBatch({
      ...input,
      players: [
        {
          ...player,
          market: { teamWinProbability: 0.5, sourceKeys: ["odds-api"] },
        },
      ],
    }).forecasts[0];
    const explicit = createBaselineForecastBatch({
      ...input,
      players: [
        {
          ...player,
          market: { cleanSheetProbability: 0.36, sourceKeys: ["odds-api"] },
        },
      ],
    }).forecasts[0];

    expect(inferred?.expectedPoints).toBe(explicit?.expectedPoints);
    expect([inferred?.p10, inferred?.p50, inferred?.p90]).toEqual([
      explicit?.p10,
      explicit?.p50,
      explicit?.p90,
    ]);
    expect(inferred?.p90).toBe(6);
  });
});
