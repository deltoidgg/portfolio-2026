import { GSA_PARQUET_URL } from "datasets";

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
];

export function datasetById(id: string): DatasetMeta | undefined {
  return datasetRegistry.find((dataset) => dataset.id === id);
}
