import {
  GOVUK_BANDS,
  GOVUK_ORG_TYPES,
  GOVUK_PARQUET_URL,
  GSA_PARQUET_URL,
  USWDS_BANDS,
} from "datasets";

export interface ExplorerBand {
  id: string;
  label: string;
  min: number;
  max: number | null;
}

/** Configuration that adapts the band explorer to one dataset. */
export interface ExplorerConfig {
  datasetId: string;
  parquetName: string;
  parquetUrl: string;
  scoreColumn: string;
  scoreNoun: string;
  groupColumn: string;
  groupLabel: string;
  groupAllLabel: string;
  groupMinSites: number;
  bands: readonly ExplorerBand[];
  groupValueLabels?: Record<string, string>;
}

export const explorerConfigs: Record<string, ExplorerConfig> = {
  "uswds-a11y": {
    datasetId: "uswds-a11y",
    parquetName: "uswds_a11y.parquet",
    parquetUrl: GSA_PARQUET_URL,
    scoreColumn: "uswds_count",
    scoreNoun: "USWDS adoption",
    groupColumn: "agency",
    groupLabel: "Agency",
    groupAllLabel: "All agencies",
    groupMinSites: 50,
    bands: USWDS_BANDS,
  },
  "govuk-a11y": {
    datasetId: "govuk-a11y",
    parquetName: "govuk_a11y.parquet",
    parquetUrl: GOVUK_PARQUET_URL,
    scoreColumn: "govuk_count",
    scoreNoun: "govuk-frontend adoption",
    groupColumn: "org_type",
    groupLabel: "Organisation type",
    groupAllLabel: "All organisation types",
    groupMinSites: 1,
    bands: GOVUK_BANDS,
    groupValueLabels: Object.fromEntries(
      GOVUK_ORG_TYPES.map((orgType) => [orgType.id, orgType.label]),
    ),
  },
};
