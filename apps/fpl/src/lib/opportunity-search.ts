import type { OpportunityViewState } from "../components/opportunity-map.tsx";

export const defaultOpportunitySearch = {
  mode: "forecast",
  view: "auto",
  position: "ALL",
  minSixty: 0,
  horizon: 3,
  snapshot: "latest",
} satisfies OpportunityViewState;
