import type { OpportunityViewState } from "../components/opportunity-map.tsx";

export const defaultOpportunitySearch = {
  mode: "forecast",
  view: "auto",
  scenario: "baseline",
  position: "ALL",
  minSixty: 0,
  snapshot: 2,
} satisfies OpportunityViewState;
