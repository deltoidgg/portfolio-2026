import { gunzipSync } from "node:zlib";
import { Pool, type PoolClient } from "@neondatabase/serverless";
import { sha256Hex } from "../hot-cold/artifact-store.ts";
import { createCutoverPrivateStore, freezeAt } from "./cutover-r2.ts";
import { loadLocalEnvironment, requiredEnvironment } from "./load-env.ts";

type JsonRow = Record<string, unknown>;
type Backfill = {
  schemaVersion: "compact-backfill/v1";
  seasonKey: string;
  cutoffAt: string;
  dimensions: Record<string, JsonRow[]>;
  playerStates: JsonRow[];
  playerPriors: JsonRow[];
  fixtureMarkets: JsonRow[];
  heads: JsonRow[];
  ledger: JsonRow[];
  results: JsonRow[];
  evaluations: JsonRow[];
  checkpoints: Array<JsonRow & { rows: JsonRow[] }>;
};

const dimensionTables = [
  ["sources", "mi_sources"],
  ["entities", "mi_entities"],
  ["datasets", "mi_datasets"],
  ["seasons", "mi_seasons"],
  ["rulesets", "mi_rulesets"],
  ["teams", "mi_team_seasons"],
  ["registrations", "mi_player_registrations"],
  ["fixtures", "mi_fixtures"],
  ["assignments", "mi_fixture_gameweek_assignments"],
  ["fixtureLinks", "mi_fixture_links"],
  ["aliases", "mi_source_entity_aliases"],
] as const;

function identifier(value: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error(`Unsafe SQL identifier ${value}`);
  return `"${value}"`;
}

async function insertRow(client: PoolClient, table: string, input: JsonRow) {
  const entries = Object.entries(input).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return;
  const columns = entries.map(([column]) => identifier(column)).join(", ");
  const parameters = entries.map((_, index) => `$${index + 1}`).join(", ");
  await client.query(
    `insert into ${identifier(table)} (${columns}) values (${parameters}) on conflict do nothing`,
    entries.map(([, value]) =>
      value !== null && typeof value === "object" ? JSON.stringify(value) : value,
    ),
  );
}

function currentPlayerRow(row: JsonRow, batchId: string): JsonRow {
  return {
    registration_key: row.registrationKey,
    season_key: row.seasonKey,
    observed_at: row.observedAt,
    batch_id: batchId,
    row_hash: row.rowHash,
    price: row.price,
    ownership: row.ownership,
    availability_probability: row.availabilityProbability,
    chance_of_playing_this_round: row.chanceOfPlayingThisRound,
    minutes: row.minutes,
    starts: row.starts,
    expected_goals: row.expectedGoals,
    expected_assists: row.expectedAssists,
    expected_goals_per_90: row.expectedGoalsPer90,
    expected_assists_per_90: row.expectedAssistsPer90,
    saves_per_90: row.savesPer90,
    defensive_contributions_per_90: row.defensiveContributionsPer90,
    cards_per_90: row.cardsPer90,
    expected_points_next: row.expectedPointsNext,
    news: row.news,
    news_added_at: row.newsAddedAt,
  };
}

function priorRow(
  row: JsonRow,
  batchId: string,
  artifact?: { key?: unknown; sha256?: unknown },
): JsonRow {
  return {
    registration_key: row.registrationKey,
    season_key: row.seasonKey,
    observed_at: row.observedAt,
    batch_id: batchId,
    weighted_minutes: row.weightedMinutes,
    goals_per_90: row.goalsPer90,
    assists_per_90: row.assistsPer90,
    source_seasons: row.sourceSeasons,
    calculation_version: row.calculationVersion,
    source_artifact_key:
      (row.sourceArtifact as { key?: unknown } | undefined)?.key ?? artifact?.key,
    source_artifact_hash:
      (row.sourceArtifact as { sha256?: unknown } | undefined)?.sha256 ?? artifact?.sha256,
    row_hash: row.rowHash,
  };
}

function marketRow(
  row: JsonRow,
  batchId: string,
  artifact?: { key?: unknown; sha256?: unknown },
): JsonRow {
  return {
    source_key: row.sourceKey,
    fixture_key: row.fixtureKey,
    season_key: row.seasonKey,
    observed_at: row.observedAt,
    batch_id: batchId,
    home_goal_rate: row.homeGoalRate,
    away_goal_rate: row.awayGoalRate,
    market_coverage: row.marketCoverage,
    source_agreement: row.sourceAgreement,
    bookmaker_count: row.bookmakerCount,
    projection_version: row.projectionVersion,
    raw_object_key: artifact?.key,
    raw_object_hash: artifact?.sha256,
    row_hash: row.rowHash,
  };
}

function headRow(row: JsonRow): JsonRow {
  return {
    source_key: row.sourceKey,
    season_key: row.seasonKey,
    scope_key: row.scopeKey,
    last_attempt_status: row.lastAttemptStatus,
    last_attempt_at: row.lastAttemptAt,
    last_attempt_error: row.lastAttemptError,
    last_successful_batch_id: row.lastSuccessfulBatchId,
    last_successful_captured_at: row.lastSuccessfulCapturedAt,
    capture_hash: row.captureHash,
    model_input_hash: row.modelInputHash,
    raw_objects: row.rawObjects,
    state_row_count: row.stateRowCount,
    health_metadata: row.healthMetadata,
  };
}

loadLocalEnvironment();
const mode = process.argv.includes("--apply") ? "apply" : "dry-run";
if (process.argv.includes("--apply") && process.argv.includes("--dry-run")) {
  throw new Error("Choose either --dry-run or --apply");
}
const manifestKey = process.env.MI_IMPORT_MANIFEST_KEY ?? `legacy/v1/manifests/${freezeAt()}.json`;
const store = createCutoverPrivateStore();
const manifestObject = await store.get(manifestKey);
if (!manifestObject) throw new Error(`Import manifest ${manifestKey} is missing`);
const manifest = JSON.parse(new TextDecoder().decode(manifestObject.body)) as {
  schemaVersion: string;
  freezeAt: string;
  seasonKey: string;
  legacyFingerprint: string;
  counts: Record<string, number>;
  backfillArtifact: {
    key: string;
    contentSha256: string;
    objectSha256: string;
    compressedBytes: number;
    uncompressedBytes: number;
  };
};
if (manifest.schemaVersion !== "legacy-export-manifest/v1") {
  throw new Error("Unsupported legacy export manifest");
}
const backfillObject = await store.get(manifest.backfillArtifact.key);
if (!backfillObject)
  throw new Error(`Backfill artifact ${manifest.backfillArtifact.key} is missing`);
if (
  backfillObject.body.byteLength !== manifest.backfillArtifact.compressedBytes ||
  (await sha256Hex(backfillObject.body)) !== manifest.backfillArtifact.objectSha256
) {
  throw new Error("Compact backfill artifact failed compressed manifest verification");
}
const backfillBody = new Uint8Array(gunzipSync(backfillObject.body));
if (
  backfillBody.byteLength !== manifest.backfillArtifact.uncompressedBytes ||
  (await sha256Hex(backfillBody)) !== manifest.backfillArtifact.contentSha256
) {
  throw new Error("Compact backfill artifact failed manifest verification");
}
const backfill = JSON.parse(new TextDecoder().decode(backfillBody)) as Backfill;
if (backfill.schemaVersion !== "compact-backfill/v1") {
  throw new Error("Unsupported compact backfill payload");
}
if (backfill.seasonKey !== manifest.seasonKey) {
  throw new Error("Compact backfill season does not match the export manifest");
}

const pool = new Pool({
  connectionString:
    process.env.DATABASE_MIGRATION_URL ??
    process.env.NEXT_DATABASE_MIGRATION_URL ??
    requiredEnvironment("PRODUCTION_DATABASE_MIGRATION_URL"),
});
try {
  const marker = await pool.query(
    `select 1 from mi_schema_metadata
     where schema_key = 'storage' and version = 'compact-v1'`,
  );
  if (marker.rows.length !== 1) throw new Error("Backfill target is not compact-v1");
  const heavy = await pool.query<{ count: string }>(
    `select (
       (select count(*) from mi_capture_batches) +
       (select count(*) from mi_capture_scopes) +
       (select count(*) from mi_raw_snapshots) +
       (select count(*) from mi_observations) +
       (select count(*) from mi_annotations) +
       (select count(*) from mi_forecasts) +
       (select count(*) from mi_model_runs) +
       (select count(*) from mi_model_run_inputs) +
       (select count(*) from mi_player_fixture_forecasts) +
       (select count(*) from mi_forecast_horizons) +
       (select count(*) from mi_opportunity_snapshots) +
       (select count(*) from mi_player_fixture_results)
     )::text as count`,
  );
  if (heavy.rows[0]?.count !== "0") {
    throw new Error("Backfill target contains legacy heavy rows");
  }
  const report = {
    mode,
    manifestKey,
    legacyFingerprint: manifest.legacyFingerprint,
    seasonKey: backfill.seasonKey,
    counts: {
      ...manifest.counts,
      dimensions: Object.fromEntries(
        dimensionTables.map(([key]) => [key, backfill.dimensions[key]?.length ?? 0]),
      ),
      boundedLedger: backfill.ledger.length,
    },
  };
  if (mode === "dry-run") {
    console.log(JSON.stringify(report));
  } else {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const existing = await client.query(
        "select status from mi_import_manifests where import_key = $1",
        [manifest.legacyFingerprint],
      );
      if (existing.rows[0]?.status === "applied") {
        await client.query("rollback");
        console.log(JSON.stringify({ ...report, alreadyApplied: true }));
      } else {
        const artifactFor = (sourceKey: string) =>
          (
            backfill.heads.find((head) => head.sourceKey === sourceKey)?.rawObjects as
              | Array<{ key?: unknown; sha256?: unknown }>
              | undefined
          )?.[0];
        for (const [key, table] of dimensionTables) {
          for (const original of backfill.dimensions[key] ?? []) {
            const row = { ...original };
            if (key === "fixtures" && !row.season_key) {
              row.season_key =
                (row.metadata as { seasonKey?: string } | undefined)?.seasonKey ??
                backfill.seasonKey;
            }
            if (key === "rulesets") {
              row.ui_config ??= {};
              row.observed_at ??= row.published_at ?? row.created_at;
            }
            await insertRow(client, table, row);
          }
        }
        for (const row of backfill.playerStates) {
          await insertRow(
            client,
            "mi_player_state_current",
            currentPlayerRow(row, `legacy:${manifest.legacyFingerprint}:fpl`),
          );
        }
        for (const row of backfill.playerPriors) {
          await insertRow(
            client,
            "mi_player_priors_current",
            priorRow(
              row,
              `legacy:${manifest.legacyFingerprint}:priors`,
              artifactFor("fpl-element-summary"),
            ),
          );
        }
        for (const row of backfill.fixtureMarkets) {
          await insertRow(
            client,
            "mi_fixture_market_state_current",
            marketRow(row, `legacy:${manifest.legacyFingerprint}:odds`, artifactFor("odds-api")),
          );
        }
        for (const row of backfill.heads) {
          await insertRow(client, "mi_source_heads", headRow(row));
        }
        for (const attempt of backfill.ledger) {
          const status = String(attempt.status);
          const finishedAt = String(attempt.finished_at ?? attempt.scheduled_for);
          const days = status === "failed" || status === "partial" ? 30 : 14;
          await insertRow(client, "mi_capture_ledger", {
            attempt_key: attempt.attempt_key,
            source_key: attempt.source_key,
            season_key: backfill.seasonKey,
            scope_key: attempt.scope_key,
            scheduled_for: attempt.scheduled_for,
            status,
            started_at: attempt.started_at,
            finished_at: attempt.finished_at,
            batch_id: attempt.batch_id,
            error: attempt.error,
            raw_objects: [],
            state_row_count: 0,
            metadata: { legacyAttempt: true },
            expires_at: new Date(Date.parse(finishedAt) + days * 86_400_000).toISOString(),
          });
        }
        for (const result of backfill.results.filter((row) => row.status === "final")) {
          await insertRow(client, "mi_player_gameweek_results", result);
        }
        for (const evaluation of backfill.evaluations) {
          await insertRow(client, "mi_evaluation_runs", evaluation);
        }
        for (const checkpoint of backfill.checkpoints) {
          await insertRow(client, "mi_deadline_forecast_checkpoints", {
            season_key: checkpoint.seasonKey,
            gameweek: checkpoint.gameweek,
            deadline_at: checkpoint.deadlineAt,
            publication_id: checkpoint.publicationId,
            cutoff_at: checkpoint.cutoffAt,
            artifact_key: checkpoint.artifactKey,
            artifact_hash: checkpoint.artifactHash,
            row_count: checkpoint.rows.length,
          });
          for (const row of checkpoint.rows) {
            await insertRow(client, "mi_deadline_forecast_rows", {
              season_key: checkpoint.seasonKey,
              gameweek: checkpoint.gameweek,
              registration_key: row.registrationKey,
              expected_points: row.expectedPoints,
              p10: row.p10,
              p90: row.p90,
              haul_probability: row.haulProbability,
            });
          }
        }
        await client.query(
          `insert into mi_import_manifests
           (import_key, legacy_fingerprint, cutoff_at, manifest_object_key, manifest_hash, counts, status, applied_at)
           values ($1, $1, $2, $3, $4, $5, 'applied', now())
           on conflict (import_key) do update set status = 'applied', applied_at = now()`,
          [
            manifest.legacyFingerprint,
            backfill.cutoffAt,
            manifestKey,
            await sha256Hex(manifestObject.body),
            JSON.stringify(manifest.counts),
          ],
        );
        await client.query("commit");
        console.log(JSON.stringify({ ...report, applied: true }));
      }
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }
} finally {
  await pool.end();
}
