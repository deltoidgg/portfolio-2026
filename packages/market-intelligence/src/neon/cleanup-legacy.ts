import { Pool } from "@neondatabase/serverless";
import { loadLocalEnvironment, requiredEnvironment } from "./load-env.ts";

loadLocalEnvironment();
if (process.env.MI_CONFIRM_CLEANUP_LEGACY !== "drop-empty-legacy-tables") {
  throw new Error(
    "Set MI_CONFIRM_CLEANUP_LEGACY=drop-empty-legacy-tables after the rollback window",
  );
}
const pool = new Pool({
  connectionString: process.env.DATABASE_MIGRATION_URL ?? requiredEnvironment("DATABASE_URL"),
});
const legacyTables = [
  "mi_capture_attempts",
  "mi_capture_scopes",
  "mi_raw_snapshots",
  "mi_observations",
  "mi_annotations",
  "mi_forecasts",
  "mi_model_run_inputs",
  "mi_player_fixture_forecasts",
  "mi_forecast_horizons",
  "mi_opportunity_snapshots",
  "mi_player_fixture_results",
  "mi_model_runs",
  "mi_capture_batches",
] as const;

try {
  const marker = await pool.query(
    `select 1 from mi_schema_metadata
     where schema_key = 'storage' and version = 'compact-v1'`,
  );
  if (marker.rows.length !== 1) {
    throw new Error("Refusing legacy cleanup without the compact-v1 marker");
  }
  for (const table of legacyTables) {
    const count = await pool.query<{ count: string }>(
      `select count(*)::text as count from ${table}`,
    );
    if (count.rows[0]?.count !== "0") {
      throw new Error(`Refusing to drop non-empty legacy table ${table}`);
    }
  }
  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const table of legacyTables) await client.query(`drop table ${table}`);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  console.log(JSON.stringify({ dropped: legacyTables, recoverableFrom: "migration + R2 export" }));
} finally {
  await pool.end();
}
