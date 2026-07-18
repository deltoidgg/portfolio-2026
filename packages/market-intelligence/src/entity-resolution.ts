import type { GameweekScope } from "./contracts.ts";

const premierLeagueAliases: Record<string, string> = {
  arsenal: "ARS",
  "aston villa": "AVL",
  bournemouth: "BOU",
  "afc bournemouth": "BOU",
  brentford: "BRE",
  brighton: "BHA",
  "brighton hove albion": "BHA",
  burnley: "BUR",
  chelsea: "CHE",
  coventry: "COV",
  "coventry city": "COV",
  "crystal palace": "CRY",
  everton: "EVE",
  fulham: "FUL",
  hull: "HUL",
  "hull city": "HUL",
  "ipswich town": "IPS",
  "leeds united": "LEE",
  "leicester city": "LEI",
  liverpool: "LIV",
  "manchester city": "MCI",
  "man city": "MCI",
  "manchester united": "MUN",
  "man united": "MUN",
  "man utd": "MUN",
  "newcastle united": "NEW",
  newcastle: "NEW",
  "nottingham forest": "NFO",
  "nottm forest": "NFO",
  southampton: "SOU",
  sunderland: "SUN",
  "tottenham hotspur": "TOT",
  tottenham: "TOT",
  spurs: "TOT",
  "west ham united": "WHU",
  "west ham": "WHU",
  "wolverhampton wanderers": "WOL",
  wolves: "WOL",
};

const canonicalTeams = new Set(Object.values(premierLeagueAliases));

function normaliseAlias(value: string): string {
  return value
    .normalize("NFKD")
    .replaceAll(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

export function resolvePremierLeagueTeam(value: string): string {
  const canonicalCandidate = value.trim().toLocaleUpperCase();
  if (canonicalTeams.has(canonicalCandidate)) return canonicalCandidate;
  const resolved = premierLeagueAliases[normaliseAlias(value)];
  if (!resolved) throw new Error(`Unknown EPL team alias: ${value}`);
  return resolved;
}

export function canonicalFixtureKey({
  competition,
  season,
  gameweek,
  homeTeam,
  awayTeam,
}: GameweekScope & { homeTeam: string; awayTeam: string }): string {
  const competitionKey = competition.toLocaleLowerCase().replaceAll(/[^a-z0-9]+/g, "-");
  const seasonKey = season.replaceAll(/[^0-9]+/g, "-").replaceAll(/^-|-$/g, "");
  const home = resolvePremierLeagueTeam(homeTeam).toLocaleLowerCase();
  const away = resolvePremierLeagueTeam(awayTeam).toLocaleLowerCase();
  return `${competitionKey}:${seasonKey}:gw${gameweek}:${home}-${away}`;
}

export function canonicalSeasonFixtureKey({
  competition,
  season,
  homeTeam,
  awayTeam,
}: Omit<GameweekScope, "gameweek"> & { homeTeam: string; awayTeam: string }): string {
  const competitionKey = competition.toLocaleLowerCase().replaceAll(/[^a-z0-9]+/g, "-");
  const seasonKey = season.replaceAll(/[^0-9]+/g, "-").replaceAll(/^-|-$/g, "");
  const home = resolvePremierLeagueTeam(homeTeam).toLocaleLowerCase();
  const away = resolvePremierLeagueTeam(awayTeam).toLocaleLowerCase();
  return `${competitionKey}:${seasonKey}:fixture:${home}-${away}`;
}
