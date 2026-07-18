import { canonicalSeasonFixtureKey, resolvePremierLeagueTeam } from "./entity-resolution.ts";
import { seasonManifestSchema, type ParsedSeasonManifest } from "./season-domain.ts";

export const PREMIER_LEAGUE_2026_27_FIXTURES_URL =
  "https://www.premierleague.com/en/news/4675097/all-380-fixtures-for-202627-premier-league-season/";

type ParsedArticleFixture = {
  gameweek: number;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  deadlineAt: string;
};

const teamNames: Record<string, string> = {
  ARS: "Arsenal",
  AVL: "Aston Villa",
  BOU: "AFC Bournemouth",
  BRE: "Brentford",
  BHA: "Brighton & Hove Albion",
  CHE: "Chelsea",
  COV: "Coventry City",
  CRY: "Crystal Palace",
  EVE: "Everton",
  FUL: "Fulham",
  HUL: "Hull City",
  IPS: "Ipswich Town",
  LEE: "Leeds United",
  LIV: "Liverpool",
  MCI: "Manchester City",
  MUN: "Manchester United",
  NEW: "Newcastle United",
  NFO: "Nottingham Forest",
  SUN: "Sunderland",
  TOT: "Tottenham Hotspur",
};

const monthIndex: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

function decodeHtml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll(/<[^>]+>/g, "")
    .trim();
}

function lastSunday(year: number, month: number): number {
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  return lastDay.getUTCDate() - lastDay.getUTCDay();
}

function isBritishSummerTime(year: number, month: number, day: number): boolean {
  if (month > 2 && month < 9) return true;
  if (month === 2) return day >= lastSunday(year, 2);
  if (month === 9) return day < lastSunday(year, 9);
  return false;
}

function londonKickoffIso({
  year,
  month,
  day,
  hour,
  minute,
}: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}): string {
  const offsetHours = isBritishSummerTime(year, month, day) ? 1 : 0;
  return new Date(Date.UTC(year, month, day, hour - offsetHours, minute)).toISOString();
}

function fixtureLine(line: string): { homeTeam: string; awayTeam: string; time?: string } | null {
  if (/<em\b/i.test(line)) return null;
  const clean = decodeHtml(line)
    .replaceAll(/\*+$/g, "")
    .replaceAll(/\s+\([^)]*(?:Sports|TNT|Sky|Prime|BBC)[^)]*\)\s*$/gi, "")
    .replaceAll(/\*+$/g, "")
    .trim();
  const match = /^(?:(\d{1,2}:\d{2})\s+)?(.+?)\s+v\s+(.+)$/.exec(clean);
  if (!match) return null;
  return { time: match[1], homeTeam: match[2]!.trim(), awayTeam: match[3]!.trim() };
}

function articleDates(html: string, startYear: number) {
  const groups: Array<{
    year: number;
    month: number;
    day: number;
    weekday: string;
    lines: string[];
  }> = [];
  const paragraph =
    /<p[^>]*>\s*<strong>([^<]+)(?:<br\s*\/?>)?<\/strong>\s*(?:<br\s*\/?>)?(.*?)<\/p>/gis;
  for (const match of html.matchAll(paragraph)) {
    const heading = decodeHtml(match[1]!);
    const date =
      /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?$/.exec(
        heading,
      );
    if (!date) continue;
    const month = monthIndex[date[3]!.toLocaleLowerCase()];
    if (month === undefined) continue;
    const year = date[4] ? Number(date[4]) : month < 7 ? startYear + 1 : startYear;
    groups.push({
      year,
      month,
      day: Number(date[2]),
      weekday: date[1]!,
      lines: match[2]!.split(/<br\s*\/?>/gi),
    });
  }
  return groups;
}

export function parsePremierLeagueFixtureArticle(
  html: string,
  { startYear }: { startYear: number },
): ParsedArticleFixture[] {
  const kickoffs: Array<Omit<ParsedArticleFixture, "gameweek" | "deadlineAt">> = [];
  for (const group of articleDates(html, startYear)) {
    for (const rawLine of group.lines) {
      const fixture = fixtureLine(rawLine);
      if (!fixture) continue;
      const defaultTime =
        group.weekday === "Tuesday" || group.weekday === "Wednesday" ? "20:00" : "15:00";
      const [hour, minute] = (fixture.time ?? defaultTime).split(":").map(Number);
      kickoffs.push({
        homeTeam: resolvePremierLeagueTeam(fixture.homeTeam),
        awayTeam: resolvePremierLeagueTeam(fixture.awayTeam),
        kickoffAt: londonKickoffIso({
          year: group.year,
          month: group.month,
          day: group.day,
          hour: hour!,
          minute: minute!,
        }),
      });
    }
  }

  return kickoffs.map((fixture, index) => {
    const gameweek = Math.floor(index / 10) + 1;
    const round = kickoffs.slice((gameweek - 1) * 10, gameweek * 10);
    const firstKickoff = Math.min(...round.map((candidate) => Date.parse(candidate.kickoffAt)));
    return {
      ...fixture,
      gameweek,
      deadlineAt: new Date(firstKickoff - 90 * 60 * 1_000).toISOString(),
    };
  });
}

export function createPremierLeagueSeasonManifest({
  html,
  key,
  label,
  startsAt,
  endsAt,
  rulesetKey,
}: {
  html: string;
  key: string;
  label: string;
  startsAt: string;
  endsAt: string;
  rulesetKey: string;
}): ParsedSeasonManifest {
  const startYear = new Date(startsAt).getUTCFullYear();
  const fixtures = parsePremierLeagueFixtureArticle(html, { startYear });
  if (fixtures.length === 0 || fixtures.length % 10 !== 0) {
    throw new Error(
      `Official fixture article yielded ${fixtures.length} matches; expected full rounds`,
    );
  }
  const clubs = [...new Set(fixtures.flatMap((fixture) => [fixture.homeTeam, fixture.awayTeam]))];
  return seasonManifestSchema.parse({
    key,
    competition: "EPL",
    label,
    startsAt,
    endsAt,
    lifecycle: "prelaunch",
    priceState: "unpublished",
    rulesetKey,
    teams: clubs.toSorted().map((clubKey) => ({
      key: `${key}:team:${clubKey.toLocaleLowerCase()}`,
      clubKey,
      name: teamNames[clubKey] ?? clubKey,
      shortName: clubKey,
    })),
    fixtures: fixtures.map((fixture) => ({
      key: canonicalSeasonFixtureKey({
        competition: "EPL",
        season: label,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
      }),
      homeTeamKey: `${key}:team:${fixture.homeTeam.toLocaleLowerCase()}`,
      awayTeamKey: `${key}:team:${fixture.awayTeam.toLocaleLowerCase()}`,
      kickoffAt: fixture.kickoffAt,
      gameweek: fixture.gameweek,
      deadlineAt: fixture.deadlineAt,
    })),
  });
}
