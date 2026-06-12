/**
 * Download and snapshot the UK domain-list sources (UK_SCAN_RECIPE.md §1)
 * into data/inputs/uk-domains/, with a provenance README.
 *
 * Usage (from tools/scanner): node src/fetch-domains.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CALIBRATION_SITES,
  DEVOLVED_SITES,
  GOVUK_REGISTER_2023_URL,
  GOVUK_REGISTER_URL,
  MYSOCIETY_COUNCILS_URL,
  NHS_TRUSTS_SPARQL,
  WIKIDATA_SPARQL_URL,
} from "./sources.ts";

const REPO_ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const OUT_DIR = path.join(REPO_ROOT, "data/inputs/uk-domains");

const USER_AGENT = "wasimarif-research-scan/0.1 (https://wasimarif.com; wasim.arif@live.co.uk)";

async function fetchText(url: string, accept?: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, ...(accept ? { Accept: accept } : {}) },
  });
  if (!response.ok) throw new Error(`${url} failed: HTTP ${response.status}`);
  return response.text();
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

async function fetchNhsTrusts(): Promise<string> {
  const url = `${WIKIDATA_SPARQL_URL}?format=json&query=${encodeURIComponent(NHS_TRUSTS_SPARQL)}`;
  const body = await fetchText(url, "application/sparql-results+json");
  const parsed = JSON.parse(body) as {
    results: {
      bindings: Array<Record<string, { value: string } | undefined>>;
    };
  };
  const lines = ["entity,name,website"];
  for (const binding of parsed.results.bindings) {
    const entity = binding.trust?.value ?? "";
    const name = binding.trustLabel?.value ?? "";
    const website = binding.website?.value ?? "";
    if (!website) continue;
    lines.push([entity, name, website].map(csvEscape).join(","));
  }
  return `${lines.join("\n")}\n`;
}

const today = new Date().toISOString().slice(0, 10);

await mkdir(OUT_DIR, { recursive: true });

console.log("Fetching .gov.uk register…");
const register = await fetchText(GOVUK_REGISTER_URL);
await writeFile(path.join(OUT_DIR, "govuk-register.csv"), register);

console.log("Fetching .gov.uk register 2023 edition (registrant names)…");
const register2023 = await fetchText(GOVUK_REGISTER_2023_URL);
await writeFile(path.join(OUT_DIR, "govuk-register-2023.csv"), register2023);

console.log("Fetching mySociety council list…");
const councils = await fetchText(MYSOCIETY_COUNCILS_URL);
await writeFile(path.join(OUT_DIR, "mysociety-councils.csv"), councils);

console.log("Fetching NHS trusts from Wikidata…");
const nhs = await fetchNhsTrusts();
await writeFile(path.join(OUT_DIR, "nhs-trusts.csv"), nhs);

console.log("Writing curated lists…");
const devolvedCsv = [
  "hostname,org_name,nation",
  ...DEVOLVED_SITES.map((site) =>
    [site.hostname, site.orgName, site.nation].map(csvEscape).join(","),
  ),
].join("\n");
await writeFile(path.join(OUT_DIR, "devolved-curated.csv"), `${devolvedCsv}\n`);

const calibrationCsv = [
  "hostname,expected,note",
  ...CALIBRATION_SITES.map((site) =>
    [site.hostname, site.expected, site.note].map(csvEscape).join(","),
  ),
].join("\n");
await writeFile(path.join(OUT_DIR, "calibration.csv"), `${calibrationCsv}\n`);

const readme = `# UK domain-list snapshots

Inputs to the UK public-sector scan (see
docs/research/paper-01-design-systems-a11y/UK_SCAN_RECIPE.md). Retrieved ${today} by
tools/scanner/src/fetch-domains.ts.

| File | Source | Licence |
| --- | --- | --- |
| govuk-register.csv | Cabinet Office, "List of .gov.uk domain names" (31 March 2026 edition): ${GOVUK_REGISTER_URL} | Open Government Licence v3.0 |
| govuk-register-2023.csv | Same publication, 30 March 2023 edition — last edition carrying the "Registered for" column; used only to attach registrant names: ${GOVUK_REGISTER_2023_URL} | Open Government Licence v3.0 |
| mysociety-councils.csv | mySociety uk_local_authority_names_and_codes: ${MYSOCIETY_COUNCILS_URL} | CC-BY 4.0 |
| nhs-trusts.csv | Wikidata SPARQL (NHS trusts Q6954197 + NHS foundation trusts Q6954187, current, with official website P856) | CC0 |
| devolved-curated.csv | Hand-curated (tools/scanner/src/sources.ts) | — |
| calibration.csv | Hand-curated detector-validation set (recipe §8); excluded from analysis | — |

These snapshots are frozen analysis inputs: re-running the fetch script may produce different
files and would be a logged deviation once the pre-registration is locked.
`;
await writeFile(path.join(OUT_DIR, "README.md"), readme);

console.log(`Snapshots written to ${OUT_DIR}`);
