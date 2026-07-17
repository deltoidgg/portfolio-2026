import { describe, expect, test } from "vite-plus/test";
import {
  createFixtureReconciler,
  createMemorySeasonCatalog,
  type ProviderFixtureEvent,
  type SeasonManifest,
} from "market-intelligence";

const manifest: SeasonManifest = {
  key: "epl:2026-27",
  competition: "EPL",
  label: "2026/27",
  startsAt: "2026-08-21T00:00:00.000Z",
  endsAt: "2027-05-31T23:59:59.000Z",
  lifecycle: "prelaunch",
  rulesetKey: "fpl:2026-27:provisional-v1",
  teams: [
    { key: "epl:2026-27:team:ars", clubKey: "ARS", name: "Arsenal", shortName: "ARS" },
    { key: "epl:2026-27:team:liv", clubKey: "LIV", name: "Liverpool", shortName: "LIV" },
    { key: "epl:2026-27:team:cov", clubKey: "COV", name: "Coventry City", shortName: "COV" },
    { key: "epl:2026-27:team:hul", clubKey: "HUL", name: "Hull City", shortName: "HUL" },
  ],
  fixtures: [
    {
      key: "epl:2026-27:fixture:ars-liv",
      homeTeamKey: "epl:2026-27:team:ars",
      awayTeamKey: "epl:2026-27:team:liv",
      kickoffAt: "2026-08-22T16:30:00.000Z",
      gameweek: 1,
      deadlineAt: "2026-08-21T17:30:00.000Z",
    },
    {
      key: "epl:2026-27:fixture:cov-hul",
      homeTeamKey: "epl:2026-27:team:cov",
      awayTeamKey: "epl:2026-27:team:hul",
      kickoffAt: "2026-08-29T14:00:00.000Z",
      gameweek: 2,
      deadlineAt: "2026-08-28T17:30:00.000Z",
    },
  ],
};

describe("season catalogue and fixture reconciliation", () => {
  test("keeps season-local registrations separate while linking a stable person", async () => {
    const catalog = createMemorySeasonCatalog();
    await catalog.importManifest(manifest);
    await catalog.registerPlayer({
      seasonKey: "epl:2025-26",
      fplElementId: 7,
      playerName: "Bukayo Saka",
      teamKey: "ARS",
      position: "MID",
      optaCode: "p223340",
    });
    await catalog.registerPlayer({
      seasonKey: "epl:2026-27",
      fplElementId: 7,
      playerName: "Bukayo Saka",
      teamKey: "ARS",
      position: "MID",
      optaCode: "p223340",
    });

    const registrations = await catalog.registrationsForPlayer("epl:person:opta:p223340");

    expect(registrations.map((registration) => registration.key)).toEqual([
      "epl:2025-26:registration:fpl-7",
      "epl:2026-27:registration:fpl-7",
    ]);
    expect(new Set(registrations.map((registration) => registration.playerKey))).toEqual(
      new Set(["epl:person:opta:p223340"]),
    );
    await catalog.updateSeasonState({
      seasonKey: "epl:2026-27",
      lifecycle: "active",
      priceState: "official",
    });
    expect(await catalog.season("epl:2026-27")).toEqual(
      expect.objectContaining({ lifecycle: "active", priceState: "official" }),
    );
    await catalog.updateSeasonState({
      seasonKey: "epl:2026-27",
      lifecycle: "prelaunch",
      priceState: "unpublished",
    });
    expect(await catalog.season("epl:2026-27")).toEqual(
      expect.objectContaining({ lifecycle: "active", priceState: "official" }),
    );
  });

  test("matches provider events to exact fixtures and quarantines ambiguous or unknown events", async () => {
    const catalog = createMemorySeasonCatalog();
    await catalog.importManifest(manifest);
    const reconciler = createFixtureReconciler(catalog);
    const events: ProviderFixtureEvent[] = [
      {
        sourceKey: "odds-api",
        sourceEventId: "event-gw1",
        seasonKey: "epl:2026-27",
        homeTeam: "Arsenal",
        awayTeam: "Liverpool",
        kickoffAt: "2026-08-22T17:00:00.000Z",
      },
      {
        sourceKey: "odds-api",
        sourceEventId: "event-gw2",
        seasonKey: "epl:2026-27",
        homeTeam: "Coventry City",
        awayTeam: "Hull City",
        kickoffAt: "2026-08-29T14:00:00.000Z",
      },
      {
        sourceKey: "odds-api",
        sourceEventId: "unknown",
        seasonKey: "epl:2026-27",
        homeTeam: "Unknown FC",
        awayTeam: "Liverpool",
        kickoffAt: "2026-08-22T16:30:00.000Z",
      },
    ];

    const result = await reconciler.reconcile(events);

    expect(
      result.matched.map((match) => [match.sourceEventId, match.fixtureKey, match.gameweek]),
    ).toEqual([
      ["event-gw1", "epl:2026-27:fixture:ars-liv", 1],
      ["event-gw2", "epl:2026-27:fixture:cov-hul", 2],
    ]);
    expect(result.quarantined).toEqual([
      expect.objectContaining({ sourceEventId: "unknown", status: "rejected" }),
    ]);

    const moved = await reconciler.reconcile([
      { ...events[0]!, kickoffAt: "2026-08-24T20:00:00.000Z" },
    ]);
    expect(moved.matched[0]?.fixtureKey).toBe("epl:2026-27:fixture:ars-liv");
  });
});
