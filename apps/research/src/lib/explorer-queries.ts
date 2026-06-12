/**
 * In-browser analytics over the published Parquet artifacts (config-driven).
 *
 * Everything in this module is client-only (Web Workers, WASM). It is loaded
 * via dynamic import from the explorer component so it never enters the SSR
 * module graph and stays out of the initial bundle.
 */
import * as duckdb from "@duckdb/duckdb-wasm";
import ehWorkerUrl from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import mvpWorkerUrl from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import ehWasmUrl from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import mvpWasmUrl from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import type { ExplorerConfig } from "../content/explorers";

export interface BandStat {
  band: string;
  label: string;
  sites: number;
  meanViolations: number;
  medianViolations: number;
  zeroShare: number;
}

export interface GroupOption {
  value: string;
  label: string;
  sites: number;
}

let dbPromise: Promise<duckdb.AsyncDuckDB> | null = null;
let connectionPromise: Promise<duckdb.AsyncDuckDBConnection> | null = null;
const registeredFiles = new Set<string>();

function getDb(): Promise<duckdb.AsyncDuckDB> {
  dbPromise ??= (async () => {
    const bundle = await duckdb.selectBundle({
      mvp: { mainModule: mvpWasmUrl, mainWorker: mvpWorkerUrl },
      eh: { mainModule: ehWasmUrl, mainWorker: ehWorkerUrl },
    });
    if (!bundle.mainWorker) throw new Error("No suitable DuckDB-WASM bundle for this browser");
    const worker = new Worker(bundle.mainWorker);
    const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    return db;
  })();
  return dbPromise;
}

async function getConnection(config: ExplorerConfig): Promise<duckdb.AsyncDuckDBConnection> {
  const db = await getDb();
  if (!registeredFiles.has(config.parquetName)) {
    await db.registerFileURL(
      config.parquetName,
      new URL(config.parquetUrl, window.location.origin).toString(),
      duckdb.DuckDBDataProtocol.HTTP,
      false,
    );
    registeredFiles.add(config.parquetName);
  }
  connectionPromise ??= db.connect();
  return connectionPromise;
}

async function query(config: ExplorerConfig, sql: string): Promise<Array<Record<string, unknown>>> {
  const connection = await getConnection(config);
  const table = await connection.query(sql);
  return table.toArray().map((row) => row.toJSON() as Record<string, unknown>);
}

function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  return Number(value);
}

function groupPredicate(config: ExplorerConfig, group: string | null): string {
  if (!group) return "TRUE";
  return `${config.groupColumn} = '${group.replaceAll("'", "''")}'`;
}

/** Grouping values (agencies / organisation types) with enough sites to be meaningful. */
export async function loadGroups(config: ExplorerConfig): Promise<GroupOption[]> {
  const rows = await query(
    config,
    `SELECT ${config.groupColumn} AS value, CAST(count(*) AS INTEGER) AS sites
     FROM '${config.parquetName}'
     WHERE ${config.groupColumn} IS NOT NULL
     GROUP BY 1 HAVING count(*) >= ${config.groupMinSites}
     ORDER BY sites DESC`,
  );
  return rows.map((row) => {
    const value = String(row.value);
    return {
      value,
      label: config.groupValueLabels?.[value] ?? value,
      sites: num(row.sites),
    };
  });
}

/** Violation statistics per adoption band, optionally for one group. */
export async function loadBandStats(
  config: ExplorerConfig,
  group: string | null,
): Promise<BandStat[]> {
  const bandCase = config.bands
    .map((band) =>
      band.max === null
        ? `WHEN ${config.scoreColumn} >= ${band.min} THEN '${band.id}'`
        : `WHEN ${config.scoreColumn} BETWEEN ${band.min} AND ${band.max} THEN '${band.id}'`,
    )
    .join(" ");

  const rows = await query(
    config,
    `SELECT CASE ${bandCase} END AS band,
            CAST(count(*) AS INTEGER) AS sites,
            CAST(avg(violations_total) AS DOUBLE) AS mean_violations,
            CAST(median(violations_total) AS DOUBLE) AS median_violations,
            CAST(avg(CASE WHEN violations_total = 0 THEN 1.0 ELSE 0.0 END) AS DOUBLE) AS zero_share
     FROM '${config.parquetName}'
     WHERE ${groupPredicate(config, group)}
     GROUP BY 1`,
  );

  return config.bands.map((band) => {
    const row = rows.find((candidate) => candidate.band === band.id);
    return {
      band: band.id,
      label: band.label,
      sites: row ? num(row.sites) : 0,
      meanViolations: row ? num(row.mean_violations) : 0,
      medianViolations: row ? num(row.median_violations) : 0,
      zeroShare: row ? num(row.zero_share) : 0,
    };
  });
}
