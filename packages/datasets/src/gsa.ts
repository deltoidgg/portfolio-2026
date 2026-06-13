import { z } from "zod";

/**
 * GSA Site Scanning dataset (https://open.gsa.gov/api/site-scanning-api/).
 *
 * The ETL (tools/etl) downloads the daily snapshot, filters it to live,
 * primary-set websites with a completed accessibility scan, and emits:
 *   - data/processed/uswds_a11y.parquet  (analysis-grade, one row per site)
 *   - data/summaries/uswds-a11y.json     (figure-grade aggregates)
 * plus shared copies (apps/research/public/ and packages/datasets/artifacts/).
 *
 * Outcome coding: `accessibility_violations` in the snapshot is a JSON object
 * of per-category axe-core violation counts; a NULL payload on a completed
 * scan means zero detected violations (verified: nulls exactly equal
 * zero-violation sites; no empty objects occur).
 */

/**
 * axe-core violation categories tracked by GSA, with the Parquet column each
 * maps to. Ordered by prevalence in the June 2026 snapshot.
 */
export const VIOLATION_CATEGORIES = [
  { key: "contrast", column: "viol_contrast" },
  { key: "language", column: "viol_language" },
  { key: "images", column: "viol_images" },
  { key: "link-purpose", column: "viol_link_purpose" },
  { key: "aria", column: "viol_aria" },
  { key: "user-control-name", column: "viol_user_control_name" },
  { key: "lists", column: "viol_lists" },
  { key: "page-titled", column: "viol_page_titled" },
  { key: "form-names", column: "viol_form_names" },
  { key: "frames-iframes", column: "viol_frames_iframes" },
  { key: "keyboard-access", column: "viol_keyboard_access" },
] as const;

export type ViolationCategoryKey = (typeof VIOLATION_CATEGORIES)[number]["key"];
export type ViolationColumn = (typeof VIOLATION_CATEGORIES)[number]["column"];

/** Columns of the processed Parquet artifact, in order. */
export const GSA_PARQUET_COLUMNS = [
  "url",
  "base_domain",
  "agency",
  "bureau",
  "branch",
  "scan_date",
  "uswds_count",
  "uswds_semantic_version",
  "uswds_version_major",
  "violations_total",
  ...VIOLATION_CATEGORIES.map((category) => category.column),
  "dap",
  "cms",
  "third_party_service_count",
  "https_enforced",
  "hsts",
  "viewport_meta_tag",
  "main_element_present",
  "language",
  "cumulative_layout_shift",
  "largest_contentful_paint",
] as const;

export type GsaParquetColumn = (typeof GSA_PARQUET_COLUMNS)[number];

/** One row of the processed Parquet artifact. */
export type GsaSiteRow = {
  url: string;
  base_domain: string;
  agency: string;
  bureau: string | null;
  branch: string | null;
  scan_date: string;
  /** Additive USWDS detection score: higher = stronger adoption signal. */
  uswds_count: number;
  /** Cleaned semantic version, e.g. "3.12.0" (no "v" prefix). */
  uswds_semantic_version: string | null;
  /** Major version ("2", "3", ...) or null when undetected. */
  uswds_version_major: string | null;
  /** Sum of axe-core violations across all tracked categories. */
  violations_total: number;
  dap: boolean | null;
  cms: string | null;
  third_party_service_count: number | null;
  https_enforced: boolean | null;
  hsts: boolean | null;
  viewport_meta_tag: boolean | null;
  main_element_present: boolean | null;
  language: string | null;
  /** Placebo outcomes for the self-selection diagnostic (not design-system targets). */
  cumulative_layout_shift: number | null;
  largest_contentful_paint: number | null;
} & Record<ViolationColumn, number>;

/**
 * USWDS adoption bands derived from `uswds_count`.
 *
 * GSA describes `uswds_count` as a calculated likelihood that a site uses
 * USWDS ("the higher the number the more USWDS-y it is"). Band boundaries are
 * fixed here so every artifact, figure, and the pre-registration share one
 * definition. June 2026 snapshot distribution: median 0, p75 48, p90 133.
 */
export const USWDS_BANDS = [
  { id: "none", label: "No signal (0)", min: 0, max: 0 },
  { id: "trace", label: "Trace (1-24)", min: 1, max: 24 },
  { id: "partial", label: "Partial (25-49)", min: 25, max: 49 },
  { id: "likely", label: "Likely (50-99)", min: 50, max: 99 },
  { id: "definite", label: "Definite (100+)", min: 100, max: null },
] as const;

export type UswdsBandId = (typeof USWDS_BANDS)[number]["id"];

export function uswdsBandFor(count: number): UswdsBandId {
  for (const band of USWDS_BANDS) {
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
  /** Share of sites with zero detected violations. */
  zeroShare: z.number().min(0).max(1),
});

const versionStatsSchema = z.object({
  version: z.string(),
  sites: z.number().int().nonnegative(),
  meanViolations: z.number().nonnegative(),
  medianViolations: z.number().nonnegative(),
  zeroShare: z.number().min(0).max(1),
});

const agencyStatsSchema = z.object({
  agency: z.string(),
  sites: z.number().int().nonnegative(),
  uswdsShare: z.number().min(0).max(1),
  meanViolations: z.number().nonnegative(),
});

const categoryStatsSchema = z.object({
  category: z.string(),
  sitesWith: z.number().int().nonnegative(),
  totalViolations: z.number().int().nonnegative(),
});

/** Figure-grade summary artifact consumed by the research app at build time. */
export const uswdsA11ySummarySchema = z.object({
  meta: z.object({
    generatedAt: z.string(),
    snapshotDate: z.string(),
    source: z.string(),
    totalSites: z.number().int().nonnegative(),
    analysedSites: z.number().int().nonnegative(),
  }),
  bands: z.array(bandStatsSchema),
  versions: z.array(versionStatsSchema),
  agencies: z.array(agencyStatsSchema),
  categories: z.array(categoryStatsSchema),
});

export type UswdsA11ySummary = z.infer<typeof uswdsA11ySummarySchema>;
