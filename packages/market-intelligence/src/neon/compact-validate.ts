import { Pool } from "@neondatabase/serverless";
import {
  currentOpportunityManifestSchema,
  forecastBundleArtifactSchema,
  opportunityReplayArtifactSchema,
  publishedOpportunityBundleSchema,
} from "../hot-cold/artifacts.ts";
import { sha256Hex, type ArtifactObject } from "../hot-cold/artifact-store.ts";
import {
  createCutoverPrivateStore,
  createCutoverPublicStore,
  freezeAt,
  uncompressedBody,
} from "./cutover-r2.ts";
import { loadLocalEnvironment, requiredEnvironment } from "./load-env.ts";

type JsonRow = Record<string, unknown>;
type ArtifactReference = {
  key: string;
  contentSha256: string;
  objectSha256: string;
  compressedBytes: number;
  uncompressedBytes: number;
};
type RawReference = {
  key: string;
  sha256: string;
  compressedBytes: number;
  uncompressedBytes: number;
};
type ExportManifest = {
  schemaVersion: "legacy-export-manifest/v1";
  freezeAt: string;
  seasonKey: string;
  legacyFingerprint: string;
  counts: Record<string, number>;
  rawReferences: RawReference[];
  forecastArtifacts: ArtifactReference[];
  backfillArtifact: ArtifactReference;
};
type CompactBackfill = {
  schemaVersion: "compact-backfill/v1";
  seasonKey: string;
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
type Check = {
  name: string;
  ok: boolean;
  expected?: unknown;
  actual?: unknown;
  detail?: string;
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

function parseJson(object: ArtifactObject, label: string): unknown {
  try {
    return JSON.parse(
      new TextDecoder().decode(uncompressedBody(object.body, object.contentEncoding)),
    );
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

async function verifyReference(
  object: ArtifactObject | null,
  reference: ArtifactReference,
  label: string,
): Promise<unknown> {
  if (!object) throw new Error(`${label} ${reference.key} is missing`);
  const uncompressed = uncompressedBody(object.body, object.contentEncoding);
  if (
    object.body.byteLength !== reference.compressedBytes ||
    uncompressed.byteLength !== reference.uncompressedBytes ||
    (await sha256Hex(object.body)) !== reference.objectSha256 ||
    (await sha256Hex(uncompressed)) !== reference.contentSha256
  ) {
    throw new Error(`${label} ${reference.key} failed hash or byte-count verification`);
  }
  return parseJson(object, label);
}

function manifestKey(): string {
  return process.env.MI_IMPORT_MANIFEST_KEY ?? `legacy/v1/manifests/${freezeAt()}.json`;
}

function migrationUrl(): string {
  return (
    process.env.DATABASE_MIGRATION_URL ??
    process.env.NEXT_DATABASE_MIGRATION_URL ??
    requiredEnvironment("PRODUCTION_DATABASE_MIGRATION_URL")
  );
}

loadLocalEnvironment();
const privateStore = createCutoverPrivateStore();
const publicStore = createCutoverPublicStore();
const importManifestKey = manifestKey();
const manifestObject = await privateStore.get(importManifestKey);
if (!manifestObject) throw new Error(`Import manifest ${importManifestKey} is missing`);
const manifest = parseJson(manifestObject, "Legacy export manifest") as ExportManifest;
if (manifest.schemaVersion !== "legacy-export-manifest/v1") {
  throw new Error("Unsupported legacy export manifest");
}

const backfill = (await verifyReference(
  await privateStore.get(manifest.backfillArtifact.key),
  manifest.backfillArtifact,
  "Compact backfill artifact",
)) as CompactBackfill;
if (backfill.schemaVersion !== "compact-backfill/v1" || backfill.seasonKey !== manifest.seasonKey) {
  throw new Error("Compact backfill artifact does not match the export manifest");
}

for (const reference of manifest.rawReferences) {
  const object = await privateStore.get(reference.key);
  if (!object) throw new Error(`Raw artifact ${reference.key} is missing`);
  const uncompressed = uncompressedBody(object.body, object.contentEncoding);
  if (
    object.body.byteLength !== reference.compressedBytes ||
    uncompressed.byteLength !== reference.uncompressedBytes ||
    (await sha256Hex(uncompressed)) !== reference.sha256
  ) {
    throw new Error(`Raw artifact ${reference.key} failed hash or byte-count verification`);
  }
}
for (const reference of manifest.forecastArtifacts) {
  const value = (await verifyReference(
    await privateStore.get(reference.key),
    reference,
    "Legacy forecast artifact",
  )) as { schemaVersion?: string };
  if (value.schemaVersion !== "legacy-forecast-export/v1") {
    throw new Error(`Legacy forecast artifact ${reference.key} has an unsupported schema`);
  }
}

const checks: Check[] = [];
const pool = new Pool({ connectionString: migrationUrl() });
let databaseBytes = 0;
try {
  const marker = await pool.query<{ version: string }>(
    "select version from mi_schema_metadata where schema_key = 'storage'",
  );
  checks.push({
    name: "compact schema marker",
    ok: marker.rows[0]?.version === "compact-v1",
    expected: "compact-v1",
    actual: marker.rows[0]?.version,
  });

  for (const [key, table] of dimensionTables) {
    const count = await pool.query<{ count: string }>(
      `select count(*)::text as count from ${table}`,
    );
    const actual = Number(count.rows[0]?.count ?? 0);
    const expected = backfill.dimensions[key]?.length ?? 0;
    checks.push({ name: `dimension ${key}`, ok: actual === expected, expected, actual });
  }

  const compactCounts = await pool.query<{
    player_states: string;
    player_priors: string;
    fixture_markets: string;
    heads: string;
    results: string;
    evaluations: string;
    checkpoints: string;
    checkpoint_rows: string;
    imported_ledger: string;
  }>(
    `select
       (select count(*) from mi_player_state_current)::text as player_states,
       (select count(*) from mi_player_priors_current)::text as player_priors,
       (select count(*) from mi_fixture_market_state_current)::text as fixture_markets,
       (select count(*) from mi_source_heads)::text as heads,
       (select count(*) from mi_player_gameweek_results where status = 'final')::text as results,
       (select count(*) from mi_evaluation_runs)::text as evaluations,
       (select count(*) from mi_deadline_forecast_checkpoints)::text as checkpoints,
       (select count(*) from mi_deadline_forecast_rows)::text as checkpoint_rows,
       (select count(*) from mi_capture_ledger
          where metadata->>'legacyAttempt' = 'true')::text as imported_ledger`,
  );
  const compact = compactCounts.rows[0]!;
  const expectedCounts = {
    player_states: backfill.playerStates.length,
    player_priors: backfill.playerPriors.length,
    fixture_markets: backfill.fixtureMarkets.length,
    heads: backfill.heads.length,
    results: backfill.results.filter((row) => row.status === "final").length,
    evaluations: backfill.evaluations.length,
    checkpoints: backfill.checkpoints.length,
    checkpoint_rows: backfill.checkpoints.reduce(
      (total, checkpoint) => total + checkpoint.rows.length,
      0,
    ),
    imported_ledger: backfill.ledger.length,
  };
  for (const [name, expected] of Object.entries(expectedCounts)) {
    const actual = Number(compact[name as keyof typeof compact]);
    checks.push({ name: `compact ${name}`, ok: actual === expected, expected, actual });
  }

  const forbidden = await pool.query<{
    heavy_rows: string;
    polymarket_heads: string;
    polymarket_sources: string;
    duplicate_fpl_ids: string;
  }>(
    `select
       (
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
       )::text as heavy_rows,
       (select count(*) from mi_source_heads where source_key ilike '%polymarket%')::text
         as polymarket_heads,
       (select count(*) from mi_sources where source_key ilike '%polymarket%')::text
         as polymarket_sources,
       (
         select count(*) from (
           select fpl_element_id from mi_player_registrations
           where season_key = $1 and fpl_element_id is not null
           group by fpl_element_id having count(*) > 1
         ) duplicates
       )::text as duplicate_fpl_ids`,
    [manifest.seasonKey],
  );
  for (const [name, actual] of Object.entries(forbidden.rows[0]!)) {
    checks.push({ name, ok: actual === "0", expected: 0, actual: Number(actual) });
  }

  const activeShape = await pool.query<{
    teams: string;
    fixtures: string;
    active_registrations: string;
    current_players: string;
    current_priors: string;
  }>(
    `select
       (select count(*) from mi_team_seasons where season_key = $1)::text as teams,
       (select count(*) from mi_fixtures where season_key = $1)::text as fixtures,
       (select count(*) from mi_player_registrations
          where season_key = $1 and status <> 'departed')::text as active_registrations,
       (select count(*) from mi_player_state_current where season_key = $1)::text as current_players,
       (select count(*) from mi_player_priors_current where season_key = $1)::text as current_priors`,
    [manifest.seasonKey],
  );
  const shape = activeShape.rows[0]!;
  checks.push(
    { name: "current teams", ok: shape.teams === "20", expected: 20, actual: Number(shape.teams) },
    {
      name: "season fixtures",
      ok: shape.fixtures === "380",
      expected: 380,
      actual: Number(shape.fixtures),
    },
    {
      name: "current player state coverage",
      ok: Number(shape.current_players) === Number(shape.active_registrations),
      expected: Number(shape.active_registrations),
      actual: Number(shape.current_players),
    },
    {
      name: "current prior ceiling",
      ok: Number(shape.current_priors) <= Number(shape.active_registrations),
      expected: `<=${shape.active_registrations}`,
      actual: Number(shape.current_priors),
    },
  );

  const imported = await pool.query<{ status: string; manifest_object_key: string }>(
    `select status, manifest_object_key from mi_import_manifests
     where import_key = $1`,
    [manifest.legacyFingerprint],
  );
  checks.push({
    name: "import manifest applied",
    ok:
      imported.rows[0]?.status === "applied" &&
      imported.rows[0]?.manifest_object_key === importManifestKey,
    expected: { status: "applied", manifestObjectKey: importManifestKey },
    actual: imported.rows[0],
  });

  const database = await pool.query<{ bytes: string }>(
    "select pg_database_size(current_database())::text as bytes",
  );
  databaseBytes = Number(database.rows[0]?.bytes ?? 0);
  const acceptanceBytes = Number(process.env.MI_DB_ACCEPTANCE_BYTES ?? 50 * 1024 * 1024);
  checks.push({
    name: "immediate database size",
    ok: databaseBytes <= acceptanceBytes,
    expected: `<=${acceptanceBytes}`,
    actual: databaseBytes,
  });
} finally {
  await pool.end();
}

const channel = process.env.MI_ARTIFACT_CHANNEL ?? "next";
if (channel !== "next" && channel !== "production") {
  throw new Error("MI_ARTIFACT_CHANNEL must be next or production");
}
const seasonSlug = process.env.MI_SEASON_SLUG ?? manifest.seasonKey.replace(":", "-");
const currentKey = `serving/v1/${channel}/${seasonSlug}/current.json`;
const currentObject = await publicStore.get(currentKey);
if (!currentObject) {
  checks.push({
    name: "public current manifest",
    ok: process.env.MI_REQUIRE_PUBLIC_ARTIFACT !== "true",
    detail: "Not published yet; set MI_REQUIRE_PUBLIC_ARTIFACT=true after the forced publication.",
  });
} else {
  const current = currentOpportunityManifestSchema.parse(
    parseJson(currentObject, "Current manifest"),
  );
  const bundle = await verifyReference(
    await publicStore.get(current.artifact.key),
    current.artifact,
    "Published opportunity bundle",
  );
  const parsedBundle = publishedOpportunityBundleSchema.parse(bundle);
  checks.push(
    {
      name: "public bundle compressed size",
      ok: current.artifact.compressedBytes <= 1.5 * 1024 * 1024,
      expected: "<=1572864",
      actual: current.artifact.compressedBytes,
    },
    {
      name: "public bundle uncompressed size",
      ok: current.artifact.uncompressedBytes <= 6 * 1024 * 1024,
      expected: "<=6291456",
      actual: current.artifact.uncompressedBytes,
    },
    {
      name: "official public prices",
      ok: parsedBundle.players.every((player) => player.price.status === "official"),
      expected: parsedBundle.players.length,
      actual: parsedBundle.players.filter((player) => player.price.status === "official").length,
    },
    {
      name: "public source health excludes Polymarket",
      ok: current.sourceHealth.every(
        (source) => !source.sourceKey.toLocaleLowerCase().includes("polymarket"),
      ),
      expected: 0,
      actual: current.sourceHealth.filter((source) =>
        source.sourceKey.toLocaleLowerCase().includes("polymarket"),
      ).length,
    },
  );
  const privateKey = `forecast/v1/${seasonSlug}/${current.runId}.json.gz`;
  const privateObject = await privateStore.get(privateKey);
  if (!privateObject) {
    checks.push({
      name: "current private forecast bundle",
      ok: false,
      detail: `${privateKey} is missing`,
    });
  } else {
    const privateBundle = forecastBundleArtifactSchema.parse(
      parseJson(privateObject, "Current private forecast bundle"),
    );
    checks.push({
      name: "current private forecast bundle",
      ok: privateBundle.runId === current.runId && privateBundle.seasonKey === current.seasonKey,
      expected: { runId: current.runId, seasonKey: current.seasonKey },
      actual: { runId: privateBundle.runId, seasonKey: privateBundle.seasonKey },
    });
  }
  if (current.replay) {
    const replay = await verifyReference(
      await publicStore.get(current.replay.key),
      current.replay,
      "Opportunity replay",
    );
    opportunityReplayArtifactSchema.parse(replay);
  }
  checks.push({
    name: "public current manifest",
    ok: current.seasonKey === manifest.seasonKey,
    expected: manifest.seasonKey,
    actual: current.seasonKey,
  });
}

const ok = checks.every((check) => check.ok);
console.log(
  JSON.stringify({
    schemaVersion: "compact-validation/v1",
    checkedAt: new Date().toISOString(),
    ok,
    manifestKey: importManifestKey,
    legacyFingerprint: manifest.legacyFingerprint,
    databaseBytes,
    artifacts: {
      raw: manifest.rawReferences.length,
      legacyForecasts: manifest.forecastArtifacts.length,
      backfill: 1,
      publicCurrent: Boolean(currentObject),
    },
    checks,
  }),
);
if (!ok) process.exitCode = 1;
