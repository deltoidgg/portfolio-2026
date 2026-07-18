import { Pool } from "@neondatabase/serverless";
import { and, desc, eq, inArray, like, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import type {
  AutomatedForecastBatch,
  AutomatedForecastAttempt,
  AutomatedForecastFixture,
  AutomatedForecastInput,
  AutomatedForecastObservation,
  AutomatedForecastRegistration,
} from "../auto-forecast.ts";
import type { FplPosition } from "../model/v2.ts";
import type { OpportunitySeasonContext } from "../opportunity-map.ts";
import type { JsonValue } from "../contracts.ts";
import {
  captureBatches,
  captureAttempts,
  fixtures,
  observations,
  opportunitySnapshots,
  playerRegistrations,
  seasons,
} from "./schema.ts";
import * as schema from "./schema.ts";

const collectedSources = ["premier-league-schedule", "fpl", "odds-api", "polymarket"] as const;

export type AutomatedForecastLoadRequest = {
  seasonKey: string;
  cutoffAt: string;
  horizon: 1 | 3 | 5;
  codeVersion: string;
};

export type NeonAutomatedForecastRepository = {
  load(request: AutomatedForecastLoadRequest): Promise<AutomatedForecastInput | null>;
  close(): Promise<void>;
};

function iso(value: string | Date): string {
  return new Date(value).toISOString();
}

export function createNeonAutomatedForecastRepository(
  connectionString: string,
): NeonAutomatedForecastRepository {
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const pool = new Pool({ connectionString });
  const db = drizzle({ client: pool, schema });

  return {
    async load(request) {
      const [season] = await db
        .select()
        .from(seasons)
        .where(eq(seasons.seasonKey, request.seasonKey))
        .limit(1);
      if (!season) return null;

      const [fixtureRows, registrationRows, batchRows, attemptRows, priorSnapshotRows] =
        await Promise.all([
          db
            .select()
            .from(fixtures)
            .where(
              and(
                eq(fixtures.season, season.label),
                sql`${fixtures.metadata}->>'seasonKey' = ${request.seasonKey}`,
              ),
            ),
          db
            .select()
            .from(playerRegistrations)
            .where(eq(playerRegistrations.seasonKey, request.seasonKey)),
          db
            .select()
            .from(captureBatches)
            .where(
              and(
                lte(captureBatches.capturedAt, request.cutoffAt),
                inArray(captureBatches.sourceKey, collectedSources),
                sql`${captureBatches.metadata}->>'seasonKey' = ${request.seasonKey}`,
              ),
            )
            .orderBy(desc(captureBatches.capturedAt)),
          db
            .select()
            .from(captureAttempts)
            .where(
              and(
                lte(captureAttempts.scheduledFor, request.cutoffAt),
                inArray(captureAttempts.sourceKey, collectedSources),
                like(captureAttempts.scopeKey, `${request.seasonKey}%`),
              ),
            )
            .orderBy(desc(captureAttempts.scheduledFor)),
          db
            .select({ payload: opportunitySnapshots.payload })
            .from(opportunitySnapshots)
            .where(
              and(
                eq(opportunitySnapshots.datasetKey, "live"),
                eq(opportunitySnapshots.seasonKey, request.seasonKey),
                eq(opportunitySnapshots.horizon, request.horizon),
                lte(opportunitySnapshots.observedAt, request.cutoffAt),
              ),
            )
            .orderBy(desc(opportunitySnapshots.observedAt))
            .limit(12),
        ]);

      const latestBatchBySource = new Map<string, (typeof batchRows)[number]>();
      for (const batch of batchRows) {
        if (!latestBatchBySource.has(batch.sourceKey)) {
          latestBatchBySource.set(batch.sourceKey, batch);
        }
      }
      const selectedBatches = [...latestBatchBySource.values()];
      const latestAttemptBySource = new Map<string, (typeof attemptRows)[number]>();
      for (const attempt of attemptRows) {
        if (!latestAttemptBySource.has(attempt.sourceKey)) {
          latestAttemptBySource.set(attempt.sourceKey, attempt);
        }
      }
      const selectedBatchIds = selectedBatches.map((batch) => batch.batchId);
      const observationRows =
        selectedBatchIds.length === 0
          ? []
          : await db
              .select()
              .from(observations)
              .where(inArray(observations.batchId, selectedBatchIds));

      const futureFixtures = fixtureRows
        .filter((fixture) => iso(fixture.deadlineAt) > request.cutoffAt)
        .toSorted(
          (left, right) => Date.parse(iso(left.deadlineAt)) - Date.parse(iso(right.deadlineAt)),
        );
      const fromGameweek = futureFixtures[0]?.gameweek;
      if (!fromGameweek) return null;

      const seasonContext: OpportunitySeasonContext = {
        key: season.seasonKey,
        label: season.label,
        lifecycle: season.lifecycle as OpportunitySeasonContext["lifecycle"],
        priceState: season.priceState as OpportunitySeasonContext["priceState"],
        rulesetKey: season.rulesetKey,
        rulesetStatus: season.rulesetKey.includes("provisional") ? "provisional" : "official",
      };
      const publishedAtByBatch = new Map<string, string>();
      for (const observation of observationRows) {
        if (!observation.publishedAt) continue;
        const publishedAt = iso(observation.publishedAt);
        const current = publishedAtByBatch.get(observation.batchId);
        if (!current || publishedAt > current) {
          publishedAtByBatch.set(observation.batchId, publishedAt);
        }
      }
      const batches: AutomatedForecastBatch[] = selectedBatches.map((batch) => ({
        id: batch.batchId,
        sourceKey: batch.sourceKey,
        capturedAt: iso(batch.capturedAt),
        ...(publishedAtByBatch.has(batch.batchId)
          ? { publishedAt: publishedAtByBatch.get(batch.batchId) }
          : {}),
      }));
      const attempts: AutomatedForecastAttempt[] = [...latestAttemptBySource.values()].map(
        (attempt) => ({
          sourceKey: attempt.sourceKey,
          scheduledFor: iso(attempt.scheduledFor),
          status: attempt.status as AutomatedForecastAttempt["status"],
          ...(attempt.error ? { error: attempt.error } : {}),
        }),
      );
      const seasonFixtures: AutomatedForecastFixture[] = fixtureRows.map((fixture) => ({
        key: fixture.fixtureKey,
        gameweek: fixture.gameweek,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        kickoffAt: iso(fixture.kickoffAt),
      }));
      const registrations: AutomatedForecastRegistration[] = registrationRows.flatMap(
        (registration) => {
          const team = registration.metadata.teamKey;
          if (
            typeof team !== "string" ||
            !["GKP", "DEF", "MID", "FWD"].includes(registration.position)
          ) {
            return [];
          }
          return [
            {
              registrationKey: registration.registrationKey,
              playerKey: registration.playerKey,
              name: registration.playerName,
              team,
              position: registration.position as FplPosition,
              status: registration.status as AutomatedForecastRegistration["status"],
            },
          ];
        },
      );
      const canonicalObservations: AutomatedForecastObservation[] = observationRows.map(
        (observation) => ({
          batchId: observation.batchId,
          sourceKey: observation.sourceKey,
          entityKey: observation.entityKey,
          ...(observation.fixtureKey ? { fixtureKey: observation.fixtureKey } : {}),
          metric: observation.metric,
          observedAt: iso(observation.observedAt),
          ...(observation.publishedAt ? { publishedAt: iso(observation.publishedAt) } : {}),
          ...(observation.numericValue === null ? {} : { numericValue: observation.numericValue }),
          ...(observation.marketFamily ? { marketFamily: observation.marketFamily } : {}),
          ...(observation.outcome ? { outcome: observation.outcome } : {}),
          metadata: observation.metadata as Record<string, JsonValue>,
        }),
      );
      const playerTrails = Object.fromEntries(
        registrationRows.map((registration) => [
          registration.registrationKey,
          priorSnapshotRows.toReversed().flatMap((snapshot) => {
            const player = snapshot.payload.players.find(
              (candidate) => candidate.registrationKey === registration.registrationKey,
            );
            return player ? player.trail.slice(-1) : [];
          }),
        ]),
      );

      return {
        datasetKey: "live",
        season: seasonContext,
        fromGameweek,
        horizon: request.horizon,
        cutoffAt: request.cutoffAt,
        codeVersion: request.codeVersion,
        batches,
        attempts,
        fixtures: seasonFixtures,
        registrations,
        observations: canonicalObservations,
        playerTrails,
      };
    },
    async close() {
      await pool.end();
    },
  };
}
