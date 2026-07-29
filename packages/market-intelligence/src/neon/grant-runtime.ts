import { Pool } from "@neondatabase/serverless";
import { loadLocalEnvironment, requiredEnvironment } from "./load-env.ts";

loadLocalEnvironment();
const connectionString = process.env.DATABASE_MIGRATION_URL ?? requiredEnvironment("DATABASE_URL");
const password = requiredEnvironment("COLLECTOR_ROLE_PASSWORD");
const pool = new Pool({ connectionString });

const runtimeTables = [
  "mi_sources",
  "mi_entities",
  "mi_datasets",
  "mi_seasons",
  "mi_rulesets",
  "mi_team_seasons",
  "mi_player_registrations",
  "mi_fixtures",
  "mi_fixture_gameweek_assignments",
  "mi_fixture_links",
  "mi_source_entity_aliases",
  "mi_source_heads",
  "mi_capture_ledger",
  "mi_player_state_current",
  "mi_player_priors_current",
  "mi_fixture_market_state_current",
  "mi_forecast_publications",
  "mi_serving_artifact_current",
  "mi_deadline_forecast_checkpoints",
  "mi_deadline_forecast_rows",
  "mi_player_gameweek_results",
  "mi_evaluation_runs",
] as const;

try {
  const marker = await pool.query(
    `select 1 from mi_schema_metadata
     where schema_key = 'storage' and version = 'compact-v1'`,
  );
  if (marker.rows.length !== 1) throw new Error("Runtime grants require the compact-v1 marker");
  await pool.query(`
    do $$
    begin
      if not exists (select 1 from pg_roles where rolname = 'fpl_collector') then
        create role fpl_collector login;
      end if;
    end $$;
  `);
  const passwordStatement = await pool.query<{ statement: string }>(
    "select format('alter role fpl_collector password %L', $1) as statement",
    [password],
  );
  await pool.query(passwordStatement.rows[0]!.statement);
  const databaseGrant = await pool.query<{ statement: string }>(
    "select format('grant connect on database %I to fpl_collector', current_database()) as statement",
  );
  await pool.query(databaseGrant.rows[0]!.statement);
  await pool.query("grant usage on schema public to fpl_collector");
  await pool.query("revoke create on schema public from public");
  await pool.query("revoke create on schema public from fpl_collector");
  await pool.query("grant select on table mi_schema_metadata to fpl_collector");
  await pool.query(
    `grant select, insert, update, delete on table ${runtimeTables.join(", ")}
     to fpl_collector`,
  );
  await pool.query("grant usage, select on all sequences in schema public to fpl_collector");
  console.log(
    JSON.stringify({
      role: "fpl_collector",
      tableCount: runtimeTables.length,
      ddl: false,
      note: "Rerun db:grant-runtime after migrations that add runtime tables.",
    }),
  );
} finally {
  await pool.end();
}
