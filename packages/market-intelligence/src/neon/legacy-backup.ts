import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { sha256Hex } from "../hot-cold/artifact-store.ts";
import { createCutoverPrivateStore, freezeAt } from "./cutover-r2.ts";
import { loadLocalEnvironment, requiredEnvironment } from "./load-env.ts";

const execute = promisify(execFile);

async function requirePostgres18(command: "pg_dump" | "pg_restore" | "psql") {
  const { stdout, stderr } = await execute(command, ["--version"]);
  const version = `${stdout}${stderr}`;
  if (!/\b18(?:\.|\b)/.test(version)) {
    throw new Error(`${command} 18 is required; received ${version.trim()}`);
  }
}

async function relationCounts(connectionString: string) {
  const relations = await execute("psql", [
    "--no-align",
    "--tuples-only",
    "--command",
    "select tablename from pg_tables where schemaname = 'public' order by tablename",
    connectionString,
  ]);
  const counts: Record<string, number> = {};
  for (const table of relations.stdout.split("\n").filter(Boolean)) {
    const safeTable = table.replaceAll('"', '""');
    const count = await execute("psql", [
      "--no-align",
      "--tuples-only",
      "--command",
      `select count(*) from "${safeTable}"`,
      connectionString,
    ]);
    counts[table] = Number(count.stdout.trim());
  }
  return counts;
}

loadLocalEnvironment();
await Promise.all([
  requirePostgres18("pg_dump"),
  requirePostgres18("pg_restore"),
  requirePostgres18("psql"),
]);
const legacyUrl = requiredEnvironment("LEGACY_DATABASE_DIRECT_URL");
const restoreUrl = requiredEnvironment("MI_RESTORE_DATABASE_URL");
const directory = await mkdtemp(join(tmpdir(), "fpl-legacy-backup-"));
const dumpPath = join(directory, "neondb.dump");

try {
  const sourceCounts = await relationCounts(legacyUrl);
  await execute("pg_dump", [
    "--format=custom",
    "--no-owner",
    "--no-acl",
    "--file",
    dumpPath,
    legacyUrl,
  ]);
  await execute("pg_restore", ["--list", dumpPath]);
  const body = new Uint8Array(await readFile(dumpPath));
  const hash = await sha256Hex(body);
  const timestamp = freezeAt();
  const key = `legacy/v1/backups/${timestamp}/neondb.dump`;
  const store = createCutoverPrivateStore();
  const receipt = await store.putImmutable({
    key,
    body,
    contentType: "application/octet-stream",
    cacheControl: "private,max-age=31536000,immutable",
    metadata: { sha256: hash, postgresVersion: "18" },
  });
  const uploaded = await store.get(key);
  if (
    !uploaded ||
    uploaded.body.byteLength !== body.byteLength ||
    (await sha256Hex(uploaded.body)) !== hash
  ) {
    throw new Error(`Uploaded legacy backup ${key} failed read-back verification`);
  }
  await execute("pg_restore", [
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-acl",
    "--dbname",
    restoreUrl,
    dumpPath,
  ]);
  const restoredCounts = await relationCounts(restoreUrl);
  if (JSON.stringify(sourceCounts) !== JSON.stringify(restoredCounts)) {
    throw new Error("Restored relation counts do not match the legacy source");
  }
  console.log(
    JSON.stringify({
      key,
      sha256: hash,
      bytes: receipt.bytes,
      relationCount: Object.keys(sourceCounts).length,
      restored: true,
    }),
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
