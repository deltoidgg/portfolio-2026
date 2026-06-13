/**
 * Committed figure-grade artifacts, validated at module load.
 *
 * tools/etl writes the summaries and tools/analysis writes the confirmatory
 * results into this directory; apps import the typed exports below so every
 * consumer shares one copy and one validation pass.
 */
import {
  govukA11ySummarySchema,
  ukConfirmatoryResultsSchema,
  usConfirmatoryResultsSchema,
  uswdsA11ySummarySchema,
  type GovukA11ySummary,
  type UkConfirmatoryResults,
  type UsConfirmatoryResults,
  type UswdsA11ySummary,
} from "../src/index.ts";
import govukSummaryJson from "./govuk-a11y.json";
import ukResultsJson from "./uk-confirmatory.json";
import usResultsJson from "./us-confirmatory.json";
import uswdsSummaryJson from "./uswds-a11y.json";

export const uswdsSummary: UswdsA11ySummary = uswdsA11ySummarySchema.parse(uswdsSummaryJson);
export const govukSummary: GovukA11ySummary = govukA11ySummarySchema.parse(govukSummaryJson);
export const usResults: UsConfirmatoryResults = usConfirmatoryResultsSchema.parse(usResultsJson);
export const ukResults: UkConfirmatoryResults = ukConfirmatoryResultsSchema.parse(ukResultsJson);
