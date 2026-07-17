import { describe, expect, test } from "vite-plus/test";
import { createDemoDeadlineRoom } from "market-intelligence/demo";

describe("deadline-room demo dataset", () => {
  test("exercises replay, source disagreement, annotations, and player distributions", async () => {
    const room = await createDemoDeadlineRoom();

    expect(room.dataMode).toBe("demo");
    expect(room.timeline).toHaveLength(8);
    expect(room.players).toHaveLength(5);
    expect(room.players.every((player) => player.series.length === room.timeline.length)).toBe(
      true,
    );
    expect(room.sources.map((source) => source.key)).toEqual(
      expect.arrayContaining(["fpl", "odds-api", "polymarket", "smarkets"]),
    );
    expect(room.annotations.map((annotation) => annotation.category)).toEqual(
      expect.arrayContaining(["market-move", "availability", "team-news"]),
    );
    const latestSignals = room.players[0]?.series.at(-1)?.evidence.signals ?? [];
    expect(latestSignals.map((signal) => signal.label)).toEqual(
      expect.arrayContaining(["Availability", "Ownership", "Anytime scorer", "Team goal line"]),
    );
  });
});
