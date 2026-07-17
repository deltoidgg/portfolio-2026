import { createFileRoute } from "@tanstack/react-router";
import { demoOpportunityQuery } from "market-intelligence/demo";
import {
  OpportunityMapExperience,
  type OpportunityViewState,
} from "../components/opportunity-map.tsx";
import "../opportunity-map.css";
import { getOpportunityMap } from "../lib/market-intelligence.functions.ts";
import { buildFplMetadata } from "../lib/metadata.ts";
import { defaultOpportunitySearch } from "../lib/opportunity-search.ts";

const description =
  "Explore market-informed FPL forecasts across projected points, estimated price, ownership, upside, and uncertainty.";

function oneOf<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return typeof value === "string" && values.includes(value as T) ? (value as T) : fallback;
}

function optionalNumber(value: unknown): number | undefined {
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function validateSearch(search: Record<string, unknown>): OpportunityViewState {
  return {
    ...defaultOpportunitySearch,
    mode: oneOf(search.mode, ["forecast", "value", "opportunity"], "forecast"),
    view: oneOf(search.view, ["auto", "map", "list"], "auto"),
    scenario: oneOf(search.scenario, ["cautious", "baseline", "upside"], "baseline"),
    position: oneOf(search.position, ["ALL", "GKP", "DEF", "MID", "FWD"], "ALL"),
    ...(typeof search.team === "string" && search.team ? { team: search.team } : {}),
    ...(optionalNumber(search.maxPrice) === undefined
      ? {}
      : { maxPrice: optionalNumber(search.maxPrice) }),
    minSixty: Math.max(0, Math.min(0.95, optionalNumber(search.minSixty) ?? 0)),
    ...(typeof search.search === "string" && search.search ? { search: search.search } : {}),
    ...(typeof search.player === "string" && search.player ? { player: search.player } : {}),
    ...(typeof search.compare === "string" && search.compare ? { compare: search.compare } : {}),
    snapshot: Math.max(0, Math.min(2, Math.round(optionalNumber(search.snapshot) ?? 2))),
  };
}

export const Route = createFileRoute("/opportunities")({
  validateSearch,
  loader: () => getOpportunityMap({ data: { ...demoOpportunityQuery, datasetKey: "current" } }),
  head: () =>
    buildFplMetadata({
      title: "Opportunity Map — FPL market intelligence",
      description,
      path: "/opportunities",
    }),
  component: OpportunityMapPage,
});

function OpportunityMapPage() {
  const map = Route.useLoaderData();
  const state = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <OpportunityMapExperience
      map={map}
      state={state}
      onStateChange={(patch) =>
        void navigate({
          replace: true,
          search: (previous) => ({ ...previous, ...patch }),
        })
      }
    />
  );
}
