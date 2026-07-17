import { z } from "zod";
import {
  jsonValueSchema,
  type CaptureBatch,
  type DeadlineRoomQuery,
  type Observation,
} from "../contracts.ts";
import type { MarketSourceAdapter } from "../market-intelligence.ts";
import { canonicalFixtureKey, resolvePremierLeagueTeam } from "../entity-resolution.ts";

const oddsResponseSchema = z.array(
  z.object({
    id: z.string().min(1),
    commence_time: z.string(),
    home_team: z.string(),
    away_team: z.string(),
    bookmakers: z.array(
      z.object({
        key: z.string(),
        title: z.string(),
        last_update: z.string(),
        markets: z.array(
          z.object({
            key: z.string(),
            last_update: z.string().optional(),
            outcomes: z.array(
              z.object({
                name: z.string(),
                description: z.string().optional(),
                price: z.number().positive(),
                point: z.number().optional(),
              }),
            ),
          }),
        ),
      }),
    ),
  }),
);

export type OddsApiCaptureRequest = Pick<DeadlineRoomQuery, "season" | "gameweek"> & {
  deadlineAt: string;
  capturedAt?: string;
  regions?: string[];
  markets?: string[];
};

export function createOddsApiSource({
  apiKey,
  fetcher = fetch,
}: {
  apiKey: string;
  fetcher?: typeof fetch;
}): MarketSourceAdapter<OddsApiCaptureRequest> {
  if (!apiKey) throw new Error("The Odds API key is required");

  return {
    key: "odds-api",
    async capture(request) {
      const capturedAt = request.capturedAt ?? new Date().toISOString();
      const regions = request.regions ?? ["uk", "eu"];
      const markets = request.markets ?? ["h2h", "totals"];
      const url = new URL("https://api.the-odds-api.com/v4/sports/soccer_epl/odds");
      url.searchParams.set("regions", regions.join(","));
      url.searchParams.set("markets", markets.join(","));
      url.searchParams.set("oddsFormat", "decimal");
      url.searchParams.set("apiKey", apiKey);
      const response = await fetcher(url, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`The Odds API capture failed: ${response.status}`);
      const payload = jsonValueSchema.parse(await response.json());
      const events = oddsResponseSchema.parse(payload);
      const canonicalEvents = events.map((event) => {
        const homeTeam = resolvePremierLeagueTeam(event.home_team);
        const awayTeam = resolvePremierLeagueTeam(event.away_team);
        return {
          ...event,
          homeTeam,
          awayTeam,
          fixtureKey: canonicalFixtureKey({
            competition: "EPL",
            season: request.season,
            gameweek: request.gameweek,
            homeTeam,
            awayTeam,
          }),
        };
      });

      const observations: Observation[] = canonicalEvents.flatMap((event) => {
        const { fixtureKey } = event;
        return event.bookmakers.flatMap((bookmaker) =>
          bookmaker.markets.flatMap((market) =>
            market.outcomes.map((outcome) => ({
              key: [
                fixtureKey,
                bookmaker.key,
                market.key,
                outcome.description ?? outcome.name,
                outcome.name,
                market.last_update ?? bookmaker.last_update,
              ].join(":"),
              fixtureKey,
              entityKey: `${fixtureKey}:market:${bookmaker.key}:${market.key}:${outcome.description ?? outcome.name}`,
              metric: "decimal_odds",
              observedAt: capturedAt,
              publishedAt: new Date(market.last_update ?? bookmaker.last_update).toISOString(),
              numericValue: outcome.price,
              marketFamily: market.key,
              outcome: outcome.name,
              metadata: {
                bookmakerKey: bookmaker.key,
                bookmakerName: bookmaker.title,
                ...(outcome.description === undefined ? {} : { description: outcome.description }),
                ...(outcome.point === undefined ? {} : { point: outcome.point }),
              },
            })),
          ),
        );
      });
      const teamEntities = new Map(
        canonicalEvents.flatMap((event) => [
          [event.homeTeam, { key: event.homeTeam, type: "team" as const, name: event.home_team }],
          [event.awayTeam, { key: event.awayTeam, type: "team" as const, name: event.away_team }],
        ]),
      );
      const teamAliases = new Map(
        canonicalEvents.flatMap((event) => [
          [
            event.home_team,
            {
              sourceKey: "odds-api",
              sourceEntityKey: `team-name:${event.home_team}`,
              entityKey: event.homeTeam,
              matchMethod: "deterministic-alias" as const,
              confidence: 1,
              effectiveFrom: capturedAt,
            },
          ],
          [
            event.away_team,
            {
              sourceKey: "odds-api",
              sourceEntityKey: `team-name:${event.away_team}`,
              entityKey: event.awayTeam,
              matchMethod: "deterministic-alias" as const,
              confidence: 1,
              effectiveFrom: capturedAt,
            },
          ],
        ]),
      );

      const safeEndpoint = new URL(url);
      safeEndpoint.searchParams.delete("apiKey");
      const batch: CaptureBatch = {
        id: `odds-api:${request.season}:${request.gameweek}:${capturedAt}`,
        source: {
          key: "odds-api",
          label: "The Odds API",
          kind: "aggregator",
          metadata: { regions, markets },
        },
        capturedAt,
        fixtures: canonicalEvents.map((event) => ({
          key: event.fixtureKey,
          competition: "EPL",
          season: request.season,
          gameweek: request.gameweek,
          homeTeam: event.homeTeam,
          awayTeam: event.awayTeam,
          kickoffAt: new Date(event.commence_time).toISOString(),
          deadlineAt: new Date(request.deadlineAt).toISOString(),
          metadata: { sourceFixtureId: event.id },
        })),
        rawSnapshots: [
          {
            key: `odds-api:epl:${capturedAt}`,
            endpoint: safeEndpoint.toString(),
            observedAt: capturedAt,
            payload,
            statusCode: response.status,
          },
        ],
        observations,
        forecasts: [],
        annotations: [],
        entities: [...teamEntities.values()],
        entityAliases: [...teamAliases.values()],
      };
      return batch;
    },
  };
}
