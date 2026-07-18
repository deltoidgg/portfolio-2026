import { describe, expect, test } from "vite-plus/test";
import { createMemorySeasonCatalog } from "market-intelligence";
import { createFplSource, registerFplBatchPlayers } from "market-intelligence/sources";

describe("FPL source adapter", () => {
  test("maps the observable FPL responses into one canonical capture batch", async () => {
    const responses = new Map<string, unknown>([
      [
        "https://fantasy.premierleague.com/api/bootstrap-static/",
        {
          events: [{ id: 1, deadline_time: "2026-08-14T17:30:00Z" }],
          teams: [
            { id: 1, name: "Arsenal", short_name: "ARS" },
            { id: 2, name: "Liverpool", short_name: "LIV" },
          ],
          elements: [
            {
              id: 7,
              code: 223340,
              opta_code: "p223340",
              first_name: "Bukayo",
              second_name: "Saka",
              web_name: "Saka",
              team: 1,
              element_type: 3,
              now_cost: 105,
              selected_by_percent: "45.0",
              status: "a",
              chance_of_playing_next_round: 100,
              expected_goals: "0.30",
              expected_assists: "0.25",
              expected_goals_per_90: 0.45,
              expected_assists_per_90: 0.37,
              saves_per_90: 0,
              defensive_contribution_per_90: 7.2,
              yellow_cards: 1,
              minutes: 900,
              starts: 10,
              form: "5.2",
              ep_next: null,
            },
          ],
        },
      ],
      [
        "https://fantasy.premierleague.com/api/fixtures/",
        [
          {
            id: 11,
            event: 1,
            team_h: 1,
            team_a: 2,
            kickoff_time: "2026-08-15T16:30:00Z",
            finished: false,
          },
        ],
      ],
    ]);
    const fetcher: typeof fetch = async (input) => {
      const url =
        input instanceof URL ? input.toString() : typeof input === "string" ? input : input.url;
      const payload = responses.get(url);
      if (!payload) return new Response("not found", { status: 404 });
      return Response.json(payload);
    };

    const batch = await createFplSource({ fetcher }).capture({
      season: "2026/27",
      gameweek: 1,
      capturedAt: "2026-08-14T10:00:00.000Z",
    });

    expect(batch.source.key).toBe("fpl");
    expect(batch.fixtures).toEqual([
      expect.objectContaining({
        key: "epl:2026-27:fixture:ars-liv",
        homeTeam: "ARS",
        awayTeam: "LIV",
        gameweek: 1,
      }),
    ]);
    expect(batch.rawSnapshots).toHaveLength(2);
    expect(batch.observations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityKey: "epl:person:opta:p223340",
          metric: "price",
          numericValue: 10.5,
          unit: "gbp-million",
        }),
        expect.objectContaining({
          metric: "defensive_contributions_per_90",
          numericValue: 7.2,
        }),
        expect.objectContaining({ metric: "cards_per_90", numericValue: 0.1 }),
      ]),
    );
    expect(
      batch.observations.some((observation) => observation.metric === "expected_points_next"),
    ).toBe(false);
    expect(batch.entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "epl:person:opta:p223340",
          type: "player",
          teamKey: "ARS",
          metadata: expect.objectContaining({ registrationKey: "epl:2026-27:registration:fpl-7" }),
        }),
      ]),
    );
    expect(batch.entityAliases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceKey: "fpl",
          sourceEntityKey: "epl:2026-27:player:7",
          entityKey: "epl:person:opta:p223340",
          seasonKey: "epl:2026-27",
        }),
      ]),
    );
    const catalog = createMemorySeasonCatalog();
    await catalog.importManifest({
      key: "epl:2026-27",
      competition: "EPL",
      label: "2026/27",
      startsAt: "2026-08-14T00:00:00.000Z",
      endsAt: "2027-05-31T23:59:59.000Z",
      lifecycle: "prelaunch",
      rulesetKey: "fpl:2026-27:provisional-v1",
      teams: [
        { key: "epl:2026-27:team:ars", clubKey: "ARS", name: "Arsenal", shortName: "ARS" },
        { key: "epl:2026-27:team:liv", clubKey: "LIV", name: "Liverpool", shortName: "LIV" },
      ],
      fixtures: [],
    });
    await registerFplBatchPlayers(catalog, "epl:2026-27", batch);
    expect(await catalog.registrationsForPlayer("epl:person:opta:p223340")).toEqual([
      expect.objectContaining({
        key: "epl:2026-27:registration:fpl-7",
        position: "MID",
        teamSeasonKey: "epl:2026-27:team:ars",
      }),
    ]);
  });

  test("rejects a prior-season bootstrap instead of relabelling it as the requested season", async () => {
    const fetcher: typeof fetch = async (input) => {
      const url =
        input instanceof URL ? input.toString() : typeof input === "string" ? input : input.url;
      if (url.endsWith("bootstrap-static/")) {
        return Response.json({
          events: [{ id: 1, deadline_time: "2025-08-15T17:30:00Z" }],
          teams: [{ id: 1, name: "Arsenal", short_name: "ARS" }],
          elements: [],
        });
      }
      return Response.json([]);
    };

    await expect(
      createFplSource({ fetcher }).capture({
        season: "2026/27",
        gameweek: 1,
        seasonGuard: {
          seasonKey: "epl:2026-27",
          startsAt: "2026-08-21T00:00:00.000Z",
          endsAt: "2027-05-31T23:59:59.000Z",
          expectedTeams: ["ARS"],
        },
      }),
    ).rejects.toThrow(/does not match epl:2026-27/);
  });
});
