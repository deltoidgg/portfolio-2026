import { describe, expect, test } from "vite-plus/test";
import { createOddsApiSource } from "market-intelligence/sources";

describe("The Odds API source adapter", () => {
  test("normalises bookmaker outcomes without persisting its API key", async () => {
    const fetcher: typeof fetch = async (input) => {
      const url = new URL(
        input instanceof URL ? input.toString() : typeof input === "string" ? input : input.url,
      );
      expect(url.searchParams.get("apiKey")).toBe("test-key");
      return Response.json([
        {
          id: "event-1",
          commence_time: "2026-08-15T16:30:00Z",
          home_team: "Arsenal",
          away_team: "Liverpool",
          bookmakers: [
            {
              key: "smarkets",
              title: "Smarkets",
              last_update: "2026-08-14T10:00:00Z",
              markets: [
                {
                  key: "h2h",
                  last_update: "2026-08-14T10:00:00Z",
                  outcomes: [
                    { name: "Arsenal", price: 1.9 },
                    { name: "Draw", price: 3.5 },
                    { name: "Liverpool", price: 4.2 },
                  ],
                },
              ],
            },
          ],
        },
      ]);
    };

    const batch = await createOddsApiSource({ apiKey: "test-key", fetcher }).capture({
      season: "2026/27",
      gameweek: 1,
      deadlineAt: "2026-08-14T17:30:00.000Z",
      capturedAt: "2026-08-14T10:00:00.000Z",
    });

    expect(batch.fixtures[0]).toEqual(
      expect.objectContaining({
        key: "epl:2026-27:gw1:ars-liv",
        homeTeam: "ARS",
        awayTeam: "LIV",
      }),
    );
    expect(batch.observations).toHaveLength(3);
    expect(batch.observations[0]).toEqual(
      expect.objectContaining({
        metric: "decimal_odds",
        marketFamily: "h2h",
        outcome: "Arsenal",
        numericValue: 1.9,
      }),
    );
    expect(batch.rawSnapshots[0]?.endpoint).not.toContain("test-key");
  });
});
