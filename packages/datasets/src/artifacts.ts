/**
 * Canonical artifact locations, relative to the repository root. The ETL is
 * the single writer; everything else reads.
 */
export const ARTIFACTS = {
  gsa: {
    /** Raw snapshot download (gitignored). */
    raw: "data/raw/site-scanning-latest.csv",
    /** Analysis-grade Parquet. */
    parquet: "data/processed/uswds_a11y.parquet",
    /** Figure-grade JSON summary. */
    summary: "data/summaries/uswds-a11y.json",
    /** Copy served by the research app for in-browser DuckDB queries. */
    webParquet: "apps/research/public/data/uswds_a11y.parquet",
    /** Copy imported by the research app at build time. */
    webSummary: "apps/research/src/generated/uswds-a11y.json",
  },
  govuk: {
    /** Raw scan JSONL directory (gitignored; hashed in DATA_FREEZE.md). */
    raw: "data/raw/uk-scan",
    parquet: "data/processed/govuk_a11y.parquet",
    summary: "data/summaries/govuk-a11y.json",
    webParquet: "apps/research/public/data/govuk_a11y.parquet",
    webSummary: "apps/research/src/generated/govuk-a11y.json",
  },
} as const;

/** Public URL of the Parquet artifact within the research app. */
export const GSA_PARQUET_URL = "/data/uswds_a11y.parquet";
export const GOVUK_PARQUET_URL = "/data/govuk_a11y.parquet";
