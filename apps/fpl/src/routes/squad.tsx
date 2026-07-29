import { createFileRoute } from "@tanstack/react-router";
import { SquadLab } from "../components/squad-lab.tsx";
import "../squad-lab.css";
import { buildFplMetadata } from "../lib/metadata.ts";
import {
  isStaleOpportunityDataset,
  loadOpportunityDataset,
  opportunityMapFromDataset,
} from "../lib/opportunity-data.ts";

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
  loaderDeps: ({ search }) => ({ dataset: search.dataset }),
  loader: ({ deps }) => loadOpportunityDataset(deps.dataset),
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
  const dataset = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const map = opportunityMapFromDataset(dataset, search.horizon);

  return (
    <>
      {isStaleOpportunityDataset(dataset) ? (
        <p className="squad-stale" role="status">
          Showing the last validated 2026/27 forecast while the live artifact is unavailable.
        </p>
      ) : null}
      <SquadLab
        map={map}
        horizon={search.horizon}
        onHorizonChange={(horizon) =>
          void navigate({ search: (previous) => ({ ...previous, horizon }) })
        }
      />
    </>
  );
}
