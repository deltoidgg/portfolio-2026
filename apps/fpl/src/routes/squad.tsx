import { createFileRoute } from "@tanstack/react-router";
import { demoOpportunityQuery } from "market-intelligence/demo";
import { SquadLab } from "../components/squad-lab.tsx";
import "../squad-lab.css";
import { getOpportunityMap } from "../lib/market-intelligence.functions.ts";
import { buildFplMetadata } from "../lib/metadata.ts";

type SquadSearch = {
  horizon: 1 | 3 | 5;
  dataset: "current" | "demo";
};

function validateSearch(search: Record<string, unknown>): SquadSearch {
  const value = Number(search.horizon);
  return {
    horizon: value === 1 || value === 5 ? value : 3,
    dataset: search.dataset === "demo" ? "demo" : "current",
  };
}

export const Route = createFileRoute("/squad")({
  validateSearch,
  loaderDeps: ({ search }) => ({ horizon: search.horizon, dataset: search.dataset }),
  loader: ({ deps }) =>
    getOpportunityMap({
      data: {
        ...demoOpportunityQuery,
        datasetKey: deps.dataset === "demo" ? demoOpportunityQuery.datasetKey : "current",
        horizon: deps.horizon,
      },
    }),
  head: () =>
    buildFplMetadata({
      title: "Squad & Transfer Lab — FPL market intelligence",
      description:
        "Build and improve a valid £100m FPL squad with official prices, market-informed expected points, fixture context, and feasible replacement paths.",
      path: "/squad",
    }),
  component: SquadPage,
});

function SquadPage() {
  const map = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <SquadLab
      map={map}
      horizon={search.horizon}
      onHorizonChange={(horizon) =>
        void navigate({ search: (previous) => ({ ...previous, horizon }) })
      }
    />
  );
}
