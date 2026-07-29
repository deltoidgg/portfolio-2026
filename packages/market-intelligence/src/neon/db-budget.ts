import { Pool } from "@neondatabase/serverless";
import { loadLocalEnvironment, requiredEnvironment } from "./load-env.ts";

loadLocalEnvironment();
const pool = new Pool({ connectionString: requiredEnvironment("DATABASE_URL") });

try {
  const database = await pool.query<{ bytes: string }>(
    "select pg_database_size(current_database())::text as bytes",
  );
  const tables = await pool.query<{
    relation: string;
    total_bytes: string;
  }>(
    `select relname as relation, pg_total_relation_size(c.oid)::text as total_bytes
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
     order by pg_total_relation_size(c.oid) desc`,
  );
  const bytes = Number(database.rows[0]?.bytes ?? 0);
  const report = {
    checkedAt: new Date().toISOString(),
    databaseBytes: bytes,
    databaseMiB: Number((bytes / 1024 / 1024).toFixed(2)),
    warningAtBytes: 75 * 1024 * 1024,
    ceilingBytes: 100 * 1024 * 1024,
    status: bytes >= 100 * 1024 * 1024 ? "blocked" : bytes >= 75 * 1024 * 1024 ? "warning" : "ok",
    largestTables: tables.rows.slice(0, 15).map((row) => ({
      relation: row.relation,
      bytes: Number(row.total_bytes),
    })),
  };
  console.log(JSON.stringify(report));
  if (report.status === "blocked") process.exitCode = 2;
} finally {
  await pool.end();
}
