import { describe, expect, test } from "vite-plus/test";
import {
  createPremierLeagueSeasonManifest,
  parsePremierLeagueFixtureArticle,
} from "market-intelligence";

const roundOne = [
  "20:00 Arsenal v Coventry City (Sky Sports)",
  "12:30 Hull City v Manchester United (TNT Sports)",
  "Everton v Crystal Palace",
  "Ipswich Town v Sunderland",
  "Nottingham Forest v Leeds United",
  "17:30 Brentford v Tottenham Hotspur (Sky Sports)",
  "14:00 Brighton &amp; Hove Albion v Aston Villa (Sky Sports)",
  "14:00 Manchester City v AFC Bournemouth (Sky Sports)",
  "16:30 Newcastle United v Liverpool (Sky Sports)",
  "20:00 Fulham v Chelsea (Sky Sports)",
];

const roundTwo = [
  "20:00 Crystal Palace v Manchester City",
  "12:30 Liverpool v Nottingham Forest",
  "AFC Bournemouth v Everton",
  "Coventry City v Hull City",
  "17:30 Tottenham Hotspur v Newcastle United",
  "14:00 Chelsea v Brighton &amp; Hove Albion",
  "14:00 Leeds United v Brentford",
  "14:00 Sunderland v Fulham",
  "16:30 Manchester United v Ipswich Town",
  "20:00 Aston Villa v Arsenal",
];

const article = [
  `<p><strong>Friday 21 August 2026</strong><br />${roundOne[0]}</p>`,
  `<p><strong>Saturday 22 August</strong><br />${roundOne.slice(1, 6).join("<br />")}</p>`,
  `<p><strong>Sunday 23 August</strong><br />${roundOne.slice(6, 9).join("<br />")}</p>`,
  `<p><strong>Monday 24 August</strong><br />${roundOne[9]}</p>`,
  `<p><strong>Friday 28 August</strong><br />${roundTwo[0]}</p>`,
  `<p><strong>Saturday 29 August</strong><br />${roundTwo.slice(1, 5).join("<br />")}</p>`,
  `<p><strong>Sunday 30 August</strong><br />${roundTwo.slice(5, 9).join("<br />")}</p>`,
  `<p><strong>Monday 31 August</strong><br />${roundTwo[9]}</p>`,
].join("\n");

describe("official Premier League schedule ingestion", () => {
  test("parses article fixtures, assigns rounds, and derives one deadline per round", () => {
    const fixtures = parsePremierLeagueFixtureArticle(article, { startYear: 2026 });

    expect(fixtures).toHaveLength(20);
    expect(fixtures[0]).toEqual(
      expect.objectContaining({
        gameweek: 1,
        homeTeam: "ARS",
        awayTeam: "COV",
        kickoffAt: "2026-08-21T19:00:00.000Z",
        deadlineAt: "2026-08-21T17:30:00.000Z",
      }),
    );
    expect(fixtures[10]).toEqual(
      expect.objectContaining({ gameweek: 2, homeTeam: "CRY", awayTeam: "MCI" }),
    );
    expect(new Set(fixtures.slice(10).map((fixture) => fixture.deadlineAt)).size).toBe(1);
  });

  test("builds a prelaunch manifest with season-scoped team and fixture identities", () => {
    const manifest = createPremierLeagueSeasonManifest({
      html: article,
      key: "epl:2026-27",
      label: "2026/27",
      startsAt: "2026-08-21T00:00:00.000Z",
      endsAt: "2027-05-30T23:59:59.000Z",
      rulesetKey: "fpl:2026-27:provisional-v1",
    });

    expect(manifest.teams).toHaveLength(20);
    expect(manifest.fixtures[0]).toEqual(
      expect.objectContaining({
        key: "epl:2026-27:fixture:ars-cov",
        homeTeamKey: "epl:2026-27:team:ars",
      }),
    );
    expect(manifest.priceState).toBe("unpublished");
  });
});
