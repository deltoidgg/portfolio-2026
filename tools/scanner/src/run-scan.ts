/**
 * Scan orchestrator. Modes:
 *   node src/run-scan.ts --calibration            recipe §8 detector validation (24 sites)
 *   node src/run-scan.ts --full [--limit N]       full universe scan
 * Options: --concurrency N (default 12), --out FILE. Appends JSONL; resumes by skipping
 * hostnames already present in the output file.
 */
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { chromium, type Browser } from "playwright";
import { CALIBRATION_SITES } from "./sources.ts";
import { scanSite, type ScanRow } from "./scan-page.ts";
import { loadUniverse, RAW_SCAN_DIR, type UniverseSite } from "./universe.ts";

const require = createRequire(import.meta.url);
const playwrightVersion: string = require("playwright/package.json").version;

const BATCH_SIZE = 250;

interface CliOptions {
  mode: "calibration" | "full";
  limit: number | null;
  concurrency: number;
  out: string | null;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { mode: "full", limit: null, concurrency: 12, out: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--calibration") options.mode = "calibration";
    else if (arg === "--full") options.mode = "full";
    else if (arg === "--limit") options.limit = Number.parseInt(argv[++i], 10);
    else if (arg === "--concurrency") options.concurrency = Number.parseInt(argv[++i], 10);
    else if (arg === "--out") options.out = argv[++i];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

async function loadScannedHostnames(outFile: string): Promise<Set<string>> {
  const scanned = new Set<string>();
  if (!existsSync(outFile)) return scanned;
  const text = await readFile(outFile, "utf8");
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      scanned.add((JSON.parse(line) as ScanRow).hostname);
    } catch {
      // ignore partial trailing line from an interrupted run
    }
  }
  return scanned;
}

async function runPool(
  browser: Browser,
  sites: UniverseSite[],
  concurrency: number,
  onResult: (row: ScanRow) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, sites.length) }, async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= sites.length) return;
      const row = await scanSite(browser, sites[index]);
      await onResult(row);
    }
  });
  await Promise.all(workers);
}

function calibrationReport(rows: ScanRow[]): boolean {
  const expectedByHostname = new Map(
    CALIBRATION_SITES.map((site) => [site.hostname, site.expected]),
  );
  let adopterPass = 0;
  let adopterTotal = 0;
  let nonAdopterPass = 0;
  let nonAdopterTotal = 0;
  console.log("\nhostname | expected | status | govuk_count | version | pass");
  console.log("--- | --- | --- | --- | --- | ---");
  for (const row of rows) {
    const expected = expectedByHostname.get(row.hostname);
    if (!expected) continue;
    const completed = row.status === "completed";
    const pass = completed && (expected === "adopter" ? row.govukCount >= 50 : row.govukCount < 50);
    if (expected === "adopter") {
      adopterTotal += 1;
      if (pass) adopterPass += 1;
    } else {
      nonAdopterTotal += 1;
      if (pass) nonAdopterPass += 1;
    }
    console.log(
      `${row.hostname} | ${expected} | ${row.status} | ${row.govukCount} | ${row.govukSemanticVersion ?? "-"} | ${pass ? "PASS" : "FAIL"}`,
    );
  }
  console.log(
    `\nAdopters: ${adopterPass}/${adopterTotal} (need >=10) — non-adopters: ${nonAdopterPass}/${nonAdopterTotal} (need >=10)`,
  );
  return adopterPass >= 10 && nonAdopterPass >= 10;
}

const options = parseArgs(process.argv.slice(2));
const today = new Date().toISOString().slice(0, 10);

let sites: UniverseSite[];
if (options.mode === "calibration") {
  sites = CALIBRATION_SITES.map((site) => ({
    hostname: site.hostname,
    url: `https://${site.hostname}/`,
    orgName: site.note,
    orgType: "central",
    source: "devolved-curated",
    nation: "UK",
  }));
} else {
  const calibrationHostnames = new Set(CALIBRATION_SITES.map((site) => site.hostname));
  sites = (await loadUniverse()).filter((site) => !calibrationHostnames.has(site.hostname));
}
if (options.limit !== null) sites = sites.slice(0, options.limit);

const outFile =
  options.out ??
  path.join(
    RAW_SCAN_DIR,
    options.mode === "calibration" ? `calibration-${today}.jsonl` : `scan-${today}.jsonl`,
  );
await mkdir(path.dirname(outFile), { recursive: true });

const alreadyScanned = await loadScannedHostnames(outFile);
const pending = sites.filter((site) => !alreadyScanned.has(site.hostname));
console.log(
  `${options.mode} scan: ${sites.length} sites (${alreadyScanned.size} already done, ${pending.length} pending) -> ${outFile}`,
);
console.log(`concurrency=${options.concurrency} playwright=${playwrightVersion}`);

const statusCounts = new Map<string, number>();
let done = 0;
const startedAt = Date.now();
const allRows: ScanRow[] = [];

for (let offset = 0; offset < pending.length; offset += BATCH_SIZE) {
  const batch = pending.slice(offset, offset + BATCH_SIZE);
  const browser = await chromium.launch({ headless: true });
  try {
    await runPool(browser, batch, options.concurrency, async (row) => {
      allRows.push(row);
      await appendFile(outFile, `${JSON.stringify(row)}\n`);
      done += 1;
      statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
      console.log(
        `[${done}/${pending.length} ${elapsed}s] ${row.hostname} ${row.status} score=${row.govukCount} viol=${row.violationsTotal ?? "-"} (${(row.scanDurationMs / 1000).toFixed(1)}s)`,
      );
    });
  } finally {
    await browser.close().catch(() => {});
  }
}

console.log("\nStatus counts:");
for (const [status, count] of [...statusCounts.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${status}: ${count}`);
}

if (options.mode === "calibration") {
  const allScanned = [...allRows];
  if (allScanned.length < CALIBRATION_SITES.length && existsSync(outFile)) {
    const text = await readFile(outFile, "utf8");
    const byHostname = new Map<string, ScanRow>();
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line) as ScanRow;
        byHostname.set(row.hostname, row);
      } catch {
        // ignore
      }
    }
    allScanned.length = 0;
    allScanned.push(...byHostname.values());
  }
  const passed = calibrationReport(allScanned);
  if (!passed) {
    console.error("\nCalibration FAILED (recipe §8 criterion not met).");
    process.exit(1);
  }
  console.log("\nCalibration PASSED.");
}
