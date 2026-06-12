/**
 * In-browser analytics over the USWDS x accessibility Parquet artifact.
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
import { GSA_PARQUET_URL, USWDS_BANDS } from "datasets";

const PARQUET_NAME = "uswds_a11y.parquet";

export interface BandStat {
  band: string;
  label: string;
  sites: number;
  meanViolations: number;
  medianViolations: number;
  zeroShare: number;
}

export interface AgencyOption {
  agency: string;
  sites: number;
}

let connectionPromise: Promise<duckdb.AsyncDuckDBConnection> | null = null;

function getConnection(): Promise<duckdb.AsyncDuckDBConnection> {
  connectionPromise ??= (async () => {
    const bundle = await duckdb.selectBundle({
      mvp: { mainModule: mvpWasmUrl, mainWorker: mvpWorkerUrl },
      eh: { mainModule: ehWasmUrl, mainWorker: ehWorkerUrl },
    });
    if (!bundle.mainWorker) throw new Error("No suitable DuckDB-WASM bundle for this browser");
    const worker = new Worker(bundle.mainWorker);
    const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    await db.registerFileURL(
      PARQUET_NAME,
      new URL(GSA_PARQUET_URL, window.location.origin).toString(),
      duckdb.DuckDBDataProtocol.HTTP,
      false,
    );
    return db.connect();
  })();
  return connectionPromise;
}

async function query(sql: string): Promise<Array<Record<string, unknown>>> {
  const connection = await getConnection();
  const table = await connection.query(sql);
  return table.toArray().map((row) => row.toJSON() as Record<string, unknown>);
}

function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  return Number(value);
}

function agencyPredicate(agency: string | null): string {
  if (!agency) return "TRUE";
  return `agency = '${agency.replaceAll("'", "''")}'`;
}

/** Agencies with enough sites to make a per-agency view meaningful. */
export async function loadAgencies(): Promise<AgencyOption[]> {
  const rows = await query(
    `SELECT agency, CAST(count(*) AS INTEGER) AS sites
     FROM '${PARQUET_NAME}'
     GROUP BY agency HAVING count(*) >= 50
     ORDER BY sites DESC`,
  );
  return rows.map((row) => ({ agency: String(row.agency), sites: num(row.sites) }));
}

/** Violation statistics per USWDS adoption band, optionally for one agency. */
export async function loadBandStats(agency: string | null): Promise<BandStat[]> {
  const bandCase = USWDS_BANDS.map((band) =>
    band.max === null
      ? `WHEN uswds_count >= ${band.min} THEN '${band.id}'`
      : `WHEN uswds_count BETWEEN ${band.min} AND ${band.max} THEN '${band.id}'`,
  ).join(" ");

  const rows = await query(
    `SELECT CASE ${bandCase} END AS band,
            CAST(count(*) AS INTEGER) AS sites,
            CAST(avg(violations_total) AS DOUBLE) AS mean_violations,
            CAST(median(violations_total) AS DOUBLE) AS median_violations,
            CAST(avg(CASE WHEN violations_total = 0 THEN 1.0 ELSE 0.0 END) AS DOUBLE) AS zero_share
     FROM '${PARQUET_NAME}'
     WHERE ${agencyPredicate(agency)}
     GROUP BY 1`,
  );

  return USWDS_BANDS.map((band) => {
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
