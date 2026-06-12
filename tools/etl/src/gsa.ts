/**
 * GSA Site Scanning pipeline.
 *
 * Usage (from tools/etl):
 *   node src/gsa.ts inspect          profile the raw snapshot (column semantics)
 *   node src/gsa.ts build            build artifacts from the existing raw CSV
 *   node src/gsa.ts build --fetch    re-download the snapshot first
 *
 * Outputs (single writer for all of these):
 *   data/processed/uswds_a11y.parquet           analysis-grade artifact
 *   data/summaries/uswds-a11y.json              figure-grade summary
 *   apps/research/public/data/uswds_a11y.parquet   web copy (DuckDB-WASM)
 *   apps/research/src/generated/uswds-a11y.json    web copy (build-time import)
 */

import { DuckDBInstance } from "@duckdb/node-api";
import {
  ARTIFACTS,
  GSA_PARQUET_COLUMNS,
  USWDS_BANDS,
  VIOLATION_CATEGORIES,
  uswdsA11ySummarySchema,
} from "datasets";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const SNAPSHOT_URL = "https://api.gsa.gov/technology/site-scanning/data/site-scanning-latest.csv";

const rawPath = path.join(REPO_ROOT, ARTIFACTS.gsa.raw);
const parquetPath = path.join(REPO_ROOT, ARTIFACTS.gsa.parquet);
const summaryPath = path.join(REPO_ROOT, ARTIFACTS.gsa.summary);
const webParquetPath = path.join(REPO_ROOT, ARTIFACTS.gsa.webParquet);
const webSummaryPath = path.join(REPO_ROOT, ARTIFACTS.gsa.webSummary);

function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value !== "") return Number(value);
  throw new Error(`Expected numeric value, got ${typeof value}: ${String(value)}`);
}

function str(value: unknown): string {
  if (typeof value === "string") return value;
  throw new Error(`Expected string value, got ${typeof value}: ${String(value)}`);
}

async function fetchSnapshot(): Promise<void> {
  console.log(`Downloading ${SNAPSHOT_URL} ...`);
  const response = await fetch(SNAPSHOT_URL);
  if (!response.ok) throw new Error(`Snapshot download failed: HTTP ${response.status}`);
  const body = Buffer.from(await response.arrayBuffer());
  await mkdir(path.dirname(rawPath), { recursive: true });
  await writeFile(rawPath, body);
  console.log(`Saved ${(body.byteLength / 1024 / 1024).toFixed(1)} MB to ${rawPath}`);
}

/**
 * Sample restrictions (mirrored in the pre-registration): live websites,
 * primary set only (filter = false), completed accessibility scan.
 */
const COMPLETED_SQL = `
  SELECT * FROM raw
  WHERE TRY_CAST(live AS BOOLEAN) = TRUE
    AND coalesce(TRY_CAST(filter AS BOOLEAN), FALSE) = FALSE
    AND lower(coalesce(accessibility_scan_status, '')) = 'completed'
`;

/**
 * `accessibility_violations` is a JSON object of per-category axe-core
 * violation counts (e.g. {"aria":2,"contrast":26}). A NULL payload on a
 * completed scan means no violations were detected in the tracked
 * categories, so it is coded as 0 (documented in the pre-registration).
 *
 * The snapshot ships every column as text; types are applied explicitly.
 */
function violationsFor(category: string): string {
  return `coalesce(TRY_CAST(json_extract_string(accessibility_violations, '$."${category}"') AS INTEGER), 0)`;
}

const TOTAL_VIOLATIONS_SQL = `coalesce(list_sum(list_transform(
  json_keys(accessibility_violations),
  k -> TRY_CAST(json_extract_string(accessibility_violations, '$."' || k || '"') AS INTEGER)
)), 0)`;

interface Connection {
  run(sql: string): Promise<unknown>;
  runAndReadAll(sql: string): Promise<{ getRowObjects(): Array<Record<string, unknown>> }>;
}

async function openConnection(): Promise<Connection> {
  if (!existsSync(rawPath)) {
    throw new Error(`Raw snapshot not found at ${rawPath}. Run with --fetch or run gsa:fetch.`);
  }
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();
  await connection.run(
    `CREATE VIEW raw AS SELECT * FROM read_csv('${rawPath}', all_varchar = true)`,
  );
  await connection.run(`CREATE VIEW completed AS ${COMPLETED_SQL}`);
  return connection;
}

async function rows(connection: Connection, sql: string): Promise<Array<Record<string, unknown>>> {
  const reader = await connection.runAndReadAll(sql);
  return reader.getRowObjects();
}

async function inspect(): Promise<void> {
  const connection = await openConnection();

  console.log("\n== Row counts ==");
  console.log(await rows(connection, "SELECT CAST(count(*) AS INTEGER) AS raw_rows FROM raw"));
  console.log(
    await rows(connection, "SELECT CAST(count(*) AS INTEGER) AS completed_rows FROM completed"),
  );

  console.log("\n== live / filter / accessibility_scan_status ==");
  console.log(
    await rows(
      connection,
      `SELECT live, filter, lower(accessibility_scan_status) AS a11y_status,
              CAST(count(*) AS INTEGER) AS n
       FROM raw GROUP BY 1, 2, 3 ORDER BY n DESC LIMIT 12`,
    ),
  );

  console.log("\n== total violations per site (completed scans) ==");
  console.log(
    await rows(
      connection,
      `WITH v AS (SELECT ${TOTAL_VIOLATIONS_SQL} AS total FROM completed)
       SELECT CAST(min(total) AS INTEGER) AS min,
              CAST(max(total) AS INTEGER) AS max,
              CAST(avg(total) AS DOUBLE) AS mean,
              CAST(median(total) AS DOUBLE) AS median,
              CAST(quantile_cont(total, 0.9) AS DOUBLE) AS p90,
              CAST(count(*) FILTER (total = 0) AS INTEGER) AS zero_sites
       FROM v`,
    ),
  );

  console.log("\n== uswds_count distribution (completed scans) ==");
  console.log(
    await rows(
      connection,
      `WITH u AS (SELECT coalesce(TRY_CAST(uswds_count AS INTEGER), 0) AS c FROM completed)
       SELECT CAST(min(c) AS INTEGER) AS min,
              CAST(quantile_cont(c, 0.25) AS DOUBLE) AS p25,
              CAST(median(c) AS DOUBLE) AS median,
              CAST(quantile_cont(c, 0.75) AS DOUBLE) AS p75,
              CAST(quantile_cont(c, 0.9) AS DOUBLE) AS p90,
              CAST(max(c) AS INTEGER) AS max
       FROM u`,
    ),
  );

  console.log("\n== uswds_semantic_version top values (completed scans) ==");
  console.log(
    await rows(
      connection,
      `SELECT coalesce(nullif(uswds_semantic_version, ''), '(none)') AS version,
              CAST(count(*) AS INTEGER) AS n
       FROM completed GROUP BY 1 ORDER BY n DESC LIMIT 15`,
    ),
  );

  console.log("\n== accessibility_violations JSON categories (completed scans) ==");
  console.log(
    await rows(
      connection,
      `SELECT k AS category,
              CAST(count(*) AS INTEGER) AS sites_with,
              CAST(sum(TRY_CAST(json_extract_string(accessibility_violations, '$."' || k || '"') AS INTEGER)) AS INTEGER) AS total_violations
       FROM completed, unnest(json_keys(accessibility_violations)) AS t(k)
       GROUP BY k ORDER BY sites_with DESC`,
    ),
  );

  console.log("\n== null vs empty violation payloads (completed scans) ==");
  console.log(
    await rows(
      connection,
      `SELECT CAST(count(*) FILTER (accessibility_violations = '{}') AS INTEGER) AS empty_object,
              CAST(count(*) FILTER (accessibility_violations IS NULL) AS INTEGER) AS nulls,
              CAST(count(*) AS INTEGER) AS total
       FROM completed`,
    ),
  );
}

async function build(): Promise<void> {
  const connection = await openConnection();

  const categoryColumns = VIOLATION_CATEGORIES.map(
    (category) => `${violationsFor(category.key)} AS ${category.column}`,
  ).join(",\n    ");

  await connection.run(`CREATE VIEW cleaned AS
    SELECT
      url,
      base_domain,
      agency,
      nullif(bureau, '') AS bureau,
      nullif(branch, '') AS branch,
      scan_date,
      coalesce(TRY_CAST(uswds_count AS INTEGER), 0) AS uswds_count,
      nullif(nullif(ltrim(uswds_semantic_version, 'v'), ''), '.') AS uswds_semantic_version,
      nullif(regexp_extract(ltrim(uswds_semantic_version, 'v'), '^([0-9]+)', 1), '') AS uswds_version_major,
      ${TOTAL_VIOLATIONS_SQL} AS violations_total,
      ${categoryColumns},
      TRY_CAST(dap AS BOOLEAN) AS dap,
      nullif(cms, '') AS cms,
      TRY_CAST(third_party_service_count AS INTEGER) AS third_party_service_count,
      TRY_CAST(https_enforced AS BOOLEAN) AS https_enforced,
      TRY_CAST(hsts AS BOOLEAN) AS hsts,
      TRY_CAST(viewport_meta_tag AS BOOLEAN) AS viewport_meta_tag,
      TRY_CAST(main_element_present AS BOOLEAN) AS main_element_present,
      nullif(language, '') AS language,
      TRY_CAST(cumulative_layout_shift AS DOUBLE) AS cumulative_layout_shift,
      TRY_CAST(largest_contentful_paint AS DOUBLE) AS largest_contentful_paint
    FROM completed
    WHERE nullif(agency, '') IS NOT NULL`);

  const totalSites = num(
    (await rows(connection, "SELECT CAST(count(*) AS INTEGER) AS n FROM raw"))[0]?.n,
  );
  const analysedSites = num(
    (await rows(connection, "SELECT CAST(count(*) AS INTEGER) AS n FROM cleaned"))[0]?.n,
  );
  const snapshotDate = str(
    (await rows(connection, "SELECT coalesce(max(scan_date), '') AS d FROM cleaned"))[0]?.d,
  );

  await mkdir(path.dirname(parquetPath), { recursive: true });
  await connection.run(
    `COPY (SELECT ${GSA_PARQUET_COLUMNS.join(", ")} FROM cleaned ORDER BY agency, url)
     TO '${parquetPath}' (FORMAT PARQUET, COMPRESSION ZSTD)`,
  );

  const bandCase = USWDS_BANDS.map((band) =>
    band.max === null
      ? `WHEN uswds_count >= ${band.min} THEN '${band.id}'`
      : `WHEN uswds_count BETWEEN ${band.min} AND ${band.max} THEN '${band.id}'`,
  ).join(" ");

  const bandRows = await rows(
    connection,
    `SELECT CASE ${bandCase} END AS band,
            CAST(count(*) AS INTEGER) AS sites,
            CAST(avg(violations_total) AS DOUBLE) AS mean_violations,
            CAST(median(violations_total) AS DOUBLE) AS median_violations,
            CAST(avg(CASE WHEN violations_total = 0 THEN 1.0 ELSE 0.0 END) AS DOUBLE) AS zero_share
     FROM cleaned GROUP BY 1`,
  );
  const bandStats = USWDS_BANDS.map((band, index) => {
    const row = bandRows.find((candidate) => candidate.band === band.id);
    return {
      band: band.id,
      label: band.label,
      order: index,
      sites: row ? num(row.sites) : 0,
      meanViolations: row ? num(row.mean_violations) : 0,
      medianViolations: row ? num(row.median_violations) : 0,
      zeroShare: row ? num(row.zero_share) : 0,
    };
  });

  const versionRows = await rows(
    connection,
    `SELECT coalesce(uswds_version_major, 'none') AS version,
            CAST(count(*) AS INTEGER) AS sites,
            CAST(avg(violations_total) AS DOUBLE) AS mean_violations,
            CAST(median(violations_total) AS DOUBLE) AS median_violations,
            CAST(avg(CASE WHEN violations_total = 0 THEN 1.0 ELSE 0.0 END) AS DOUBLE) AS zero_share
     FROM cleaned GROUP BY 1 HAVING count(*) >= 25 ORDER BY version`,
  );

  const likelyMin = USWDS_BANDS.find((band) => band.id === "likely")?.min ?? 50;
  const agencyRows = await rows(
    connection,
    `SELECT agency,
            CAST(count(*) AS INTEGER) AS sites,
            CAST(avg(CASE WHEN uswds_count >= ${likelyMin} THEN 1.0 ELSE 0.0 END) AS DOUBLE) AS uswds_share,
            CAST(avg(violations_total) AS DOUBLE) AS mean_violations
     FROM cleaned GROUP BY agency HAVING count(*) >= 10 ORDER BY sites DESC LIMIT 30`,
  );

  const categoryRows = await rows(
    connection,
    `SELECT k AS category,
            CAST(count(*) AS INTEGER) AS sites_with,
            CAST(sum(TRY_CAST(json_extract_string(accessibility_violations, '$."' || k || '"') AS INTEGER)) AS INTEGER) AS total_violations
     FROM completed, unnest(json_keys(accessibility_violations)) AS t(k)
     WHERE nullif(agency, '') IS NOT NULL
     GROUP BY k ORDER BY sites_with DESC`,
  );

  const summary = uswdsA11ySummarySchema.parse({
    meta: {
      generatedAt: new Date().toISOString(),
      snapshotDate,
      source: SNAPSHOT_URL,
      totalSites,
      analysedSites,
    },
    bands: bandStats,
    versions: versionRows.map((row) => ({
      version: str(row.version),
      sites: num(row.sites),
      meanViolations: num(row.mean_violations),
      medianViolations: num(row.median_violations),
      zeroShare: num(row.zero_share),
    })),
    agencies: agencyRows.map((row) => ({
      agency: str(row.agency),
      sites: num(row.sites),
      uswdsShare: num(row.uswds_share),
      meanViolations: num(row.mean_violations),
    })),
    categories: categoryRows.map((row) => ({
      category: str(row.category),
      sitesWith: num(row.sites_with),
      totalViolations: num(row.total_violations),
    })),
  });

  const summaryJson = JSON.stringify(summary, null, 2);
  await mkdir(path.dirname(summaryPath), { recursive: true });
  await writeFile(summaryPath, `${summaryJson}\n`);

  await mkdir(path.dirname(webParquetPath), { recursive: true });
  await copyFile(parquetPath, webParquetPath);
  await mkdir(path.dirname(webSummaryPath), { recursive: true });
  await writeFile(webSummaryPath, `${summaryJson}\n`);

  console.log(`Snapshot date: ${snapshotDate}`);
  console.log(`Sites in raw snapshot: ${totalSites}; analysed: ${analysedSites}`);
  console.log(`Parquet:  ${parquetPath}`);
  console.log(`Summary:  ${summaryPath}`);
  console.log(`Web copies: ${webParquetPath}, ${webSummaryPath}`);
}

const [mode = "build", ...flags] = process.argv.slice(2);
if (flags.includes("--fetch")) await fetchSnapshot();
if (mode === "inspect") {
  await inspect();
} else if (mode === "build") {
  await build();
} else {
  throw new Error(`Unknown mode: ${mode} (expected "inspect" or "build")`);
}
