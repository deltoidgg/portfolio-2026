import { describe, expect, it } from "vitest";
import { canonicalFixtureKey, resolvePremierLeagueTeam } from "../src/entity-resolution.ts";

describe("entity resolution", () => {
  it("maps provider team aliases onto one conservative canonical fixture key", () => {
    expect(resolvePremierLeagueTeam("Arsenal")).toBe("ARS");
    expect(resolvePremierLeagueTeam("ARS")).toBe("ARS");
    expect(resolvePremierLeagueTeam("Manchester City")).toBe("MCI");
    expect(resolvePremierLeagueTeam("Wolves")).toBe("WOL");

    expect(
      canonicalFixtureKey({
        competition: "EPL",
        season: "2026/27",
        gameweek: 1,
        homeTeam: "Arsenal",
        awayTeam: "Liverpool",
      }),
    ).toBe("epl:2026-27:gw1:ars-liv");
    expect(() => resolvePremierLeagueTeam("Ambiguous United")).toThrow("Unknown EPL team alias");
  });
});
