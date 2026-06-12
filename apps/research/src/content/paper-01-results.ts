import {
  govukA11ySummarySchema,
  ukConfirmatoryResultsSchema,
  usConfirmatoryResultsSchema,
  type GovukA11ySummary,
  type UkConfirmatoryResults,
  type UsConfirmatoryResults,
} from "datasets";

/**
 * Confirmatory-analysis artifacts for Paper 01, written into src/generated/ by
 * tools/analysis (results) and tools/etl (UK summary). Loaded via glob so the app
 * still builds before the analyses have run; the paper page renders a "pending"
 * state for anything missing.
 */
const generated = import.meta.glob("../generated/*.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

function load<T>(name: string, parse: (raw: unknown) => T): T | null {
  const raw = generated[`../generated/${name}`];
  return raw === undefined ? null : parse(raw);
}

export const usResults: UsConfirmatoryResults | null = load("us-confirmatory.json", (raw) =>
  usConfirmatoryResultsSchema.parse(raw),
);

export const ukResults: UkConfirmatoryResults | null = load("uk-confirmatory.json", (raw) =>
  ukConfirmatoryResultsSchema.parse(raw),
);

export const govukSummary: GovukA11ySummary | null = load("govuk-a11y.json", (raw) =>
  govukA11ySummarySchema.parse(raw),
);
