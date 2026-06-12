import { GOVUK_PARQUET_URL, GSA_PARQUET_URL } from "datasets";
import { govukSummary } from "./paper-01-results";

export interface DatasetMeta {
  id: string;
  name: string;
  description: string;
  rows: string;
  source: { label: string; href: string };
  /** Parquet artifact served from this app, queryable in-browser. */
  parquetUrl: string;
}

export const datasetRegistry: DatasetMeta[] = [
  {
    id: "uswds-a11y",
    name: "US federal websites: USWDS adoption x accessibility",
    description:
      "One row per live federal .gov/.mil website with a completed accessibility scan: graded US Web Design System adoption signals (uswds_count, semantic version) alongside axe-core violation counts in 11 categories, plus agency and digital-maturity covariates. Derived from the GSA Site Scanning daily snapshot by tools/etl.",
    rows: "12,252 sites",
    source: {
      label: "GSA Site Scanning",
      href: "https://open.gsa.gov/api/site-scanning-api/",
    },
    parquetUrl: GSA_PARQUET_URL,
  },
  ...(govukSummary
    ? [
        {
          id: "govuk-a11y",
          name: "UK public sector: govuk-frontend adoption x accessibility",
          description:
            "One row per UK public-sector website with a completed homepage scan: a graded govuk-frontend detection score (structural mirror of GSA's uswds_count), axe-core violation counts in the same 11 categories, organisation type (central, local, parish, NHS, devolved), and HTTPS/page-weight covariates. Collected for Paper 01 by tools/scanner under a frozen recipe.",
          rows: `${govukSummary.meta.analysedSites.toLocaleString()} sites`,
          source: {
            label: "UK scan recipe (frozen before collection)",
            href: "https://github.com/deltoidgg/portfolio-2026/blob/main/docs/research/paper-01-design-systems-a11y/UK_SCAN_RECIPE.md",
          },
          parquetUrl: GOVUK_PARQUET_URL,
        },
      ]
    : []),
];

export function datasetById(id: string): DatasetMeta | undefined {
  return datasetRegistry.find((dataset) => dataset.id === id);
}
