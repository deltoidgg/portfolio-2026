import { Pool } from "@neondatabase/serverless";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import {
  annotationSchema,
  forecastSchema,
  sourceSchema,
  type Annotation,
  type CaptureBatch,
  type Fixture,
  type GameweekScope,
} from "../contracts.ts";
import { projectDeadlineRoom } from "../deadline-room.ts";
import {
  opportunityMapQuerySchema,
  opportunitySnapshotSchema,
  projectOpportunityMap,
  type OpportunityMap,
} from "../opportunity-map.ts";
import { captureReceipt, type MarketIntelligenceStore } from "../store.ts";
import {
  annotations,
  captureBatches,
  captureScopes,
  entities,
  fixtures,
  forecasts,
  observations,
  rawSnapshots,
  sources,
  sourceEntityAliases,
  opportunitySnapshots,
} from "./schema.ts";
import * as schema from "./schema.ts";

function scopedCaptures(batch: CaptureBatch) {
  const scopes = new Map<string, GameweekScope>();
  for (const item of [...batch.fixtures, ...batch.forecasts]) {
    const key = `${item.competition}:${item.season}:${item.gameweek}`;
    scopes.set(key, {
      competition: item.competition,
      season: item.season,
      gameweek: item.gameweek,
    });
  }
  const datasetKey =
    typeof batch.metadata?.datasetKey === "string" ? batch.metadata.datasetKey : "live";
  return [...scopes.values()].map((scope) => ({ batchId: batch.id, datasetKey, ...scope }));
}

export type NeonMarketIntelligenceStore = MarketIntelligenceStore & {
  readLatestOpportunityMap(input: {
    datasetKey: string;
    seasonKey: string;
    horizon: 1 | 3 | 5;
  }): Promise<OpportunityMap | null>;
  close(): Promise<void>;
};

export function createNeonStore(connectionString: string): NeonMarketIntelligenceStore {
  if (!connectionString) throw new Error("DATABASE_URL is required for the Neon store");
  const pool = new Pool({ connectionString });
  const db = drizzle({ client: pool, schema });

  return {
    async saveBatch(batch) {
      return db.transaction(async (tx) => {
        await tx
          .insert(sources)
          .values({
            sourceKey: batch.source.key,
            label: batch.source.label,
            kind: batch.source.kind,
            metadata: batch.source.metadata ?? {},
            lastCapturedAt: batch.capturedAt,
          })
          .onConflictDoUpdate({
            target: sources.sourceKey,
            set: {
              label: batch.source.label,
              kind: batch.source.kind,
              metadata: batch.source.metadata ?? {},
              lastCapturedAt: sql`greatest(${sources.lastCapturedAt}, ${batch.capturedAt})`,
            },
          });

        const inserted = await tx
          .insert(captureBatches)
          .values({
            batchId: batch.id,
            sourceKey: batch.source.key,
            capturedAt: batch.capturedAt,
            fixtureCount: batch.fixtures.length,
            observationCount: batch.observations.length,
            forecastCount: batch.forecasts.length,
            annotationCount: batch.annotations.length,
            metadata: batch.metadata ?? {},
          })
          .onConflictDoNothing()
          .returning({ batchId: captureBatches.batchId });
        if (inserted.length === 0) return captureReceipt(batch, false);

        if ((batch.entities?.length ?? 0) > 0) {
          await tx
            .insert(entities)
            .values(
              (batch.entities ?? []).map((entity) => ({
                entityKey: entity.key,
                entityType: entity.type,
                name: entity.name,
                teamKey: entity.teamKey,
                metadata: entity.metadata ?? {},
              })),
            )
            .onConflictDoUpdate({
              target: entities.entityKey,
              set: {
                entityType: sql`excluded.entity_type`,
                name: sql`excluded.name`,
                teamKey: sql`excluded.team_key`,
                metadata: sql`excluded.metadata`,
              },
            });
        }

        if ((batch.entityAliases?.length ?? 0) > 0) {
          await tx
            .insert(sourceEntityAliases)
            .values(
              (batch.entityAliases ?? []).map((alias) => ({
                sourceKey: alias.sourceKey,
                sourceEntityKey: alias.sourceEntityKey,
                entityKey: alias.entityKey,
                matchMethod: alias.matchMethod,
                confidence: alias.confidence,
                effectiveFrom: alias.effectiveFrom,
                effectiveTo: alias.effectiveTo,
                seasonKey: alias.seasonKey,
                metadata: alias.metadata ?? {},
              })),
            )
            .onConflictDoUpdate({
              target: [
                sourceEntityAliases.sourceKey,
                sourceEntityAliases.sourceEntityKey,
                sourceEntityAliases.effectiveFrom,
              ],
              set: {
                entityKey: sql`excluded.entity_key`,
                matchMethod: sql`excluded.match_method`,
                confidence: sql`excluded.confidence`,
                effectiveTo: sql`excluded.effective_to`,
                seasonKey: sql`excluded.season_key`,
                metadata: sql`excluded.metadata`,
              },
            });
        }

        if (batch.fixtures.length > 0) {
          for (const fixture of batch.fixtures) {
            await tx
              .insert(fixtures)
              .values({
                fixtureKey: fixture.key,
                competition: fixture.competition,
                season: fixture.season,
                gameweek: fixture.gameweek,
                homeTeam: fixture.homeTeam,
                awayTeam: fixture.awayTeam,
                kickoffAt: fixture.kickoffAt,
                deadlineAt: fixture.deadlineAt,
                metadata: fixture.metadata ?? {},
              })
              .onConflictDoUpdate({
                target: fixtures.fixtureKey,
                set: {
                  competition: fixture.competition,
                  season: fixture.season,
                  gameweek: fixture.gameweek,
                  homeTeam: fixture.homeTeam,
                  awayTeam: fixture.awayTeam,
                  kickoffAt: fixture.kickoffAt,
                  deadlineAt: fixture.deadlineAt,
                  metadata: sql`${fixtures.metadata} || excluded.metadata`,
                },
              });
          }
        }

        const scopes = scopedCaptures(batch);
        if (scopes.length > 0) {
          await tx.insert(captureScopes).values(scopes).onConflictDoNothing();
        }

        if (batch.rawSnapshots.length > 0) {
          await tx
            .insert(rawSnapshots)
            .values(
              batch.rawSnapshots.map((snapshot) => ({
                snapshotKey: snapshot.key,
                batchId: batch.id,
                sourceKey: batch.source.key,
                endpoint: snapshot.endpoint,
                observedAt: snapshot.observedAt,
                payload: snapshot.payload,
                statusCode: snapshot.statusCode,
                objectKey: snapshot.objectKey,
                sha256: snapshot.sha256,
                compressedBytes: snapshot.compressedBytes,
                uncompressedBytes: snapshot.uncompressedBytes,
                contentEncoding: snapshot.contentEncoding,
                contentType: snapshot.contentType,
                metadata: snapshot.metadata ?? {},
              })),
            )
            .onConflictDoNothing();
        }

        if (batch.observations.length > 0) {
          await tx
            .insert(observations)
            .values(
              batch.observations.map((observation) => ({
                observationKey: observation.key,
                batchId: batch.id,
                sourceKey: batch.source.key,
                fixtureKey: observation.fixtureKey,
                entityKey: observation.entityKey,
                metric: observation.metric,
                observedAt: observation.observedAt,
                publishedAt: observation.publishedAt,
                numericValue: observation.numericValue,
                stringValue: observation.stringValue,
                unit: observation.unit,
                marketFamily: observation.marketFamily,
                outcome: observation.outcome,
                metadata: observation.metadata ?? {},
              })),
            )
            .onConflictDoNothing();
        }

        if (batch.forecasts.length > 0) {
          await tx
            .insert(forecasts)
            .values(
              batch.forecasts.map((forecast) => ({
                forecastKey: `${batch.id}:${forecast.modelKey}:${forecast.playerKey}`,
                batchId: batch.id,
                modelKey: forecast.modelKey,
                playerKey: forecast.playerKey,
                playerName: forecast.playerName,
                teamKey: forecast.teamKey,
                position: forecast.position,
                competition: forecast.competition,
                season: forecast.season,
                gameweek: forecast.gameweek,
                observedAt: forecast.observedAt,
                deadlineAt: forecast.deadlineAt,
                expectedPoints: forecast.expectedPoints,
                p10: forecast.p10,
                p50: forecast.p50,
                p90: forecast.p90,
                rank: forecast.rank,
                components: forecast.components,
                evidence: forecast.evidence,
                metadata: forecast.metadata ?? {},
                datasetKey: forecast.datasetKey ?? "live",
                registrationKey: forecast.registrationKey,
                runId: forecast.runId,
                schemaVersion: forecast.schemaVersion ?? 1,
              })),
            )
            .onConflictDoNothing();
        }

        if (batch.annotations.length > 0) {
          await tx
            .insert(annotations)
            .values(
              batch.annotations.map((annotation) => ({
                annotationKey: annotation.key,
                batchId: batch.id,
                observedAt: annotation.observedAt,
                sourceKey: annotation.sourceKey,
                category: annotation.category,
                title: annotation.title,
                detail: annotation.detail,
                impact: annotation.impact,
                fixtureKey: annotation.fixtureKey,
                playerKey: annotation.playerKey,
                metadata: annotation.metadata ?? {},
              })),
            )
            .onConflictDoNothing();
        }

        return captureReceipt(batch, true);
      });
    },

    async readDeadlineRoom(query) {
      const whereRoom = and(
        eq(forecasts.competition, query.competition),
        eq(forecasts.season, query.season),
        eq(forecasts.gameweek, query.gameweek),
        eq(forecasts.datasetKey, query.datasetKey ?? "live"),
      );
      const [forecastRows, fixtureRows, sourceCaptureRows, annotationRows] = await Promise.all([
        db
          .select()
          .from(forecasts)
          .where(whereRoom)
          .orderBy(asc(forecasts.observedAt), asc(forecasts.rank)),
        db
          .select()
          .from(fixtures)
          .where(
            and(
              eq(fixtures.competition, query.competition),
              eq(fixtures.season, query.season),
              eq(fixtures.gameweek, query.gameweek),
            ),
          )
          .orderBy(asc(fixtures.kickoffAt)),
        db
          .select({
            sourceKey: sources.sourceKey,
            label: sources.label,
            kind: sources.kind,
            metadata: sources.metadata,
            capturedAt: captureBatches.capturedAt,
          })
          .from(captureScopes)
          .innerJoin(captureBatches, eq(captureScopes.batchId, captureBatches.batchId))
          .innerJoin(sources, eq(captureBatches.sourceKey, sources.sourceKey))
          .where(
            and(
              eq(captureScopes.competition, query.competition),
              eq(captureScopes.season, query.season),
              eq(captureScopes.gameweek, query.gameweek),
              eq(captureScopes.datasetKey, query.datasetKey ?? "live"),
            ),
          )
          .orderBy(asc(captureBatches.capturedAt)),
        db
          .select({ annotation: annotations })
          .from(captureScopes)
          .innerJoin(annotations, eq(captureScopes.batchId, annotations.batchId))
          .where(
            and(
              eq(captureScopes.competition, query.competition),
              eq(captureScopes.season, query.season),
              eq(captureScopes.gameweek, query.gameweek),
              eq(captureScopes.datasetKey, query.datasetKey ?? "live"),
            ),
          )
          .orderBy(asc(annotations.observedAt)),
      ]);
      if (forecastRows.length === 0) return null;

      const parsedForecasts = forecastRows.map((row) =>
        forecastSchema.parse({
          ...row,
          observedAt: new Date(row.observedAt).toISOString(),
          deadlineAt: new Date(row.deadlineAt).toISOString(),
        }),
      );
      const fixtureList: Fixture[] = fixtureRows.map((row) => ({
        key: row.fixtureKey,
        competition: row.competition,
        season: row.season,
        gameweek: row.gameweek,
        homeTeam: row.homeTeam,
        awayTeam: row.awayTeam,
        kickoffAt: new Date(row.kickoffAt).toISOString(),
        deadlineAt: new Date(row.deadlineAt).toISOString(),
        metadata: row.metadata,
      }));

      const sourceCaptures = sourceCaptureRows.map((row) => ({
        source: sourceSchema.parse({
          key: row.sourceKey,
          label: row.label,
          kind: row.kind,
          metadata: row.metadata,
        }),
        capturedAt: new Date(row.capturedAt).toISOString(),
      }));
      const parsedAnnotations: Annotation[] = annotationRows.map(({ annotation }) =>
        annotationSchema.parse({
          key: annotation.annotationKey,
          ...annotation,
          observedAt: new Date(annotation.observedAt).toISOString(),
        }),
      );

      return projectDeadlineRoom({
        query,
        dataMode: "neon",
        fixtures: fixtureList,
        forecasts: parsedForecasts,
        sourceCaptures,
        annotations: parsedAnnotations,
      });
    },

    async saveOpportunitySnapshot(snapshot) {
      const parsed = opportunitySnapshotSchema.parse(snapshot);
      await db
        .insert(opportunitySnapshots)
        .values({
          snapshotKey: parsed.key,
          datasetKey: parsed.datasetKey,
          seasonKey: parsed.season.key,
          fromGameweek: parsed.fromGameweek,
          horizon: parsed.horizon,
          observedAt: parsed.observedAt,
          payload: parsed,
        })
        .onConflictDoUpdate({
          target: opportunitySnapshots.snapshotKey,
          set: { payload: parsed, observedAt: parsed.observedAt },
        });
    },

    async readOpportunityMap(untrustedQuery) {
      const query = opportunityMapQuerySchema.parse(untrustedQuery);
      const filters = [
        eq(opportunitySnapshots.datasetKey, query.datasetKey),
        eq(opportunitySnapshots.seasonKey, query.seasonKey),
        eq(opportunitySnapshots.fromGameweek, query.fromGameweek),
        eq(opportunitySnapshots.horizon, query.horizon),
      ];
      if (query.snapshotAt) {
        filters.push(sql`${opportunitySnapshots.observedAt} <= ${query.snapshotAt}`);
      }
      const [row] = await db
        .select({ payload: opportunitySnapshots.payload })
        .from(opportunitySnapshots)
        .where(and(...filters))
        .orderBy(sql`${opportunitySnapshots.observedAt} desc`)
        .limit(1);
      return row ? projectOpportunityMap(opportunitySnapshotSchema.parse(row.payload)) : null;
    },

    async readLatestOpportunityMap(input) {
      const [row] = await db
        .select({ payload: opportunitySnapshots.payload })
        .from(opportunitySnapshots)
        .where(
          and(
            eq(opportunitySnapshots.datasetKey, input.datasetKey),
            eq(opportunitySnapshots.seasonKey, input.seasonKey),
            eq(opportunitySnapshots.horizon, input.horizon),
          ),
        )
        .orderBy(desc(opportunitySnapshots.observedAt))
        .limit(1);
      return row ? projectOpportunityMap(opportunitySnapshotSchema.parse(row.payload)) : null;
    },

    async close() {
      await pool.end();
    },
  };
}
