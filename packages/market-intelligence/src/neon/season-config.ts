import { PREMIER_LEAGUE_2026_27_FIXTURES_URL } from "../season-schedule.ts";

const officialRulesetKey = "fpl:2026-27:official-v1";

export function getCurrentSeasonConfig() {
  const seasonKey = process.env.MI_SEASON_KEY ?? "epl:2026-27";
  const configuredRuleset = process.env.MI_RULESET_KEY;
  return {
    key: seasonKey,
    label: process.env.MI_SEASON ?? "2026/27",
    startsAt: process.env.MI_SEASON_STARTS_AT ?? "2026-08-21T00:00:00.000Z",
    endsAt: process.env.MI_SEASON_ENDS_AT ?? "2027-05-30T23:59:59.000Z",
    rulesetKey:
      seasonKey === "epl:2026-27" && configuredRuleset?.includes("provisional")
        ? officialRulesetKey
        : (configuredRuleset ?? officialRulesetKey),
  };
}

export function getPremierLeagueFixturesUrl() {
  return process.env.MI_FIXTURES_URL ?? PREMIER_LEAGUE_2026_27_FIXTURES_URL;
}
