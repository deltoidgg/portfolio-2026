import { createHash } from "node:crypto";
import { Pool } from "@neondatabase/serverless";
import { and, asc, eq, isNull, max } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import type { JsonValue } from "../contracts.ts";
import type {
  EvaluationForecast,
  EvaluationResult,
  PlayerGameweekResult,
  ResultStore,
} from "../evaluation.ts";
import type { ForecastRunArtifact, FplPosition } from "../model/v2.ts";
import { opportunitySnapshotSchema } from "../opportunity-map.ts";
import type { ForecastRunStore } from "../run-store.ts";
import {
  evaluationRuns,
  fixtureGameweekAssignments,
  forecastHorizons,
  fixtures,
  modelRunInputs,
  modelRuns,
  opportunitySnapshots,
  playerFixtureForecasts,
  playerGameweekResults,
  playerRegistrations,
  seasons,
} from "./schema.ts";
import * as schema from "./schema.ts";

function connect(connectionString: string) {
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const pool = new Pool({ connectionString });
  return { pool, db: drizzle({ client: pool, schema }) };
}

function configHash(artifact: ForecastRunArtifact): string {
  return createHash("sha256").update(JSON.stringify(artifact)).digest("hex");
}

export type NeonForecastRunStore = ForecastRunStore & { close(): Promise<void> };

export function createNeonForecastRunStore(connectionString: string): NeonForecastRunStore {
  const { pool, db } = connect(connectionString);
  return {
    async save(artifact) {
      const hash = configHash(artifact);
      return db.transaction(async (tx) => {
        const [existing] = await tx
          .select({ hash: modelRuns.configHash })
          .from(modelRuns)
          .where(eq(modelRuns.runId, artifact.request.runId))
          .limit(1);
        if (existing) {
          if (existing.hash !== hash) {
            throw new Error(
              `Forecast run ${artifact.request.runId} is immutable and cannot be reused`,
            );
          }
          return { runId: artifact.request.runId, inserted: false };
        }
        await tx.insert(modelRuns).values({
          runId: artifact.request.runId,
          datasetKey: artifact.request.datasetKey,
          seasonKey: artifact.request.season.key,
          modelKey: artifact.request.modelKey,
          modelVersion: artifact.request.modelVersion,
          rulesetKey: artifact.request.season.rulesetKey,
          fromGameweek: artifact.request.fromGameweek,
          toGameweek: artifact.request.fromGameweek + artifact.request.horizon - 1,
          cutoffAt: artifact.request.cutoffAt,
          codeVersion: artifact.request.codeVersion,
          config: { request: artifact.request as unknown as JsonValue },
          configHash: hash,
          status: "succeeded",
        });
        if (artifact.request.inputBatches.length > 0) {
          await tx.insert(modelRunInputs).values(
            artifact.request.inputBatches.map((batch) => ({
              runId: artifact.request.runId,
              batchId: batch.id,
              role: batch.role,
            })),
          );
        }
        if (artifact.fixtureForecasts.length > 0) {
          await tx.insert(playerFixtureForecasts).values(
            artifact.fixtureForecasts.map((forecast) => ({
              runId: forecast.runId,
              fixtureKey: forecast.fixtureKey,
              registrationKey: forecast.registrationKey,
              expectedPoints: forecast.expectedPoints,
              distribution: forecast.distribution,
              components: forecast.components,
              marketCoverage: forecast.marketCoverage,
            })),
          );
        }
        if (artifact.snapshot.players.length > 0) {
          await tx.insert(forecastHorizons).values(
            artifact.snapshot.players.map((player) => ({
              runId: artifact.request.runId,
              registrationKey: player.registrationKey,
              fromGameweek: artifact.snapshot.fromGameweek,
              horizon: artifact.snapshot.horizon,
              expectedPoints: player.expectedPoints,
              p10: player.p10,
              p50: player.p50,
              p90: player.p90,
              haulProbability: player.haulProbability,
              sixtyMinuteProbability: player.sixtyMinuteProbability,
              marketCoverage: player.marketCoverage,
              sourceAgreement: player.sourceAgreement,
              gameweeks: player.gameweeks as unknown as JsonValue,
            })),
          );
        }
        await tx.insert(opportunitySnapshots).values({
          snapshotKey: artifact.snapshot.key,
          datasetKey: artifact.snapshot.datasetKey,
          seasonKey: artifact.snapshot.season.key,
          fromGameweek: artifact.snapshot.fromGameweek,
          horizon: artifact.snapshot.horizon,
          observedAt: artifact.snapshot.observedAt,
          payload: artifact.snapshot,
        });
        return { runId: artifact.request.runId, inserted: true };
      });
    },
    async read(runId) {
      const [run, snapshotRows, fixtureRows] = await Promise.all([
        db.select().from(modelRuns).where(eq(modelRuns.runId, runId)).limit(1),
        db
          .select({ payload: opportunitySnapshots.payload })
          .from(opportunitySnapshots)
          .where(eq(opportunitySnapshots.snapshotKey, runId))
          .limit(1),
        db.select().from(playerFixtureForecasts).where(eq(playerFixtureForecasts.runId, runId)),
      ]);
      const runRow = run[0];
      const snapshotRow = snapshotRows[0];
      if (!runRow || !snapshotRow) return null;
      const request = runRow.config.request as unknown as ForecastRunArtifact["request"];
      return {
        request,
        snapshot: opportunitySnapshotSchema.parse(snapshotRow.payload),
        fixtureForecasts: fixtureRows.map((row) => ({
          runId: row.runId,
          fixtureKey: row.fixtureKey,
          registrationKey: row.registrationKey,
          expectedPoints: row.expectedPoints,
          distribution: row.distribution,
          components: row.components,
          marketCoverage: row.marketCoverage,
        })),
      };
    },
    async close() {
      await pool.end();
    },
  };
}

export type NeonResultStore = ResultStore & {
  positions(seasonKey: string): Promise<Record<string, FplPosition>>;
  latestFinalGameweek(seasonKey: string): Promise<number | null>;
  close(): Promise<void>;
};

export function createNeonResultStore(connectionString: string): NeonResultStore {
  const { pool, db } = connect(connectionString);
  return {
    async save(results) {
      for (const result of results) {
        const [current] = await db
          .select({ status: playerGameweekResults.status })
          .from(playerGameweekResults)
          .where(eq(playerGameweekResults.resultKey, result.key))
          .limit(1);
        if (current?.status === "final" && result.status === "provisional") continue;
        await db
          .insert(playerGameweekResults)
          .values({
            resultKey: result.key,
            seasonKey: result.seasonKey,
            registrationKey: result.registrationKey,
            gameweek: result.gameweek,
            status: result.status,
            observedAt: result.observedAt,
            totalPoints: result.totalPoints,
            components: result.components,
          })
          .onConflictDoUpdate({
            target: playerGameweekResults.resultKey,
            set: {
              status: result.status,
              observedAt: result.observedAt,
              totalPoints: result.totalPoints,
              components: result.components,
            },
          });
      }
    },
    async list(seasonKey, gameweek) {
      const rows = await db
        .select()
        .from(playerGameweekResults)
        .where(
          and(
            eq(playerGameweekResults.seasonKey, seasonKey),
            eq(playerGameweekResults.gameweek, gameweek),
          ),
        )
        .orderBy(asc(playerGameweekResults.registrationKey));
      return rows.map(
        (row): PlayerGameweekResult => ({
          key: row.resultKey,
          seasonKey: row.seasonKey,
          registrationKey: row.registrationKey,
          gameweek: row.gameweek,
          status: row.status as PlayerGameweekResult["status"],
          observedAt: new Date(row.observedAt).toISOString(),
          totalPoints: row.totalPoints,
          components: {
            ...row.components,
            other: row.components.other ?? 0,
          },
        }),
      );
    },
    async positions(seasonKey) {
      const rows = await db
        .select({
          key: playerRegistrations.registrationKey,
          position: playerRegistrations.position,
        })
        .from(playerRegistrations)
        .where(eq(playerRegistrations.seasonKey, seasonKey));
      return Object.fromEntries(
        rows.flatMap((row) =>
          ["GKP", "DEF", "MID", "FWD"].includes(row.position)
            ? [[row.key, row.position as FplPosition]]
            : [],
        ),
      );
    },
    async latestFinalGameweek(seasonKey) {
      const [row] = await db
        .select({ gameweek: max(playerGameweekResults.gameweek) })
        .from(playerGameweekResults)
        .where(
          and(
            eq(playerGameweekResults.seasonKey, seasonKey),
            eq(playerGameweekResults.status, "final"),
          ),
        );
      return row?.gameweek ?? null;
    },
    async close() {
      await pool.end();
    },
  };
}

export type EvaluationRunInput = {
  key: string;
  seasonKey: string;
  gameweek: number;
  cutoffPolicy: string;
  result: EvaluationResult;
};

export type NeonEvaluationStore = {
  save(input: EvaluationRunInput): Promise<void>;
  forecasts(seasonKey: string, gameweek: number): Promise<EvaluationForecast[]>;
  close(): Promise<void>;
};

export function createNeonEvaluationStore(connectionString: string): NeonEvaluationStore {
  const { pool, db } = connect(connectionString);
  return {
    async save(input) {
      await db
        .insert(evaluationRuns)
        .values({
          evaluationKey: input.key,
          seasonKey: input.seasonKey,
          gameweek: input.gameweek,
          cutoffPolicy: input.cutoffPolicy,
          metrics: input.result.metrics,
          rowCount: input.result.rows.length,
        })
        .onConflictDoUpdate({
          target: evaluationRuns.evaluationKey,
          set: { metrics: input.result.metrics, rowCount: input.result.rows.length },
        });
    },
    async forecasts(seasonKey, gameweek) {
      const [seasonRow] = await db
        .select({ label: seasons.label })
        .from(seasons)
        .where(eq(seasons.seasonKey, seasonKey))
        .limit(1);
      if (!seasonRow) throw new Error(`Unknown season ${seasonKey}`);
      const deadlineRows = await db
        .select({ deadlineAt: fixtureGameweekAssignments.deadlineAt })
        .from(fixtureGameweekAssignments)
        .innerJoin(fixtures, eq(fixtures.fixtureKey, fixtureGameweekAssignments.fixtureKey))
        .where(
          and(
            eq(fixtures.season, seasonRow.label),
            eq(fixtureGameweekAssignments.gameweek, gameweek),
            isNull(fixtureGameweekAssignments.effectiveTo),
          ),
        );
      const deadlineAt = deadlineRows
        .map((row) => new Date(row.deadlineAt).toISOString())
        .toSorted()[0];
      if (!deadlineAt) throw new Error(`No deadline assignment for ${seasonKey} GW${gameweek}`);
      const rows = await db
        .select({ run: modelRuns, horizon: forecastHorizons })
        .from(forecastHorizons)
        .innerJoin(modelRuns, eq(forecastHorizons.runId, modelRuns.runId))
        .where(
          and(
            eq(modelRuns.seasonKey, seasonKey),
            eq(modelRuns.fromGameweek, gameweek),
            eq(forecastHorizons.horizon, 1),
          ),
        );
      return rows.map(({ run, horizon }) => ({
        runId: run.runId,
        seasonKey: run.seasonKey,
        registrationKey: horizon.registrationKey,
        gameweek,
        cutoffAt: new Date(run.cutoffAt).toISOString(),
        deadlineAt,
        expectedPoints: horizon.expectedPoints,
        p10: horizon.p10,
        p90: horizon.p90,
        haulProbability: horizon.haulProbability,
      }));
    },
    async close() {
      await pool.end();
    },
  };
}
