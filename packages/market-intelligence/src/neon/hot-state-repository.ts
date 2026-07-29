import { Pool } from "@neondatabase/serverless";
import { and, eq, lt, lte, notInArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import type {
  CanonicalCaptureCommit,
  CollectionRepository,
  CollectionSlot,
  CurrentFixtureMarketState,
  CurrentPlayerPrior,
  CurrentPlayerState,
  ForecastInputRepository,
  SourceHead,
} from "../hot-cold/hot-state.ts";
import type { FplRuleset } from "../model/v2.ts";
import {
  captureLedger,
  fixtures,
  fixtureMarketStateCurrent,
  playerRegistrations,
  playerPriorsCurrent,
  playerStateCurrent,
  rulesets,
  seasons,
  sourceHeads,
  sources,
} from "./schema.ts";
import * as schema from "./schema.ts";

export type NeonHotStateRepository = CollectionRepository &
  ForecastInputRepository & {
    databaseSize(): Promise<number>;
    close(): Promise<void>;
  };

function expiresAt(value: string, days: number): string {
  return new Date(Date.parse(value) + days * 86_400_000).toISOString();
}

function sourceHead(row: typeof sourceHeads.$inferSelect): SourceHead {
  return {
    sourceKey: row.sourceKey,
    seasonKey: row.seasonKey,
    scopeKey: row.scopeKey,
    lastAttemptStatus: row.lastAttemptStatus as SourceHead["lastAttemptStatus"],
    lastAttemptAt: new Date(row.lastAttemptAt).toISOString(),
    ...(row.lastAttemptError ? { lastAttemptError: row.lastAttemptError } : {}),
    ...(row.lastSuccessfulBatchId ? { lastSuccessfulBatchId: row.lastSuccessfulBatchId } : {}),
    ...(row.lastSuccessfulCapturedAt
      ? { lastSuccessfulCapturedAt: new Date(row.lastSuccessfulCapturedAt).toISOString() }
      : {}),
    ...(row.captureHash ? { captureHash: row.captureHash } : {}),
    ...(row.modelInputHash ? { modelInputHash: row.modelInputHash } : {}),
    rawObjects: row.rawObjects,
    stateRowCount: row.stateRowCount,
    healthMetadata: row.healthMetadata,
  };
}

function playerState(row: typeof playerStateCurrent.$inferSelect): CurrentPlayerState {
  return {
    registrationKey: row.registrationKey,
    seasonKey: row.seasonKey,
    observedAt: new Date(row.observedAt).toISOString(),
    ...(row.price === null ? {} : { price: row.price }),
    ...(row.ownership === null ? {} : { ownership: row.ownership }),
    availabilityProbability: row.availabilityProbability,
    ...(row.chanceOfPlayingThisRound === null
      ? {}
      : { chanceOfPlayingThisRound: row.chanceOfPlayingThisRound }),
    minutes: row.minutes,
    starts: row.starts,
    ...(row.expectedGoals === null ? {} : { expectedGoals: row.expectedGoals }),
    ...(row.expectedAssists === null ? {} : { expectedAssists: row.expectedAssists }),
    ...(row.expectedGoalsPer90 === null ? {} : { expectedGoalsPer90: row.expectedGoalsPer90 }),
    ...(row.expectedAssistsPer90 === null
      ? {}
      : { expectedAssistsPer90: row.expectedAssistsPer90 }),
    ...(row.savesPer90 === null ? {} : { savesPer90: row.savesPer90 }),
    ...(row.defensiveContributionsPer90 === null
      ? {}
      : { defensiveContributionsPer90: row.defensiveContributionsPer90 }),
    ...(row.cardsPer90 === null ? {} : { cardsPer90: row.cardsPer90 }),
    ...(row.expectedPointsNext === null ? {} : { expectedPointsNext: row.expectedPointsNext }),
    ...(row.news === null ? {} : { news: row.news }),
    ...(row.newsAddedAt === null ? {} : { newsAddedAt: new Date(row.newsAddedAt).toISOString() }),
    rowHash: row.rowHash,
  };
}

function playerPrior(row: typeof playerPriorsCurrent.$inferSelect): CurrentPlayerPrior {
  return {
    registrationKey: row.registrationKey,
    seasonKey: row.seasonKey,
    observedAt: new Date(row.observedAt).toISOString(),
    weightedMinutes: row.weightedMinutes,
    goalsPer90: row.goalsPer90,
    assistsPer90: row.assistsPer90,
    sourceSeasons: row.sourceSeasons,
    calculationVersion: row.calculationVersion,
    ...(row.sourceArtifactKey && row.sourceArtifactHash
      ? {
          sourceArtifact: {
            key: row.sourceArtifactKey,
            sha256: row.sourceArtifactHash,
          },
        }
      : {}),
    rowHash: row.rowHash,
  };
}

function fixtureMarket(
  row: typeof fixtureMarketStateCurrent.$inferSelect,
): CurrentFixtureMarketState {
  return {
    sourceKey: row.sourceKey,
    fixtureKey: row.fixtureKey,
    seasonKey: row.seasonKey,
    observedAt: new Date(row.observedAt).toISOString(),
    homeGoalRate: row.homeGoalRate,
    awayGoalRate: row.awayGoalRate,
    marketCoverage: row.marketCoverage,
    sourceAgreement: row.sourceAgreement,
    bookmakerCount: row.bookmakerCount,
    projectionVersion: row.projectionVersion,
    rowHash: row.rowHash,
  };
}

function rowCount(capture: CanonicalCaptureCommit): number {
  return (
    capture.stateRowCount ??
    (capture.playerStates?.length ?? 0) +
      (capture.playerPriors?.length ?? 0) +
      (capture.fixtureMarkets?.length ?? 0)
  );
}

export function createNeonHotStateRepository(
  connectionString: string | Pool,
): NeonHotStateRepository {
  if (!connectionString) throw new Error("DATABASE_URL is required for the hot-state repository");
  const owned = typeof connectionString === "string";
  const pool = owned ? new Pool({ connectionString }) : connectionString;
  const db = drizzle({ client: pool, schema });

  return {
    async claim(slot: CollectionSlot) {
      return db.transaction(async (tx) => {
        await tx
          .insert(sources)
          .values({
            sourceKey: slot.sourceKey,
            label: slot.sourceKey,
            kind: "event-data",
            lastCapturedAt: slot.scheduledFor,
          })
          .onConflictDoNothing();
        const inserted = await tx
          .insert(captureLedger)
          .values({
            attemptKey: slot.attemptKey,
            sourceKey: slot.sourceKey,
            seasonKey: slot.seasonKey,
            scopeKey: slot.scopeKey,
            scheduledFor: slot.scheduledFor,
            status: "running",
            startedAt: slot.scheduledFor,
            expiresAt: expiresAt(slot.scheduledFor, 30),
          })
          .onConflictDoNothing()
          .returning({ attemptKey: captureLedger.attemptKey });
        if (inserted.length === 0) return false;
        await tx
          .insert(sourceHeads)
          .values({
            sourceKey: slot.sourceKey,
            seasonKey: slot.seasonKey,
            scopeKey: slot.scopeKey,
            lastAttemptStatus: "running",
            lastAttemptAt: slot.scheduledFor,
          })
          .onConflictDoUpdate({
            target: [sourceHeads.sourceKey, sourceHeads.seasonKey],
            set: {
              scopeKey: slot.scopeKey,
              lastAttemptStatus: "running",
              lastAttemptAt: slot.scheduledFor,
              lastAttemptError: null,
              updatedAt: slot.scheduledFor,
            },
            setWhere: lte(sourceHeads.lastAttemptAt, slot.scheduledFor),
          });
        return true;
      });
    },

    async commit(capture) {
      return db.transaction(async (tx) => {
        const [claimed] = await tx
          .select({ status: captureLedger.status })
          .from(captureLedger)
          .where(eq(captureLedger.attemptKey, capture.slot.attemptKey))
          .limit(1);
        if (!claimed) {
          throw new Error(`Collection slot ${capture.slot.attemptKey} was not claimed`);
        }
        const [previousHead] = await tx
          .select({
            lastAttemptAt: sourceHeads.lastAttemptAt,
            lastAttemptStatus: sourceHeads.lastAttemptStatus,
            lastSuccessfulCapturedAt: sourceHeads.lastSuccessfulCapturedAt,
            captureHash: sourceHeads.captureHash,
            modelInputHash: sourceHeads.modelInputHash,
            healthMetadata: sourceHeads.healthMetadata,
          })
          .from(sourceHeads)
          .where(
            and(
              eq(sourceHeads.sourceKey, capture.slot.sourceKey),
              eq(sourceHeads.seasonKey, capture.slot.seasonKey),
            ),
          )
          .limit(1);
        if (
          previousHead &&
          Date.parse(previousHead.lastAttemptAt) > Date.parse(capture.slot.scheduledFor)
        ) {
          await tx
            .update(captureLedger)
            .set({
              status: "skipped",
              finishedAt: capture.capturedAt,
              metadata: { lateWriteRejected: true },
              expiresAt: expiresAt(capture.capturedAt, 14),
            })
            .where(eq(captureLedger.attemptKey, capture.slot.attemptKey));
          return {
            attemptKey: capture.slot.attemptKey,
            batchId: capture.batchId,
            captureChanged: false,
            modelInputChanged: false,
            sourceHealthChanged: false,
            changedRows: { playerStates: 0, playerPriors: 0, fixtureMarkets: 0 },
          };
        }

        const playerRows =
          capture.playerStates?.length === 0 || !capture.playerStates
            ? []
            : await tx
                .insert(playerStateCurrent)
                .values(
                  capture.playerStates.map((state) => ({
                    ...state,
                    batchId: capture.batchId,
                  })),
                )
                .onConflictDoUpdate({
                  target: playerStateCurrent.registrationKey,
                  set: {
                    seasonKey: sql`excluded.season_key`,
                    observedAt: sql`excluded.observed_at`,
                    batchId: sql`excluded.batch_id`,
                    rowHash: sql`excluded.row_hash`,
                    price: sql`excluded.price`,
                    ownership: sql`excluded.ownership`,
                    availabilityProbability: sql`excluded.availability_probability`,
                    chanceOfPlayingThisRound: sql`excluded.chance_of_playing_this_round`,
                    minutes: sql`excluded.minutes`,
                    starts: sql`excluded.starts`,
                    expectedGoals: sql`excluded.expected_goals`,
                    expectedAssists: sql`excluded.expected_assists`,
                    expectedGoalsPer90: sql`excluded.expected_goals_per_90`,
                    expectedAssistsPer90: sql`excluded.expected_assists_per_90`,
                    savesPer90: sql`excluded.saves_per_90`,
                    defensiveContributionsPer90: sql`excluded.defensive_contributions_per_90`,
                    cardsPer90: sql`excluded.cards_per_90`,
                    expectedPointsNext: sql`excluded.expected_points_next`,
                    news: sql`excluded.news`,
                    newsAddedAt: sql`excluded.news_added_at`,
                    updatedAt: capture.capturedAt,
                  },
                  setWhere: and(
                    lte(playerStateCurrent.observedAt, capture.capturedAt),
                    sql`${playerStateCurrent.rowHash} <> excluded.row_hash`,
                  ),
                })
                .returning({ key: playerStateCurrent.registrationKey });

        const priorRows =
          capture.playerPriors?.length === 0 || !capture.playerPriors
            ? []
            : await tx
                .insert(playerPriorsCurrent)
                .values(
                  capture.playerPriors.map((prior) => ({
                    ...prior,
                    batchId: capture.batchId,
                    sourceArtifactKey: prior.sourceArtifact?.key ?? capture.rawObjects[0]?.key,
                    sourceArtifactHash:
                      prior.sourceArtifact?.sha256 ?? capture.rawObjects[0]?.sha256,
                  })),
                )
                .onConflictDoUpdate({
                  target: playerPriorsCurrent.registrationKey,
                  set: {
                    seasonKey: sql`excluded.season_key`,
                    observedAt: sql`excluded.observed_at`,
                    batchId: sql`excluded.batch_id`,
                    weightedMinutes: sql`excluded.weighted_minutes`,
                    goalsPer90: sql`excluded.goals_per_90`,
                    assistsPer90: sql`excluded.assists_per_90`,
                    sourceSeasons: sql`excluded.source_seasons`,
                    calculationVersion: sql`excluded.calculation_version`,
                    sourceArtifactKey: sql`excluded.source_artifact_key`,
                    sourceArtifactHash: sql`excluded.source_artifact_hash`,
                    rowHash: sql`excluded.row_hash`,
                    updatedAt: capture.capturedAt,
                  },
                  setWhere: and(
                    lte(playerPriorsCurrent.observedAt, capture.capturedAt),
                    sql`${playerPriorsCurrent.rowHash} <> excluded.row_hash`,
                  ),
                })
                .returning({ key: playerPriorsCurrent.registrationKey });

        const marketRows =
          capture.fixtureMarkets?.length === 0 || !capture.fixtureMarkets
            ? []
            : await tx
                .insert(fixtureMarketStateCurrent)
                .values(
                  capture.fixtureMarkets.map((market) => ({
                    ...market,
                    batchId: capture.batchId,
                    rawObjectKey: capture.rawObjects[0]?.key,
                    rawObjectHash: capture.rawObjects[0]?.sha256,
                  })),
                )
                .onConflictDoUpdate({
                  target: fixtureMarketStateCurrent.fixtureKey,
                  set: {
                    sourceKey: sql`excluded.source_key`,
                    seasonKey: sql`excluded.season_key`,
                    observedAt: sql`excluded.observed_at`,
                    batchId: sql`excluded.batch_id`,
                    homeGoalRate: sql`excluded.home_goal_rate`,
                    awayGoalRate: sql`excluded.away_goal_rate`,
                    marketCoverage: sql`excluded.market_coverage`,
                    sourceAgreement: sql`excluded.source_agreement`,
                    bookmakerCount: sql`excluded.bookmaker_count`,
                    projectionVersion: sql`excluded.projection_version`,
                    rawObjectKey: sql`excluded.raw_object_key`,
                    rawObjectHash: sql`excluded.raw_object_hash`,
                    rowHash: sql`excluded.row_hash`,
                    updatedAt: capture.capturedAt,
                  },
                  setWhere: and(
                    lte(fixtureMarketStateCurrent.observedAt, capture.capturedAt),
                    sql`${fixtureMarketStateCurrent.rowHash} <> excluded.row_hash`,
                  ),
                })
                .returning({ key: fixtureMarketStateCurrent.fixtureKey });
        const deletedMarketRows = capture.fixtureMarkets
          ? await tx
              .delete(fixtureMarketStateCurrent)
              .where(
                and(
                  eq(fixtureMarketStateCurrent.sourceKey, capture.slot.sourceKey),
                  eq(fixtureMarketStateCurrent.seasonKey, capture.slot.seasonKey),
                  ...(capture.fixtureMarkets.length > 0
                    ? [
                        notInArray(
                          fixtureMarketStateCurrent.fixtureKey,
                          capture.fixtureMarkets.map((market) => market.fixtureKey),
                        ),
                      ]
                    : []),
                ),
              )
              .returning({ key: fixtureMarketStateCurrent.fixtureKey })
          : [];

        await tx
          .update(captureLedger)
          .set({
            status: "succeeded",
            finishedAt: capture.capturedAt,
            batchId: capture.batchId,
            captureHash: capture.captureHash,
            modelInputHash: capture.modelInputHash,
            rawObjects: capture.rawObjects,
            stateRowCount: rowCount(capture),
            error: null,
            expiresAt: expiresAt(capture.capturedAt, 14),
          })
          .where(eq(captureLedger.attemptKey, capture.slot.attemptKey));
        await tx
          .insert(sourceHeads)
          .values({
            sourceKey: capture.slot.sourceKey,
            seasonKey: capture.slot.seasonKey,
            scopeKey: capture.slot.scopeKey,
            lastAttemptStatus: "succeeded",
            lastAttemptAt: capture.slot.scheduledFor,
            lastSuccessfulBatchId: capture.batchId,
            lastSuccessfulCapturedAt: capture.capturedAt,
            captureHash: capture.captureHash,
            modelInputHash: capture.modelInputHash,
            rawObjects: capture.rawObjects,
            stateRowCount: rowCount(capture),
            healthMetadata: capture.healthMetadata ?? {},
            updatedAt: capture.capturedAt,
          })
          .onConflictDoUpdate({
            target: [sourceHeads.sourceKey, sourceHeads.seasonKey],
            set: {
              scopeKey: capture.slot.scopeKey,
              lastAttemptStatus: "succeeded",
              lastAttemptAt: capture.slot.scheduledFor,
              lastAttemptError: null,
              lastSuccessfulBatchId: capture.batchId,
              lastSuccessfulCapturedAt: capture.capturedAt,
              captureHash: capture.captureHash,
              modelInputHash: capture.modelInputHash,
              rawObjects: capture.rawObjects,
              stateRowCount: rowCount(capture),
              healthMetadata: capture.healthMetadata ?? {},
              updatedAt: capture.capturedAt,
            },
            setWhere: lte(sourceHeads.lastAttemptAt, capture.slot.scheduledFor),
          });
        return {
          attemptKey: capture.slot.attemptKey,
          batchId: capture.batchId,
          captureChanged: previousHead?.captureHash !== capture.captureHash,
          modelInputChanged: previousHead?.modelInputHash !== capture.modelInputHash,
          sourceHealthChanged:
            previousHead?.lastAttemptStatus !== "succeeded" ||
            (previousHead?.lastSuccessfulCapturedAt
              ? new Date(previousHead.lastSuccessfulCapturedAt).toISOString()
              : undefined) !== capture.capturedAt ||
            JSON.stringify(previousHead?.healthMetadata ?? {}) !==
              JSON.stringify(capture.healthMetadata ?? {}),
          changedRows: {
            playerStates: playerRows.length,
            playerPriors: priorRows.length,
            fixtureMarkets: marketRows.length + deletedMarketRows.length,
          },
        };
      });
    },

    async fail(failure) {
      await db.transaction(async (tx) => {
        const [claimed] = await tx
          .select({ status: captureLedger.status })
          .from(captureLedger)
          .where(eq(captureLedger.attemptKey, failure.slot.attemptKey))
          .limit(1);
        if (!claimed) {
          throw new Error(`Collection slot ${failure.slot.attemptKey} was not claimed`);
        }
        const safeError = failure.error.slice(0, 1_000);
        await tx
          .update(captureLedger)
          .set({
            status: "failed",
            finishedAt: failure.finishedAt,
            error: safeError,
            expiresAt: expiresAt(failure.finishedAt, 30),
          })
          .where(eq(captureLedger.attemptKey, failure.slot.attemptKey));
        await tx
          .insert(sourceHeads)
          .values({
            sourceKey: failure.slot.sourceKey,
            seasonKey: failure.slot.seasonKey,
            scopeKey: failure.slot.scopeKey,
            lastAttemptStatus: "failed",
            lastAttemptAt: failure.slot.scheduledFor,
            lastAttemptError: safeError,
            updatedAt: failure.finishedAt,
          })
          .onConflictDoUpdate({
            target: [sourceHeads.sourceKey, sourceHeads.seasonKey],
            set: {
              scopeKey: failure.slot.scopeKey,
              lastAttemptStatus: "failed",
              lastAttemptAt: failure.slot.scheduledFor,
              lastAttemptError: safeError,
              updatedAt: failure.finishedAt,
            },
            setWhere: lte(sourceHeads.lastAttemptAt, failure.slot.scheduledFor),
          });
      });
    },

    async prune(now) {
      const expired = await db
        .delete(captureLedger)
        .where(lt(captureLedger.expiresAt, now))
        .returning({ status: captureLedger.status });
      return {
        succeededOrSkipped: expired.filter(
          (row) => row.status !== "failed" && row.status !== "partial",
        ).length,
        failedOrPartial: expired.filter(
          (row) => row.status === "failed" || row.status === "partial",
        ).length,
      };
    },

    async loadState(request) {
      const [
        heads,
        players,
        priors,
        markets,
        seasonRows,
        rulesetRows,
        fixtureRows,
        registrationRows,
      ] = await Promise.all([
        db
          .select()
          .from(sourceHeads)
          .where(
            and(
              eq(sourceHeads.seasonKey, request.seasonKey),
              lte(sourceHeads.lastAttemptAt, request.cutoffAt),
            ),
          ),
        db
          .select()
          .from(playerStateCurrent)
          .where(
            and(
              eq(playerStateCurrent.seasonKey, request.seasonKey),
              lte(playerStateCurrent.observedAt, request.cutoffAt),
            ),
          ),
        db
          .select()
          .from(playerPriorsCurrent)
          .where(
            and(
              eq(playerPriorsCurrent.seasonKey, request.seasonKey),
              lte(playerPriorsCurrent.observedAt, request.cutoffAt),
            ),
          ),
        db
          .select()
          .from(fixtureMarketStateCurrent)
          .where(
            and(
              eq(fixtureMarketStateCurrent.seasonKey, request.seasonKey),
              lte(fixtureMarketStateCurrent.observedAt, request.cutoffAt),
            ),
          ),
        db.select().from(seasons).where(eq(seasons.seasonKey, request.seasonKey)).limit(1),
        db.select().from(rulesets).where(eq(rulesets.seasonKey, request.seasonKey)),
        db.select().from(fixtures).where(eq(fixtures.seasonKey, request.seasonKey)),
        db
          .select()
          .from(playerRegistrations)
          .where(eq(playerRegistrations.seasonKey, request.seasonKey)),
      ]);
      if (
        heads.length === 0 &&
        players.length === 0 &&
        priors.length === 0 &&
        markets.length === 0
      ) {
        return null;
      }
      const activeRuleset = rulesetRows.find(
        (ruleset) => ruleset.rulesetKey === seasonRows[0]?.rulesetKey,
      );
      return {
        seasonKey: request.seasonKey,
        sourceHeads: heads.map(sourceHead),
        playerStates: players.map(playerState),
        playerPriors: priors.map(playerPrior),
        fixtureMarkets: markets.map(fixtureMarket),
        ...(activeRuleset?.scoring
          ? {
              ruleset: activeRuleset.scoring as unknown as FplRuleset,
            }
          : {}),
        ...(seasonRows[0]
          ? {
              season: {
                key: seasonRows[0].seasonKey,
                label: seasonRows[0].label,
                lifecycle: seasonRows[0].lifecycle as
                  | "planned"
                  | "prelaunch"
                  | "active"
                  | "complete"
                  | "archived",
                priceState: seasonRows[0].priceState as "unpublished" | "partial" | "official",
                rulesetKey: seasonRows[0].rulesetKey,
                rulesetStatus:
                  activeRuleset?.status === "provisional"
                    ? ("provisional" as const)
                    : ("official" as const),
              },
            }
          : {}),
        fixtures: fixtureRows.map((fixture) => ({
          key: fixture.fixtureKey,
          gameweek: fixture.gameweek,
          homeTeam: fixture.homeTeam,
          awayTeam: fixture.awayTeam,
          kickoffAt: new Date(fixture.kickoffAt).toISOString(),
          deadlineAt: new Date(fixture.deadlineAt).toISOString(),
          ...(typeof fixture.metadata.homeDifficulty === "number"
            ? { homeDifficulty: fixture.metadata.homeDifficulty }
            : {}),
          ...(typeof fixture.metadata.awayDifficulty === "number"
            ? { awayDifficulty: fixture.metadata.awayDifficulty }
            : {}),
        })),
        registrations: registrationRows.flatMap((registration) => {
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
              position: registration.position as "GKP" | "DEF" | "MID" | "FWD",
              status: registration.status as "provisional" | "active" | "departed" | "unresolved",
            },
          ];
        }),
      };
    },

    async databaseSize() {
      const result = await db.execute<{ bytes: string }>(
        sql`select pg_database_size(current_database())::text as bytes`,
      );
      return Number(result.rows[0]?.bytes ?? 0);
    },

    async close() {
      if (owned) await pool.end();
    },
  };
}
