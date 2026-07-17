import { z } from "zod";
import {
  jsonValueSchema,
  type CaptureBatch,
  type DeadlineRoomQuery,
  type JsonValue,
  type Observation,
} from "../contracts.ts";
import type { MarketSourceAdapter } from "../market-intelligence.ts";
import { canonicalSeasonFixtureKey } from "../entity-resolution.ts";
import type { SeasonCatalog } from "../season-domain.ts";

const bootstrapSchema = z.object({
  events: z.array(
    z.object({
      id: z.number().int().positive(),
      deadline_time: z.string(),
    }),
  ),
  teams: z.array(
    z.object({
      id: z.number().int().positive(),
      name: z.string(),
      short_name: z.string(),
    }),
  ),
  elements: z.array(
    z.object({
      id: z.number().int().positive(),
      code: z.number().int().positive().optional(),
      opta_code: z.string().nullish(),
      first_name: z.string().optional(),
      second_name: z.string().optional(),
      web_name: z.string(),
      team: z.number().int().positive(),
      element_type: z.number().int().min(1).max(4),
      now_cost: z.number().int().nullish(),
      selected_by_percent: z.string().nullish(),
      status: z.string(),
      chance_of_playing_next_round: z.number().nullable().optional(),
      expected_goals: z.string().nullish(),
      expected_assists: z.string().nullish(),
      expected_goals_per_90: z.number().nonnegative().optional(),
      expected_assists_per_90: z.number().nonnegative().optional(),
      saves_per_90: z.number().nonnegative().optional(),
      defensive_contribution_per_90: z.number().nonnegative().optional(),
      yellow_cards: z.number().int().nonnegative().optional(),
      form: z.string().nullish(),
      ep_next: z.string().nullish(),
      minutes: z.number().int().nonnegative().default(0),
      starts: z.number().int().nonnegative().default(0),
    }),
  ),
});

const fixturesSchema = z.array(
  z.object({
    id: z.number().int().positive(),
    event: z.number().int().positive().nullable(),
    team_h: z.number().int().positive(),
    team_a: z.number().int().positive(),
    kickoff_time: z.string().nullable(),
    finished: z.boolean(),
  }),
);

export type FplCaptureRequest = Pick<DeadlineRoomQuery, "season" | "gameweek"> & {
  capturedAt?: string;
  seasonGuard?: {
    seasonKey: string;
    startsAt: string;
    endsAt: string;
    expectedTeams: string[];
  };
};

function asIso(value: string): string {
  return new Date(value).toISOString();
}

function numericObservation(
  playerKey: string,
  capturedAt: string,
  metric: string,
  numericValue: number,
  unit?: string,
): Observation {
  return {
    key: `${playerKey}:${metric}:${capturedAt}`,
    entityKey: playerKey,
    metric,
    observedAt: capturedAt,
    numericValue,
    unit,
  };
}

function seasonKey(season: string): string {
  return `epl:${season.replaceAll(/[^0-9]+/g, "-").replaceAll(/^-|-$/g, "")}`;
}

function durablePlayerKey(
  player: z.infer<typeof bootstrapSchema>["elements"][number],
  season: string,
) {
  if (player.opta_code) return `epl:person:opta:${player.opta_code.toLocaleLowerCase()}`;
  if (player.code) return `epl:person:fpl-code:${player.code}`;
  return `${seasonKey(season)}:person:provisional:fpl-${player.id}`;
}

function registrationKey(playerId: number, season: string): string {
  return `${seasonKey(season)}:registration:fpl-${playerId}`;
}

export async function registerFplBatchPlayers(
  catalog: SeasonCatalog,
  seasonKey: string,
  batch: CaptureBatch,
): Promise<void> {
  for (const entity of batch.entities ?? []) {
    if (entity.type !== "player") continue;
    const fplElementId = entity.metadata?.fplElementId;
    const position = entity.metadata?.position;
    if (
      typeof fplElementId !== "number" ||
      typeof position !== "string" ||
      !["GKP", "DEF", "MID", "FWD"].includes(position) ||
      !entity.teamKey
    ) {
      continue;
    }
    await catalog.registerPlayer({
      seasonKey,
      fplElementId,
      playerName: entity.name,
      teamKey: entity.teamKey,
      position: position as "GKP" | "DEF" | "MID" | "FWD",
      ...(typeof entity.metadata?.optaCode === "string"
        ? { optaCode: entity.metadata.optaCode }
        : {}),
      ...(typeof entity.metadata?.fplCode === "number" ? { fplCode: entity.metadata.fplCode } : {}),
      status: "active",
      confidence: 1,
    });
  }
}

function validateSeasonGuard(
  bootstrap: z.infer<typeof bootstrapSchema>,
  guard: NonNullable<FplCaptureRequest["seasonGuard"]>,
) {
  const startsAt = Date.parse(guard.startsAt);
  const endsAt = Date.parse(guard.endsAt);
  const deadlines = bootstrap.events.map((event) => Date.parse(event.deadline_time));
  const datesMatch = deadlines.some((deadline) => deadline >= startsAt && deadline <= endsAt);
  const availableTeams = new Set(bootstrap.teams.map((team) => team.short_name));
  const expectedMatches = guard.expectedTeams.filter((team) => availableTeams.has(team)).length;
  const teamsMatch =
    guard.expectedTeams.length === 0 || expectedMatches / guard.expectedTeams.length >= 0.8;
  if (!datesMatch || !teamsMatch) {
    throw new Error(`FPL bootstrap does not match ${guard.seasonKey}; capture quarantined`);
  }
}

async function getJson(fetcher: typeof fetch, url: string): Promise<JsonValue> {
  const response = await fetcher(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`FPL capture failed: ${response.status} ${url}`);
  return jsonValueSchema.parse(await response.json());
}

export function createFplSource({
  fetcher = fetch,
}: {
  fetcher?: typeof fetch;
} = {}): MarketSourceAdapter<FplCaptureRequest> {
  return {
    key: "fpl",
    async capture(request) {
      const capturedAt = request.capturedAt ?? new Date().toISOString();
      const bootstrapUrl = "https://fantasy.premierleague.com/api/bootstrap-static/";
      const fixturesUrl = "https://fantasy.premierleague.com/api/fixtures/";
      const [bootstrapPayload, fixturesPayload] = await Promise.all([
        getJson(fetcher, bootstrapUrl),
        getJson(fetcher, fixturesUrl),
      ]);
      const bootstrap = bootstrapSchema.parse(bootstrapPayload);
      const fixtures = fixturesSchema.parse(fixturesPayload);
      if (request.seasonGuard) validateSeasonGuard(bootstrap, request.seasonGuard);
      const event = bootstrap.events.find((candidate) => candidate.id === request.gameweek);
      if (!event) throw new Error(`FPL gameweek ${request.gameweek} is not available`);
      const deadlineAt = asIso(event.deadline_time);
      const teamById = new Map(bootstrap.teams.map((team) => [team.id, team]));

      const observations = bootstrap.elements.flatMap((player): Observation[] => {
        const playerKey = durablePlayerKey(player, request.season);
        const team = teamById.get(player.team);
        const metadata = {
          playerName:
            [player.first_name, player.second_name].filter(Boolean).join(" ") || player.web_name,
          teamKey: team?.short_name ?? `team:${player.team}`,
          position: ["GKP", "DEF", "MID", "FWD"][player.element_type - 1],
          registrationKey: registrationKey(player.id, request.season),
          fplElementId: player.id,
        };
        const values: Observation[] = [
          numericObservation(
            playerKey,
            capturedAt,
            "availability_probability",
            (player.chance_of_playing_next_round ?? (player.status === "a" ? 100 : 0)) / 100,
            "probability",
          ),
          numericObservation(playerKey, capturedAt, "minutes", player.minutes, "minutes"),
          numericObservation(playerKey, capturedAt, "starts", player.starts, "matches"),
        ];
        const optionalValues = [
          [
            "price",
            player.now_cost === null || player.now_cost === undefined
              ? undefined
              : player.now_cost / 10,
            "gbp-million",
          ],
          [
            "ownership",
            player.selected_by_percent == null ? undefined : Number(player.selected_by_percent),
            "percent",
          ],
          [
            "expected_goals",
            player.expected_goals == null ? undefined : Number(player.expected_goals),
          ],
          [
            "expected_assists",
            player.expected_assists == null ? undefined : Number(player.expected_assists),
          ],
          ["expected_goals_per_90", player.expected_goals_per_90],
          ["expected_assists_per_90", player.expected_assists_per_90],
          ["saves_per_90", player.saves_per_90],
          ["defensive_contributions_per_90", player.defensive_contribution_per_90],
          [
            "cards_per_90",
            player.minutes > 0 && player.yellow_cards !== undefined
              ? (player.yellow_cards * 90) / player.minutes
              : undefined,
          ],
          ["form", player.form == null ? undefined : Number(player.form)],
          [
            "expected_points_next",
            player.ep_next == null ? undefined : Number(player.ep_next),
            "fpl-points",
          ],
        ] as const;
        for (const [metric, numericValue, unit] of optionalValues) {
          if (numericValue !== undefined && Number.isFinite(numericValue)) {
            values.push(numericObservation(playerKey, capturedAt, metric, numericValue, unit));
          }
        }
        return values.map((observation) => ({ ...observation, metadata }));
      });

      const batch: CaptureBatch = {
        id: `fpl:${request.season}:${request.gameweek}:${capturedAt}`,
        source: {
          key: "fpl",
          label: "Fantasy Premier League",
          kind: "fpl",
          metadata: { captureMethod: "observable-json" },
        },
        capturedAt,
        fixtures: fixtures
          .filter(
            (fixture) =>
              fixture.event === request.gameweek &&
              fixture.kickoff_time &&
              teamById.has(fixture.team_h) &&
              teamById.has(fixture.team_a),
          )
          .map((fixture) => {
            const homeTeam = teamById.get(fixture.team_h)?.short_name ?? `team:${fixture.team_h}`;
            const awayTeam = teamById.get(fixture.team_a)?.short_name ?? `team:${fixture.team_a}`;
            return {
              key: canonicalSeasonFixtureKey({
                competition: "EPL",
                season: request.season,
                homeTeam,
                awayTeam,
              }),
              competition: "EPL",
              season: request.season,
              gameweek: request.gameweek,
              homeTeam,
              awayTeam,
              kickoffAt: asIso(fixture.kickoff_time ?? deadlineAt),
              deadlineAt,
              metadata: { finished: fixture.finished, sourceFixtureId: fixture.id },
            };
          }),
        rawSnapshots: [
          {
            key: `fpl:bootstrap:${capturedAt}`,
            endpoint: bootstrapUrl,
            observedAt: capturedAt,
            payload: bootstrapPayload,
            statusCode: 200,
          },
          {
            key: `fpl:fixtures:${capturedAt}`,
            endpoint: fixturesUrl,
            observedAt: capturedAt,
            payload: fixturesPayload,
            statusCode: 200,
          },
        ],
        observations,
        forecasts: [],
        annotations: [],
        entities: [
          ...bootstrap.teams.map((team) => ({
            key: team.short_name,
            type: "team" as const,
            name: team.name,
            metadata: { competition: "EPL" },
          })),
          ...bootstrap.elements.map((player) => ({
            key: durablePlayerKey(player, request.season),
            type: "player" as const,
            name:
              [player.first_name, player.second_name].filter(Boolean).join(" ") || player.web_name,
            teamKey: teamById.get(player.team)?.short_name ?? `team:${player.team}`,
            metadata: {
              fplElementId: player.id,
              ...(player.code === undefined ? {} : { fplCode: player.code }),
              ...(player.opta_code == null ? {} : { optaCode: player.opta_code }),
              position: ["GKP", "DEF", "MID", "FWD"][player.element_type - 1]!,
              registrationKey: registrationKey(player.id, request.season),
              seasonKey: seasonKey(request.season),
            },
          })),
        ],
        entityAliases: [
          ...bootstrap.teams.flatMap((team) => [
            {
              sourceKey: "fpl",
              sourceEntityKey: `team:${team.id}`,
              entityKey: team.short_name,
              matchMethod: "provider-id" as const,
              confidence: 1,
              effectiveFrom: capturedAt,
            },
            {
              sourceKey: "fpl",
              sourceEntityKey: `team-name:${team.name}`,
              entityKey: team.short_name,
              matchMethod: "deterministic-alias" as const,
              confidence: 1,
              effectiveFrom: capturedAt,
            },
          ]),
          ...bootstrap.elements.map((player) => ({
            sourceKey: "fpl",
            sourceEntityKey: `${seasonKey(request.season)}:player:${player.id}`,
            entityKey: durablePlayerKey(player, request.season),
            matchMethod: "provider-id" as const,
            confidence: 1,
            effectiveFrom: capturedAt,
            seasonKey: seasonKey(request.season),
          })),
        ],
        metadata: {
          datasetKey: "live",
          seasonKey: request.seasonGuard?.seasonKey ?? seasonKey(request.season),
          deadlineAt,
        },
      };
      return batch;
    },
  };
}
