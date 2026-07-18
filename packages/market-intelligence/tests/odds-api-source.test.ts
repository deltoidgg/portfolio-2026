import { describe, expect, test } from "vite-plus/test";
import { createMemorySeasonCatalog } from "market-intelligence";
import { createOddsApiSource, createSeasonAwareOddsApiSource } from "market-intelligence/sources";

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

  test("reconciles provider events to their real fixture and quarantines unknown matches", async () => {
    const catalog = createMemorySeasonCatalog();
    await catalog.importManifest({
      key: "epl:2026-27",
      competition: "EPL",
      label: "2026/27",
      startsAt: "2026-08-21T00:00:00.000Z",
      endsAt: "2027-05-30T23:59:59.000Z",
      lifecycle: "prelaunch",
      rulesetKey: "fpl:2026-27:provisional-v1",
      teams: [
        { key: "epl:2026-27:team:ars", clubKey: "ARS", name: "Arsenal", shortName: "ARS" },
        { key: "epl:2026-27:team:cov", clubKey: "COV", name: "Coventry City", shortName: "COV" },
        { key: "epl:2026-27:team:liv", clubKey: "LIV", name: "Liverpool", shortName: "LIV" },
        { key: "epl:2026-27:team:new", clubKey: "NEW", name: "Newcastle", shortName: "NEW" },
      ],
      fixtures: [
        {
          key: "epl:2026-27:fixture:ars-cov",
          homeTeamKey: "epl:2026-27:team:ars",
          awayTeamKey: "epl:2026-27:team:cov",
          kickoffAt: "2026-08-21T19:00:00.000Z",
          gameweek: 1,
          deadlineAt: "2026-08-21T17:30:00.000Z",
        },
        {
          key: "epl:2026-27:fixture:new-liv",
          homeTeamKey: "epl:2026-27:team:new",
          awayTeamKey: "epl:2026-27:team:liv",
          kickoffAt: "2026-08-23T15:30:00.000Z",
          gameweek: 1,
          deadlineAt: "2026-08-21T17:30:00.000Z",
        },
      ],
    });
    const fetcher: typeof fetch = async () =>
      Response.json([
        {
          id: "known",
          commence_time: "2026-08-23T15:30:00Z",
          home_team: "Newcastle United",
          away_team: "Liverpool",
          bookmakers: [],
        },
        {
          id: "unknown",
          commence_time: "2026-08-23T15:30:00Z",
          home_team: "Unknown FC",
          away_team: "Liverpool",
          bookmakers: [],
        },
      ]);

    const batch = await createSeasonAwareOddsApiSource({
      apiKey: "test-key",
      catalog,
      fetcher,
    }).capture({
      seasonKey: "epl:2026-27",
      season: "2026/27",
      capturedAt: "2026-08-20T12:00:00.000Z",
    });

    expect(batch.fixtures).toEqual([
      expect.objectContaining({
        key: "epl:2026-27:fixture:new-liv",
        gameweek: 1,
        deadlineAt: "2026-08-21T17:30:00.000Z",
      }),
    ]);
    expect(batch.metadata).toEqual(
      expect.objectContaining({
        matchedEventCount: 1,
        quarantinedEventCount: 1,
      }),
    );
    expect(await catalog.fixtureLink("odds-api", "epl:2026-27", "unknown")).toEqual(
      expect.objectContaining({ status: "rejected" }),
    );
  });
});
