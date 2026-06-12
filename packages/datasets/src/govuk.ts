import { z } from "zod";

/**
 * UK public-sector scan dataset (collected by tools/scanner per the frozen
 * recipe in docs/research/paper-01-design-systems-a11y/UK_SCAN_RECIPE.md).
 *
 * The ETL (tools/etl/src/govuk.ts) reads the raw scan JSONL, applies the
 * recipe's dedupe + calibration-exclusion rules, and emits:
 *   - data/processed/govuk_a11y.parquet  (analysis-grade, one row per site)
 *   - data/summaries/govuk-a11y.json     (figure-grade aggregates)
 * plus copies for the research app.
 */

/** Columns of the processed UK Parquet artifact, in order. */
export const GOVUK_PARQUET_COLUMNS = [
  "hostname",
  "final_hostname",
  "org_name",
  "org_type",
  "source",
  "nation",
  "scanned_at",
  "used_www_fallback",
  "govuk_count",
  "govuk_semantic_version",
  "govuk_version_major",
  "violations_total",
  "viol_contrast",
  "viol_language",
  "viol_images",
  "viol_link_purpose",
  "viol_aria",
  "viol_user_control_name",
  "viol_lists",
  "viol_page_titled",
  "viol_form_names",
  "viol_frames_iframes",
  "viol_keyboard_access",
  "https_enforced",
  "hsts",
  "third_party_service_count",
  "viewport_meta_tag",
  "main_element_present",
  "language",
  "cms_generator",
  "lcp_ms",
  "cls",
  "axe_version",
] as const;

export type GovukParquetColumn = (typeof GOVUK_PARQUET_COLUMNS)[number];

/** Organisation types assigned by the recipe §2 classification rules. */
export const GOVUK_ORG_TYPES = [
  { id: "central", label: "Central & national bodies" },
  { id: "local", label: "Local authorities" },
  { id: "parish", label: "Parish & town councils" },
  { id: "nhs", label: "NHS" },
  { id: "devolved", label: "Devolved" },
] as const;

export type GovukOrgType = (typeof GOVUK_ORG_TYPES)[number]["id"];

/**
 * govuk-frontend adoption bands. The score construction mirrors GSA's
 * uswds_count component-for-component (recipe §5), so the band boundaries are
 * identical to USWDS_BANDS by design — that equivalence is what makes the
 * US-vs-UK band contrast meaningful.
 */
export const GOVUK_BANDS = [
  { id: "none", label: "No signal (0)", min: 0, max: 0 },
  { id: "trace", label: "Trace (1-24)", min: 1, max: 24 },
  { id: "partial", label: "Partial (25-49)", min: 25, max: 49 },
  { id: "likely", label: "Likely (50-99)", min: 50, max: 99 },
  { id: "definite", label: "Definite (100+)", min: 100, max: null },
] as const;

export type GovukBandId = (typeof GOVUK_BANDS)[number]["id"];

export function govukBandFor(count: number): GovukBandId {
  for (const band of GOVUK_BANDS) {
    if (count >= band.min && (band.max === null || count <= band.max)) return band.id;
  }
  return "none";
}

const bandStatsSchema = z.object({
  band: z.string(),
  label: z.string(),
  order: z.number().int(),
  sites: z.number().int().nonnegative(),
  meanViolations: z.number().nonnegative(),
  medianViolations: z.number().nonnegative(),
  zeroShare: z.number().min(0).max(1),
});

const orgTypeStatsSchema = z.object({
  orgType: z.string(),
  label: z.string(),
  sites: z.number().int().nonnegative(),
  strongShare: z.number().min(0).max(1),
  meanViolations: z.number().nonnegative(),
});

const versionStatsSchema = z.object({
  version: z.string(),
  sites: z.number().int().nonnegative(),
  meanViolations: z.number().nonnegative(),
  medianViolations: z.number().nonnegative(),
  zeroShare: z.number().min(0).max(1),
});

const categoryStatsSchema = z.object({
  category: z.string(),
  sitesWith: z.number().int().nonnegative(),
  totalViolations: z.number().int().nonnegative(),
});

const statusStatsSchema = z.object({
  status: z.string(),
  sites: z.number().int().nonnegative(),
});

/** Figure-grade summary artifact consumed by the research app at build time. */
export const govukA11ySummarySchema = z.object({
  meta: z.object({
    generatedAt: z.string(),
    scanWindow: z.string(),
    source: z.string(),
    scannedSites: z.number().int().nonnegative(),
    analysedSites: z.number().int().nonnegative(),
    axeVersion: z.string(),
  }),
  statuses: z.array(statusStatsSchema),
  bands: z.array(bandStatsSchema),
  orgTypes: z.array(orgTypeStatsSchema),
  versions: z.array(versionStatsSchema),
  categories: z.array(categoryStatsSchema),
});

export type GovukA11ySummary = z.infer<typeof govukA11ySummarySchema>;
