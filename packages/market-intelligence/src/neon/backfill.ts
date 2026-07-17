import { neon } from "@neondatabase/serverless";
import { loadLocalEnvironment, requiredEnvironment } from "./load-env.ts";

loadLocalEnvironment();
const sql = neon(requiredEnvironment("DATABASE_URL"));

await sql.transaction([
  sql`INSERT INTO mi_rulesets (
        ruleset_key, season_key, version, status, scoring, checksum
      ) VALUES (
        'fpl:2025-26:official-v1', 'epl:2025-26', 'official-v1', 'official', '{}'::jsonb, 'legacy-2025-26'
      ) ON CONFLICT (ruleset_key) DO NOTHING`,
  sql`INSERT INTO mi_seasons (
        season_key, competition, label, starts_at, ends_at, lifecycle, price_state, ruleset_key
      ) VALUES (
        'epl:2025-26', 'EPL', '2025/26', '2025-08-15T00:00:00.000Z',
        '2026-05-24T23:59:59.000Z', 'archived', 'official', 'fpl:2025-26:official-v1'
      ) ON CONFLICT (season_key) DO NOTHING`,
  sql`INSERT INTO mi_datasets (dataset_key, season_key, kind, label, frozen_at)
      VALUES (
        'demo-2025-26-gw34-v1', 'epl:2025-26', 'demo', '2025/26 GW34 replay',
        '2026-04-24T17:30:00.000Z'
      ) ON CONFLICT (dataset_key) DO NOTHING`,
  sql`UPDATE mi_capture_scopes AS scope
      SET dataset_key = CASE
        WHEN batch.metadata->>'datasetKey' IS NOT NULL THEN batch.metadata->>'datasetKey'
        WHEN batch.metadata->>'synthetic' = 'true' OR batch.batch_id LIKE 'demo:%'
          THEN 'demo-2025-26-gw34-v1'
        ELSE 'live'
      END
      FROM mi_capture_batches AS batch
      WHERE scope.batch_id = batch.batch_id`,
  sql`UPDATE mi_forecasts AS forecast
      SET dataset_key = CASE
        WHEN batch.metadata->>'datasetKey' IS NOT NULL THEN batch.metadata->>'datasetKey'
        WHEN batch.metadata->>'synthetic' = 'true' OR batch.batch_id LIKE 'demo:%'
          THEN 'demo-2025-26-gw34-v1'
        ELSE 'live'
      END
      FROM mi_capture_batches AS batch
      WHERE forecast.batch_id = batch.batch_id`,
  sql`UPDATE mi_source_entity_aliases
      SET season_key = CASE
        WHEN entity_key LIKE 'epl:person:%' THEN COALESCE(metadata->>'seasonKey', season_key)
        ELSE season_key
      END
      WHERE season_key IS NULL`,
]);

console.log("Market intelligence legacy rows backfilled and demo data isolated.");
