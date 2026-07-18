import { describe, expect, test } from "vite-plus/test";
import { createFplElementSummarySource } from "market-intelligence/sources";

describe("FPL element summary source", () => {
  test("captures season history and upcoming fixtures for registered players", async () => {
    const batch = await createFplElementSummarySource({
      fetcher: async () =>
        Response.json({
          history: [
            { round: 1, fixture: 11, minutes: 90, total_points: 8, expected_goals: "0.42" },
          ],
          fixtures: [{ id: 21, event: 2, is_home: true, kickoff_time: "2026-08-29T14:00:00Z" }],
          history_past: [],
        }),
    }).capture({
      seasonKey: "epl:2026-27",
      season: "2026/27",
      playerIds: [7],
      capturedAt: "2026-08-24T22:00:00.000Z",
    });

    expect(batch.rawSnapshots).toHaveLength(1);
    expect(batch.observations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ metric: "history_total_points", numericValue: 8 }),
        expect.objectContaining({ metric: "history_expected_goals", numericValue: 0.42 }),
        expect.objectContaining({ metric: "upcoming_fixture", stringValue: "21" }),
      ]),
    );
  });
});
