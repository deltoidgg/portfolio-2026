/**
 * UK public-sector scan pipeline (UK_SCAN_RECIPE.md §6 and §9).
 *
 * Usage (from tools/etl):
 *   node src/govuk.ts inspect [scan.jsonl]    profile the raw scan
 *   node src/govuk.ts build [scan.jsonl]      build artifacts from the raw JSONL
 *
 * Default input: newest data/raw/uk-scan/scan-*.jsonl.
 *
 * Outputs (single writer for all of these):
 *   data/processed/govuk_a11y.parquet              analysis-grade artifact
 *   data/summaries/govuk-a11y.json                 figure-grade summary
 *   apps/research/public/data/govuk_a11y.parquet   web copy (DuckDB-WASM)
 *   packages/datasets/artifacts/govuk-a11y.json    shared copy (build-time import via datasets/artifacts)
 */

import { DuckDBInstance } from "@duckdb/node-api";
import {
  ARTIFACTS,
  GOVUK_BANDS,
  GOVUK_ORG_TYPES,
  GOVUK_PARQUET_COLUMNS,
  VIOLATION_CATEGORIES,
  govukA11ySummarySchema,
} from "datasets";
import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../../..", import.meta.url));

const rawDir = path.join(REPO_ROOT, ARTIFACTS.govuk.raw);
const parquetPath = path.join(REPO_ROOT, ARTIFACTS.govuk.parquet);
const summaryPath = path.join(REPO_ROOT, ARTIFACTS.govuk.summary);
const webParquetPath = path.join(REPO_ROOT, ARTIFACTS.govuk.webParquet);
const sharedSummaryPath = path.join(REPO_ROOT, ARTIFACTS.govuk.sharedSummary);
const calibrationCsvPath = path.join(REPO_ROOT, "data/inputs/uk-domains/calibration.csv");

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

async function newestScanFile(): Promise<string> {
  const entries = await readdir(rawDir);
  const scans = entries.filter((name) => /^scan-.*\.jsonl$/.test(name)).sort();
  const newest = scans.at(-1);
  if (!newest) throw new Error(`No scan-*.jsonl found in ${rawDir}`);
  return path.join(rawDir, newest);
}

/** Explicit JSONL columns so DuckDB types are stable regardless of sampling. */
const RAW_COLUMNS: Record<string, string> = {
  hostname: "VARCHAR",
  url: "VARCHAR",
  orgName: "VARCHAR",
  orgType: "VARCHAR",
  source: "VARCHAR",
  nation: "VARCHAR",
  scannedAt: "VARCHAR",
  usedWwwFallback: "BOOLEAN",
  status: "VARCHAR",
  httpStatus: "INTEGER",
  finalUrl: "VARCHAR",
  finalHostname: "VARCHAR",
  redirectCount: "INTEGER",
  offsiteRedirect: "BOOLEAN",
  httpsEnforced: "BOOLEAN",
  hsts: "BOOLEAN",
  thirdPartyServiceCount: "INTEGER",
  viewportMetaTag: "BOOLEAN",
  mainElementPresent: "BOOLEAN",
  htmlLang: "VARCHAR",
  cmsGenerator: "VARCHAR",
  lcpMs: "DOUBLE",
  cls: "DOUBLE",
  axeVersion: "VARCHAR",
  violationsTotal: "INTEGER",
  violationCategories: "JSON",
  govukCount: "INTEGER",
  govukSemanticVersion: "VARCHAR",
  govukVersionMajor: "INTEGER",
};

interface Connection {
  run(sql: string): Promise<unknown>;
  runAndReadAll(sql: string): Promise<{ getRowObjects(): Array<Record<string, unknown>> }>;
}

async function openConnection(scanPath: string): Promise<Connection> {
  if (!existsSync(scanPath)) throw new Error(`Scan file not found: ${scanPath}`);
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();
  const columnsSpec = Object.entries(RAW_COLUMNS)
    .map(([name, type]) => `'${name}': '${type}'`)
    .join(", ");
  await connection.run(
    `CREATE VIEW raw AS SELECT * FROM read_json('${scanPath}',
       format = 'newline_delimited', columns = {${columnsSpec}})`,
  );

  // Calibration sites are excluded from the analysis sample regardless of scan content
  // (recipe §8); the scanner already skips them, this is defence in depth.
  const calibrationCsv = await readFile(calibrationCsvPath, "utf8");
  const calibrationHostnames = calibrationCsv
    .split("\n")
    .slice(1)
    .map((line) => line.split(",")[0]?.trim())
    .filter((hostname): hostname is string => Boolean(hostname))
    .map((hostname) => `'${hostname.replaceAll("'", "''")}'`)
    .join(", ");

  // Recipe §6: analysis sample = completed scans, one row per final hostname
  // (alphabetically-first initial domain wins).
  await connection.run(`CREATE VIEW completed AS
    SELECT * FROM (
      SELECT *,
             row_number() OVER (
               PARTITION BY lower(coalesce(finalHostname, hostname))
               ORDER BY hostname
             ) AS dedupe_rank
      FROM raw
      WHERE status = 'completed'
        AND hostname NOT IN (${calibrationHostnames})
    ) WHERE dedupe_rank = 1`);
  return connection;
}

async function rows(connection: Connection, sql: string): Promise<Array<Record<string, unknown>>> {
  const reader = await connection.runAndReadAll(sql);
  return reader.getRowObjects();
}

async function inspect(scanPath: string): Promise<void> {
  const connection = await openConnection(scanPath);

  console.log("\n== Parse check (first rows, raw) ==");
  console.log(
    await rows(
      connection,
      `SELECT hostname, status, govukCount, govukSemanticVersion, violationsTotal,
              CAST(coalesce(len(json_keys(violationCategories)), 0) AS INTEGER) AS category_keys
       FROM raw LIMIT 5`,
    ),
  );

  console.log("\n== Scan statuses ==");
  console.log(
    await rows(
      connection,
      `SELECT status, CAST(count(*) AS INTEGER) AS n FROM raw GROUP BY 1 ORDER BY n DESC`,
    ),
  );

  console.log("\n== Completed/deduped by org type ==");
  console.log(
    await rows(
      connection,
      `SELECT orgType, CAST(count(*) AS INTEGER) AS n,
              CAST(avg(CASE WHEN govukCount >= 50 THEN 1.0 ELSE 0.0 END) AS DOUBLE) AS strong_share,
              CAST(avg(violationsTotal) AS DOUBLE) AS mean_violations
       FROM completed GROUP BY 1 ORDER BY n DESC`,
    ),
  );

  console.log("\n== govuk_count distribution (completed) ==");
  console.log(
    await rows(
      connection,
      `SELECT CAST(min(govukCount) AS INTEGER) AS min,
              CAST(quantile_cont(govukCount, 0.25) AS DOUBLE) AS p25,
              CAST(median(govukCount) AS DOUBLE) AS median,
              CAST(quantile_cont(govukCount, 0.75) AS DOUBLE) AS p75,
              CAST(quantile_cont(govukCount, 0.9) AS DOUBLE) AS p90,
              CAST(max(govukCount) AS INTEGER) AS max
       FROM completed`,
    ),
  );

  console.log("\n== violations_total distribution (completed) ==");
  console.log(
    await rows(
      connection,
      `SELECT CAST(min(violationsTotal) AS INTEGER) AS min,
              CAST(avg(violationsTotal) AS DOUBLE) AS mean,
              CAST(median(violationsTotal) AS DOUBLE) AS median,
              CAST(quantile_cont(violationsTotal, 0.9) AS DOUBLE) AS p90,
              CAST(max(violationsTotal) AS INTEGER) AS max,
              CAST(count(*) FILTER (violationsTotal = 0) AS INTEGER) AS zero_sites
       FROM completed`,
    ),
  );

  console.log("\n== www fallback / offsite redirects (completed) ==");
  console.log(
    await rows(
      connection,
      `SELECT CAST(count(*) FILTER (usedWwwFallback) AS INTEGER) AS www_fallback,
              CAST(count(*) FILTER (offsiteRedirect) AS INTEGER) AS offsite_redirect,
              CAST(count(*) AS INTEGER) AS total
       FROM completed`,
    ),
  );

  console.log("\n== semantic versions (completed) ==");
  console.log(
    await rows(
      connection,
      `SELECT coalesce(govukSemanticVersion, '(none)') AS version, CAST(count(*) AS INTEGER) AS n
       FROM completed GROUP BY 1 ORDER BY n DESC LIMIT 12`,
    ),
  );
}

function violationsFor(category: string): string {
  return `coalesce(TRY_CAST(json_extract_string(violationCategories, '$."${category}"') AS INTEGER), 0)`;
}

async function build(scanPath: string): Promise<void> {
  const connection = await openConnection(scanPath);

  const categoryColumns = VIOLATION_CATEGORIES.map(
    (category) => `${violationsFor(category.key)} AS ${category.column}`,
  ).join(",\n      ");

  await connection.run(`CREATE VIEW cleaned AS
    SELECT
      hostname,
      lower(coalesce(finalHostname, hostname)) AS final_hostname,
      orgName AS org_name,
      orgType AS org_type,
      source,
      nation,
      scannedAt AS scanned_at,
      coalesce(usedWwwFallback, FALSE) AS used_www_fallback,
      coalesce(govukCount, 0) AS govuk_count,
      govukSemanticVersion AS govuk_semantic_version,
      govukVersionMajor AS govuk_version_major,
      coalesce(violationsTotal, 0) AS violations_total,
      ${categoryColumns},
      httpsEnforced AS https_enforced,
      hsts,
      thirdPartyServiceCount AS third_party_service_count,
      viewportMetaTag AS viewport_meta_tag,
      mainElementPresent AS main_element_present,
      htmlLang AS language,
      cmsGenerator AS cms_generator,
      lcpMs AS lcp_ms,
      cls,
      axeVersion AS axe_version
    FROM completed`);

  const scannedSites = num(
    (await rows(connection, "SELECT CAST(count(*) AS INTEGER) AS n FROM raw"))[0]?.n,
  );
  const analysedSites = num(
    (await rows(connection, "SELECT CAST(count(*) AS INTEGER) AS n FROM cleaned"))[0]?.n,
  );
  const scanWindowRow = (
    await rows(
      connection,
      "SELECT coalesce(min(scanned_at), '') AS lo, coalesce(max(scanned_at), '') AS hi FROM cleaned",
    )
  )[0];
  const scanWindow = `${str(scanWindowRow?.lo).slice(0, 19)}Z – ${str(scanWindowRow?.hi).slice(0, 19)}Z`;
  const axeVersion = str(
    (await rows(connection, "SELECT coalesce(max(axe_version), 'unknown') AS v FROM cleaned"))[0]
      ?.v,
  );

  await mkdir(path.dirname(parquetPath), { recursive: true });
  await connection.run(
    `COPY (SELECT ${GOVUK_PARQUET_COLUMNS.join(", ")} FROM cleaned ORDER BY org_type, hostname)
     TO '${parquetPath}' (FORMAT PARQUET, COMPRESSION ZSTD)`,
  );

  const statusRows = await rows(
    connection,
    `SELECT status, CAST(count(*) AS INTEGER) AS sites FROM raw GROUP BY 1 ORDER BY sites DESC`,
  );

  const bandCase = GOVUK_BANDS.map((band) =>
    band.max === null
      ? `WHEN govuk_count >= ${band.min} THEN '${band.id}'`
      : `WHEN govuk_count BETWEEN ${band.min} AND ${band.max} THEN '${band.id}'`,
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
  const bandStats = GOVUK_BANDS.map((band, index) => {
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

  const strongMin = GOVUK_BANDS.find((band) => band.id === "likely")?.min ?? 50;
  const orgTypeRows = await rows(
    connection,
    `SELECT org_type,
            CAST(count(*) AS INTEGER) AS sites,
            CAST(avg(CASE WHEN govuk_count >= ${strongMin} THEN 1.0 ELSE 0.0 END) AS DOUBLE) AS strong_share,
            CAST(avg(violations_total) AS DOUBLE) AS mean_violations
     FROM cleaned GROUP BY 1 ORDER BY sites DESC`,
  );
  const orgTypeLabels = new Map<string, string>(
    GOVUK_ORG_TYPES.map((orgType) => [orgType.id, orgType.label]),
  );

  const versionRows = await rows(
    connection,
    `SELECT coalesce(CAST(govuk_version_major AS VARCHAR), 'none') AS version,
            CAST(count(*) AS INTEGER) AS sites,
            CAST(avg(violations_total) AS DOUBLE) AS mean_violations,
            CAST(median(violations_total) AS DOUBLE) AS median_violations,
            CAST(avg(CASE WHEN violations_total = 0 THEN 1.0 ELSE 0.0 END) AS DOUBLE) AS zero_share
     FROM cleaned GROUP BY 1 HAVING count(*) >= 10 ORDER BY version`,
  );

  const categoryRows = await rows(
    connection,
    `SELECT k AS category,
            CAST(count(*) FILTER (TRY_CAST(json_extract_string(violationCategories, '$."' || k || '"') AS INTEGER) > 0) AS INTEGER) AS sites_with,
            CAST(coalesce(sum(TRY_CAST(json_extract_string(violationCategories, '$."' || k || '"') AS INTEGER)), 0) AS INTEGER) AS total_violations
     FROM completed, unnest(json_keys(violationCategories)) AS t(k)
     GROUP BY k ORDER BY sites_with DESC`,
  );

  const summary = govukA11ySummarySchema.parse({
    meta: {
      generatedAt: new Date().toISOString(),
      scanWindow,
      source: "tools/scanner (Playwright + axe-core), per UK_SCAN_RECIPE.md",
      scannedSites,
      analysedSites,
      axeVersion,
    },
    statuses: statusRows.map((row) => ({ status: str(row.status), sites: num(row.sites) })),
    bands: bandStats,
    orgTypes: orgTypeRows.map((row) => ({
      orgType: str(row.org_type),
      label: orgTypeLabels.get(str(row.org_type)) ?? str(row.org_type),
      sites: num(row.sites),
      strongShare: num(row.strong_share),
      meanViolations: num(row.mean_violations),
    })),
    versions: versionRows.map((row) => ({
      version: str(row.version),
      sites: num(row.sites),
      meanViolations: num(row.mean_violations),
      medianViolations: num(row.median_violations),
      zeroShare: num(row.zero_share),
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
  await mkdir(path.dirname(sharedSummaryPath), { recursive: true });
  await writeFile(sharedSummaryPath, `${summaryJson}\n`);

  console.log(`Scan window: ${scanWindow}`);
  console.log(`Scanned: ${scannedSites}; analysis sample after dedupe: ${analysedSites}`);
  console.log(`Parquet:  ${parquetPath}`);
  console.log(`Summary:  ${summaryPath}`);
  console.log(`Web copies: ${webParquetPath}, ${sharedSummaryPath}`);
}

const [mode = "build", fileArg] = process.argv.slice(2);
const scanPath = fileArg ? path.resolve(fileArg) : await newestScanFile();
console.log(`Input: ${scanPath}`);
if (mode === "inspect") {
  await inspect(scanPath);
} else if (mode === "build") {
  await build(scanPath);
} else {
  throw new Error(`Unknown mode: ${mode} (expected "inspect" or "build")`);
}
