import { describe, expect, test } from "vite-plus/test";
import { createFplSource } from "market-intelligence/sources";

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
              web_name: "Saka",
              team: 1,
              element_type: 3,
              now_cost: 105,
              selected_by_percent: "45.0",
              status: "a",
              chance_of_playing_next_round: 100,
              expected_goals: "0.30",
              expected_assists: "0.25",
              form: "5.2",
              ep_next: "6.1",
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
        key: "epl:2026-27:gw1:ars-liv",
        homeTeam: "ARS",
        awayTeam: "LIV",
        gameweek: 1,
      }),
    ]);
    expect(batch.rawSnapshots).toHaveLength(2);
    expect(batch.observations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityKey: "epl:player:7",
          metric: "price",
          numericValue: 10.5,
          unit: "gbp-million",
        }),
        expect.objectContaining({
          entityKey: "epl:player:7",
          metric: "expected_points_next",
          numericValue: 6.1,
        }),
      ]),
    );
    expect(batch.entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "epl:player:7", type: "player", teamKey: "ARS" }),
      ]),
    );
    expect(batch.entityAliases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceKey: "fpl",
          sourceEntityKey: "player:7",
          entityKey: "epl:player:7",
        }),
      ]),
    );
  });
});
