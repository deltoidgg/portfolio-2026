/**
 * Build the scan universe with org_type classification, per UK_SCAN_RECIPE.md §1–2.
 * Pure functions take snapshot file contents so the rules are unit-testable.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsvRecords } from "./csv.ts";
import { DEVOLVED_SITES } from "./sources.ts";

export type OrgType = "local" | "parish" | "nhs" | "devolved" | "central";

export interface UniverseSite {
  hostname: string;
  url: string;
  orgName: string | null;
  orgType: OrgType;
  source: "govuk-register" | "nhs-trusts" | "devolved-curated";
  nation: string;
}

export interface CouncilRecord {
  officialName: string;
  niceName: string;
  altNames: string[];
  govUkSlug: string;
  nation: string;
}

/** Lowercase, & -> and, strip punctuation, collapse whitespace. */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replaceAll("&", " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Hostname base for matching: strip public suffix-ish tail and all separators. */
function hostnameBase(hostname: string): string {
  const stripped = hostname.replace(
    /\.(gov\.uk|gov\.scot|gov\.wales|llyw\.cymru|nhs\.uk|org\.uk|co\.uk|com|org|net|uk|scot|wales|cymru|london)$/i,
    "",
  );
  return stripped.replace(/^www\./, "").replaceAll(/[-.]/g, "");
}

const PARISH_NAME_RE = /parish council|town council|community council|parish meeting/;
const PARISH_HOST_RE =
  /-pc\.gov\.uk$|-tc\.gov\.uk$|parishcouncil|towncouncil|communitycouncil|parish-council|town-council/;

export function parseCouncils(csvText: string): CouncilRecord[] {
  return parseCsvRecords(csvText)
    .filter((record) => record["current-authority"] === "True")
    .map((record) => ({
      officialName: record["official-name"] ?? "",
      niceName: record["nice-name"] ?? "",
      altNames: (record["alt-names"] ?? "")
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean),
      govUkSlug: record["gov-uk-slug"] ?? "",
      nation: record["nation"] ?? "",
    }));
}

export interface CouncilIndex {
  byNormalizedName: Map<string, CouncilRecord>;
  byCompactBase: Map<string, CouncilRecord>;
}

export function buildCouncilIndex(councils: CouncilRecord[]): CouncilIndex {
  const byNormalizedName = new Map<string, CouncilRecord>();
  const byCompactBase = new Map<string, CouncilRecord>();
  for (const council of councils) {
    for (const name of [council.officialName, council.niceName, ...council.altNames]) {
      if (name) byNormalizedName.set(normalizeName(name), council);
    }
    if (council.govUkSlug) {
      byCompactBase.set(council.govUkSlug.replaceAll("-", ""), council);
    }
    if (council.niceName) {
      byCompactBase.set(normalizeName(council.niceName).replaceAll(" ", ""), council);
    }
  }
  return { byNormalizedName, byCompactBase };
}

export function matchCouncil(
  index: CouncilIndex,
  hostname: string,
  registrant: string | null,
): CouncilRecord | null {
  if (registrant) {
    const byName = index.byNormalizedName.get(normalizeName(registrant));
    if (byName) return byName;
  }
  return index.byCompactBase.get(hostnameBase(hostname)) ?? null;
}

export interface ClassificationInputs {
  hostname: string;
  registrant: string | null;
  source: UniverseSite["source"];
  councilIndex: CouncilIndex;
}

/** Recipe §2: first matching rule wins. */
export function classifyOrg(inputs: ClassificationInputs): {
  orgType: OrgType;
  orgName: string | null;
  nation: string;
} {
  const { hostname, registrant, source, councilIndex } = inputs;
  const registrantNormalized = registrant ? normalizeName(registrant) : "";

  const council =
    registrant && !PARISH_NAME_RE.test(registrantNormalized)
      ? matchCouncil(councilIndex, hostname, registrant)
      : !registrant
        ? matchCouncil(councilIndex, hostname, null)
        : null;
  if (council) {
    return { orgType: "local", orgName: council.officialName, nation: council.nation };
  }
  if (PARISH_NAME_RE.test(registrantNormalized) || PARISH_HOST_RE.test(hostname)) {
    return { orgType: "parish", orgName: registrant, nation: "unknown" };
  }
  if (source === "nhs-trusts" || /\bnhs\b/.test(registrantNormalized)) {
    return { orgType: "nhs", orgName: registrant, nation: "England" };
  }
  if (source === "devolved-curated" || /\.gov\.scot$|\.gov\.wales$|\.llyw\.cymru$/.test(hostname)) {
    return { orgType: "devolved", orgName: registrant, nation: "unknown" };
  }
  return { orgType: "central", orgName: registrant, nation: "UK" };
}

export interface UniverseSnapshots {
  register: string;
  register2023: string;
  councils: string;
  nhsTrusts: string;
}

export function buildUniverse(snapshots: UniverseSnapshots): UniverseSite[] {
  const councilIndex = buildCouncilIndex(parseCouncils(snapshots.councils));

  const registrantByDomain = new Map<string, string>();
  for (const record of parseCsvRecords(snapshots.register2023)) {
    const domain = (record["Domain: Domain Name"] ?? record["Domain Name"] ?? "").toLowerCase();
    const registrant = record["Registered for"] ?? "";
    if (domain && registrant) registrantByDomain.set(domain, registrant);
  }

  const sites = new Map<string, UniverseSite>();
  const add = (site: UniverseSite) => {
    if (!sites.has(site.hostname)) sites.set(site.hostname, site);
  };

  for (const record of parseCsvRecords(snapshots.register)) {
    const domain = (record["Domain Name"] ?? record["Domain: Domain Name"] ?? "")
      .toLowerCase()
      .trim();
    if (!domain || !domain.includes(".") || domain.startsWith("_")) continue;
    const registrant = registrantByDomain.get(domain) ?? null;
    const { orgType, orgName, nation } = classifyOrg({
      hostname: domain,
      registrant,
      source: "govuk-register",
      councilIndex,
    });
    add({
      hostname: domain,
      url: `https://${domain}/`,
      orgName,
      orgType,
      source: "govuk-register",
      nation,
    });
  }

  for (const record of parseCsvRecords(snapshots.nhsTrusts)) {
    const website = record["website"] ?? "";
    if (!website) continue;
    let hostname: string;
    try {
      hostname = new URL(website).hostname.toLowerCase();
    } catch {
      continue;
    }
    add({
      hostname,
      url: `https://${hostname}/`,
      orgName: record["name"] || null,
      orgType: "nhs",
      source: "nhs-trusts",
      nation: "England",
    });
  }

  for (const site of DEVOLVED_SITES) {
    add({
      hostname: site.hostname,
      url: `https://${site.hostname}/`,
      orgName: site.orgName,
      orgType: "devolved",
      source: "devolved-curated",
      nation: site.nation,
    });
  }

  return [...sites.values()];
}

const REPO_ROOT = fileURLToPath(new URL("../../..", import.meta.url));
export const INPUTS_DIR = path.join(REPO_ROOT, "data/inputs/uk-domains");
export const RAW_SCAN_DIR = path.join(REPO_ROOT, "data/raw/uk-scan");

export async function loadUniverse(): Promise<UniverseSite[]> {
  const [register, register2023, councils, nhsTrusts] = await Promise.all([
    readFile(path.join(INPUTS_DIR, "govuk-register.csv"), "utf8"),
    readFile(path.join(INPUTS_DIR, "govuk-register-2023.csv"), "utf8"),
    readFile(path.join(INPUTS_DIR, "mysociety-councils.csv"), "utf8"),
    readFile(path.join(INPUTS_DIR, "nhs-trusts.csv"), "utf8"),
  ]);
  return buildUniverse({ register, register2023, councils, nhsTrusts });
}
