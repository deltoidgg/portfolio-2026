import { describe, expect, test } from "vite-plus/test";
import {
  createMarketIntelligence,
  createMemoryStore,
  sourceStatusAt,
  type CaptureBatch,
} from "market-intelligence";

const firstCapture: CaptureBatch = {
  id: "capture-001",
  source: { key: "model:baseline", label: "Baseline model", kind: "model" },
  capturedAt: "2026-08-14T10:00:00.000Z",
  fixtures: [
    {
      key: "epl:2026:1:ars-liv",
      competition: "EPL",
      season: "2026/27",
      gameweek: 1,
      homeTeam: "ARS",
      awayTeam: "LIV",
      kickoffAt: "2026-08-15T16:30:00.000Z",
      deadlineAt: "2026-08-14T17:30:00.000Z",
    },
  ],
  rawSnapshots: [],
  observations: [],
  forecasts: [
    {
      modelKey: "baseline-v1",
      playerKey: "player:saka",
      playerName: "Bukayo Saka",
      teamKey: "ARS",
      position: "MID",
      competition: "EPL",
      season: "2026/27",
      gameweek: 1,
      observedAt: "2026-08-14T10:00:00.000Z",
      deadlineAt: "2026-08-14T17:30:00.000Z",
      expectedPoints: 6.2,
      p10: 2,
      p50: 5.4,
      p90: 12.1,
      rank: 2,
      components: { appearance: 1.8, goals: 2.1, assists: 1.3, cleanSheet: 0.6, bonus: 0.4 },
      evidence: { headline: "Arsenal attack holds", detail: "Match and player prices agree." },
    },
  ],
  annotations: [],
};

const secondCapture: CaptureBatch = {
  ...firstCapture,
  id: "capture-002",
  capturedAt: "2026-08-14T16:30:00.000Z",
  forecasts: [
    {
      ...firstCapture.forecasts[0],
      observedAt: "2026-08-14T16:30:00.000Z",
      expectedPoints: 7.1,
      p50: 6.3,
      rank: 1,
      evidence: {
        headline: "Anytime scorer shortened",
        detail: "The move adds 0.9 expected points before the deadline.",
      },
    },
  ],
  annotations: [
    {
      key: "note-001",
      observedAt: "2026-08-14T16:24:00.000Z",
      sourceKey: "smarkets",
      category: "market-move",
      title: "Saka scorer price shortens",
      detail: "The exchange moved before the model refresh.",
      impact: 0.9,
      playerKey: "player:saka",
    },
  ],
};

describe("market intelligence", () => {
  test("reconstructs a deadline room through its public interface", async () => {
    const intelligence = createMarketIntelligence({ store: createMemoryStore() });

    await intelligence.ingest(firstCapture);
    await intelligence.ingest(secondCapture);

    const room = await intelligence.getDeadlineRoom({
      competition: "EPL",
      season: "2026/27",
      gameweek: 1,
    });

    expect(room.timeline.map((point) => point.observedAt)).toEqual([
      "2026-08-14T10:00:00.000Z",
      "2026-08-14T16:30:00.000Z",
    ]);
    expect(room.players).toHaveLength(1);
    expect(room.players[0]?.series.map((point) => point.expectedPoints)).toEqual([6.2, 7.1]);
    expect(room.players[0]?.series[1]?.evidence.headline).toBe("Anytime scorer shortened");
    expect(room.annotations[0]?.impact).toBe(0.9);
    expect(sourceStatusAt(room.sources[0]!, room.timeline[0]!.observedAt)).toMatchObject({
      captureCount: 1,
      lastCapturedAt: "2026-08-14T10:00:00.000Z",
    });
    expect(sourceStatusAt(room.sources[0]!, room.timeline[1]!.observedAt)).toMatchObject({
      captureCount: 2,
      lastCapturedAt: "2026-08-14T16:30:00.000Z",
    });
  });
});
