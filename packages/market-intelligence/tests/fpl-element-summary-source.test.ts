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
          history_past: [
            {
              season_name: "2025/26",
              element_code: 223340,
              minutes: 2850,
              expected_goals: "13.4",
              expected_assists: "9.2",
              total_points: 210,
            },
          ],
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
        expect.objectContaining({
          metric: "historical_expected_goals",
          numericValue: 13.4,
          metadata: { sourceSeason: "2025/26" },
        }),
        expect.objectContaining({
          metric: "historical_minutes",
          numericValue: 2850,
        }),
      ]),
    );
    expect(batch.rawSnapshots[0]?.payload).toEqual(
      expect.objectContaining({ "7": expect.any(Object) }),
    );
  });
});
