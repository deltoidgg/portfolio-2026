import { z } from "zod";
import {
  jsonValueSchema,
  type CaptureBatch,
  type DeadlineRoomQuery,
  type Observation,
} from "../contracts.ts";
import type { MarketSourceAdapter } from "../market-intelligence.ts";
import { canonicalFixtureKey, resolvePremierLeagueTeam } from "../entity-resolution.ts";
import {
  createFixtureReconciler,
  type SeasonCatalog,
  type SeasonFixture,
} from "../season-domain.ts";

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

export type SeasonAwareOddsApiCaptureRequest = {
  seasonKey: string;
  season: string;
  capturedAt?: string;
  regions?: string[];
  markets?: string[];
};

function oddsUrl(apiKey: string, regions: string[], markets: string[]): URL {
  const url = new URL("https://api.the-odds-api.com/v4/sports/soccer_epl/odds");
  url.searchParams.set("regions", regions.join(","));
  url.searchParams.set("markets", markets.join(","));
  url.searchParams.set("oddsFormat", "decimal");
  url.searchParams.set("apiKey", apiKey);
  return url;
}

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
      const url = oddsUrl(apiKey, regions, markets);
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

function observationsForEvent({
  event,
  fixtureKey,
  capturedAt,
}: {
  event: z.infer<typeof oddsResponseSchema>[number];
  fixtureKey: string;
  capturedAt: string;
}): Observation[] {
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
          sourceEventId: event.id,
          ...(outcome.description === undefined ? {} : { description: outcome.description }),
          ...(outcome.point === undefined ? {} : { point: outcome.point }),
        },
      })),
    ),
  );
}

/**
 * Captures every EPL event returned by the provider, then reconciles each one to the
 * season schedule. Gameweek is derived from the fixture assignment rather than from
 * whichever deadline triggered the collection job.
 */
export function createSeasonAwareOddsApiSource({
  apiKey,
  catalog,
  fetcher = fetch,
}: {
  apiKey: string;
  catalog: SeasonCatalog;
  fetcher?: typeof fetch;
}): MarketSourceAdapter<SeasonAwareOddsApiCaptureRequest> {
  if (!apiKey) throw new Error("The Odds API key is required");
  const reconciler = createFixtureReconciler(catalog);

  return {
    key: "odds-api",
    async capture(request) {
      const capturedAt = request.capturedAt ?? new Date().toISOString();
      const regions = request.regions ?? ["uk", "eu"];
      const markets = request.markets ?? ["h2h", "totals"];
      const url = oddsUrl(apiKey, regions, markets);
      const response = await fetcher(url, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`The Odds API capture failed: ${response.status}`);
      const payload = jsonValueSchema.parse(await response.json());
      const events = oddsResponseSchema.parse(payload);
      const reconciliation = await reconciler.reconcile(
        events.map((event) => ({
          sourceKey: "odds-api",
          sourceEventId: event.id,
          seasonKey: request.seasonKey,
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          kickoffAt: new Date(event.commence_time).toISOString(),
        })),
      );
      const eventById = new Map(events.map((event) => [event.id, event]));
      const seasonFixtures = await catalog.fixturesForSeason(request.seasonKey);
      const manifest = await catalog.season(request.seasonKey);
      const teamByKey = new Map(manifest?.teams.map((team) => [team.key, team]) ?? []);
      const fixtureByKey = new Map<string, SeasonFixture>(
        seasonFixtures.map((fixture) => [fixture.key, fixture]),
      );
      const fixtures = reconciliation.matched.flatMap((match) => {
        const fixture = fixtureByKey.get(match.fixtureKey);
        if (!fixture) return [];
        return [
          {
            key: fixture.key,
            competition: "EPL",
            season: request.season,
            gameweek: fixture.gameweek,
            homeTeam: teamByKey.get(fixture.homeTeamKey)?.shortName ?? fixture.homeTeamKey,
            awayTeam: teamByKey.get(fixture.awayTeamKey)?.shortName ?? fixture.awayTeamKey,
            kickoffAt: fixture.kickoffAt,
            deadlineAt: fixture.deadlineAt,
            metadata: { sourceFixtureId: match.sourceEventId, matchMethod: match.matchMethod },
          },
        ];
      });
      const observations = reconciliation.matched.flatMap((match) => {
        const event = eventById.get(match.sourceEventId);
        return event
          ? observationsForEvent({ event, fixtureKey: match.fixtureKey, capturedAt })
          : [];
      });
      const matchedEvents = reconciliation.matched.flatMap((match) => {
        const event = eventById.get(match.sourceEventId);
        return event ? [event] : [];
      });
      const teamEntities = new Map(
        fixtures.flatMap((fixture) => [
          [
            fixture.homeTeam,
            { key: fixture.homeTeam, type: "team" as const, name: fixture.homeTeam },
          ],
          [
            fixture.awayTeam,
            { key: fixture.awayTeam, type: "team" as const, name: fixture.awayTeam },
          ],
        ]),
      );
      const teamAliases = matchedEvents.flatMap((event) => {
        const match = reconciliation.matched.find(
          (candidate) => candidate.sourceEventId === event.id,
        );
        const fixture = match ? fixtureByKey.get(match.fixtureKey) : undefined;
        if (!fixture) return [];
        return [
          {
            sourceKey: "odds-api",
            sourceEntityKey: `team-name:${event.home_team}`,
            entityKey: teamByKey.get(fixture.homeTeamKey)?.shortName ?? fixture.homeTeamKey,
            matchMethod: "deterministic-alias" as const,
            confidence: 1,
            effectiveFrom: capturedAt,
            seasonKey: request.seasonKey,
          },
          {
            sourceKey: "odds-api",
            sourceEntityKey: `team-name:${event.away_team}`,
            entityKey: teamByKey.get(fixture.awayTeamKey)?.shortName ?? fixture.awayTeamKey,
            matchMethod: "deterministic-alias" as const,
            confidence: 1,
            effectiveFrom: capturedAt,
            seasonKey: request.seasonKey,
          },
        ];
      });
      const safeEndpoint = new URL(url);
      safeEndpoint.searchParams.delete("apiKey");

      return {
        id: `odds-api:${request.seasonKey}:${capturedAt}`,
        source: {
          key: "odds-api",
          label: "The Odds API",
          kind: "aggregator",
          metadata: { regions, markets },
        },
        capturedAt,
        fixtures,
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
        annotations: reconciliation.quarantined.map((event) => ({
          key: `odds-api:reconciliation:${request.seasonKey}:${event.sourceEventId}:${capturedAt}`,
          observedAt: capturedAt,
          sourceKey: "odds-api",
          category: "system" as const,
          title: "Fixture requires review",
          detail: `${event.homeTeam} v ${event.awayTeam} was ${event.status}.`,
          impact: 0,
          metadata: {
            sourceEventId: event.sourceEventId,
            candidateFixtureKeys: event.candidateFixtureKeys,
          },
        })),
        entities: [...teamEntities.values()],
        entityAliases: teamAliases,
        metadata: {
          datasetKey: "live",
          seasonKey: request.seasonKey,
          matchedEventCount: reconciliation.matched.length,
          quarantinedEventCount: reconciliation.quarantined.length,
        },
      } satisfies CaptureBatch;
    },
  };
}
