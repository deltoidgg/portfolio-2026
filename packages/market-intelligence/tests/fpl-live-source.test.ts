import { describe, expect, test } from "vite-plus/test";
import { createFplLiveSource, extractFplGameweekResults } from "market-intelligence/sources";

describe("FPL live results source", () => {
  test("captures live scoring components and projects season-scoped final results", async () => {
    const fetcher: typeof fetch = async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      return url.endsWith("/fixtures/")
        ? Response.json([
            {
              event: 1,
              finished: true,
              finished_provisional: false,
            },
          ])
        : Response.json({
            elements: [
              {
                id: 7,
                stats: {
                  minutes: 90,
                  total_points: 14,
                  goals_scored: 1,
                  assists: 1,
                  clean_sheets: 1,
                  goals_conceded: 0,
                  own_goals: 0,
                  penalties_saved: 0,
                  penalties_missed: 0,
                  yellow_cards: 0,
                  red_cards: 0,
                  saves: 0,
                  bonus: 3,
                  bps: 42,
                  defensive_contribution: 4,
                },
                explain: [],
              },
            ],
          });
    };
    const batch = await createFplLiveSource({ fetcher }).capture({
      seasonKey: "epl:2026-27",
      season: "2026/27",
      gameweek: 1,
      capturedAt: "2026-08-24T22:00:00.000Z",
    });

    expect(batch.observations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityKey: "epl:2026-27:registration:fpl-7",
          metric: "total_points",
          numericValue: 14,
        }),
      ]),
    );
    expect(batch.rawSnapshots).toHaveLength(2);
    expect(batch.metadata?.isFinal).toBe(true);
    expect(
      extractFplGameweekResults(batch, {
        seasonKey: "epl:2026-27",
        gameweek: 1,
        status: "final",
        positions: { "epl:2026-27:registration:fpl-7": "MID" },
      }),
    ).toEqual([
      expect.objectContaining({
        registrationKey: "epl:2026-27:registration:fpl-7",
        totalPoints: 14,
        status: "final",
        components: {
          appearance: 2,
          goals: 5,
          assists: 3,
          cleanSheet: 1,
          bonus: 3,
          other: 0,
        },
      }),
    ]);
  });

  test("marks a response provisional until every gameweek fixture is final", async () => {
    const fetcher: typeof fetch = async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      return url.endsWith("/fixtures/")
        ? Response.json([{ event: 1, finished: true, finished_provisional: true }])
        : Response.json({ elements: [] });
    };

    const batch = await createFplLiveSource({ fetcher }).capture({
      seasonKey: "epl:2026-27",
      season: "2026/27",
      gameweek: 1,
      capturedAt: "2026-08-24T09:00:00.000Z",
    });

    expect(batch.metadata?.isFinal).toBe(false);
    expect(batch.rawSnapshots).toHaveLength(2);
  });
});
