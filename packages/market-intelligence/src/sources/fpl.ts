import { z } from "zod";
import {
  jsonValueSchema,
  type CaptureBatch,
  type DeadlineRoomQuery,
  type JsonValue,
  type Observation,
} from "../contracts.ts";
import type { MarketSourceAdapter } from "../market-intelligence.ts";
import { canonicalFixtureKey } from "../entity-resolution.ts";

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
      web_name: z.string(),
      team: z.number().int().positive(),
      element_type: z.number().int().min(1).max(4),
      now_cost: z.number().int(),
      selected_by_percent: z.string(),
      status: z.string(),
      chance_of_playing_next_round: z.number().nullable().optional(),
      expected_goals: z.string(),
      expected_assists: z.string(),
      form: z.string(),
      ep_next: z.string(),
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
      const event = bootstrap.events.find((candidate) => candidate.id === request.gameweek);
      if (!event) throw new Error(`FPL gameweek ${request.gameweek} is not available`);
      const deadlineAt = asIso(event.deadline_time);
      const teamById = new Map(bootstrap.teams.map((team) => [team.id, team]));

      const observations = bootstrap.elements.flatMap((player): Observation[] => {
        const playerKey = `epl:player:${player.id}`;
        const team = teamById.get(player.team);
        const metadata = {
          playerName: player.web_name,
          teamKey: team?.short_name ?? `team:${player.team}`,
          position: ["GKP", "DEF", "MID", "FWD"][player.element_type - 1],
        };
        const values = [
          numericObservation(playerKey, capturedAt, "price", player.now_cost / 10, "gbp-million"),
          numericObservation(
            playerKey,
            capturedAt,
            "ownership",
            Number(player.selected_by_percent),
            "percent",
          ),
          numericObservation(
            playerKey,
            capturedAt,
            "availability_probability",
            (player.chance_of_playing_next_round ?? (player.status === "a" ? 100 : 0)) / 100,
            "probability",
          ),
          numericObservation(
            playerKey,
            capturedAt,
            "expected_goals",
            Number(player.expected_goals),
          ),
          numericObservation(
            playerKey,
            capturedAt,
            "expected_assists",
            Number(player.expected_assists),
          ),
          numericObservation(playerKey, capturedAt, "form", Number(player.form)),
          numericObservation(playerKey, capturedAt, "minutes", player.minutes, "minutes"),
          numericObservation(playerKey, capturedAt, "starts", player.starts, "matches"),
          numericObservation(
            playerKey,
            capturedAt,
            "expected_points_next",
            Number(player.ep_next),
            "fpl-points",
          ),
        ];
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
              key: canonicalFixtureKey({
                competition: "EPL",
                season: request.season,
                gameweek: request.gameweek,
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
            key: `epl:player:${player.id}`,
            type: "player" as const,
            name: player.web_name,
            teamKey: teamById.get(player.team)?.short_name ?? `team:${player.team}`,
            metadata: { fplElementId: player.id },
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
            sourceEntityKey: `player:${player.id}`,
            entityKey: `epl:player:${player.id}`,
            matchMethod: "provider-id" as const,
            confidence: 1,
            effectiveFrom: capturedAt,
          })),
        ],
        metadata: { deadlineAt },
      };
      return batch;
    },
  };
}
