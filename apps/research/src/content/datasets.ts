import { GOVUK_PARQUET_URL, GSA_PARQUET_URL } from "datasets";
import { govukSummary } from "datasets/artifacts";

export interface DatasetMeta {
  id: string;
  name: string;
  /** One sentence for the research index. */
  summary: string;
  description: string;
  rows: string;
  source: { label: string; href: string };
  /** Parquet artifact served from this app, queryable in-browser. */
  parquetUrl: string;
}

export const datasetRegistry: DatasetMeta[] = [
  {
    id: "uswds-a11y",
    name: "USWDS adoption and accessibility on US federal websites",
    summary:
      "Every live federal .gov and .mil site with a completed scan, its US Web Design System adoption score and its axe-core violations.",
    description:
      "One row per live federal .gov or .mil website with a completed accessibility scan. Each row carries GSA’s graded US Web Design System adoption score (uswds_count) and detected version, axe-core violation counts in 11 categories, and agency and digital-maturity covariates. Built from the GSA Site Scanning daily snapshot by tools/etl.",
    rows: "12,252 sites",
    source: {
      label: "GSA Site Scanning",
      href: "https://open.gsa.gov/api/site-scanning-api/",
    },
    parquetUrl: GSA_PARQUET_URL,
  },
  {
    id: "govuk-a11y",
    name: "govuk-frontend adoption and accessibility on UK public sector websites",
    summary:
      "The held-out replication sample: UK public sector homepages scanned for this paper, with a govuk-frontend adoption score and the same violation categories.",
    description:
      "One row per UK public sector website with a completed homepage scan. Each row carries a graded govuk-frontend detection score built as a structural mirror of GSA’s uswds_count, axe-core violation counts in the same 11 categories, the organisation type (central, local, parish, NHS or devolved), and HTTPS and page-weight covariates. Collected for Paper 01 by tools/scanner under a recipe frozen before collection.",
    rows: `${govukSummary.meta.analysedSites.toLocaleString()} sites`,
    source: {
      label: "UK scan recipe, frozen before collection",
      href: "https://github.com/deltoidgg/portfolio-2026/blob/main/docs/research/paper-01-design-systems-a11y/UK_SCAN_RECIPE.md",
    },
    parquetUrl: GOVUK_PARQUET_URL,
  },
];

export function datasetById(id: string): DatasetMeta | undefined {
  return datasetRegistry.find((dataset) => dataset.id === id);
}
