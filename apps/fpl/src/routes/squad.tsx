import { createFileRoute, useRouter } from "@tanstack/react-router";
import { SquadLab } from "../components/squad-lab.tsx";
import "../squad-lab.css";
import { buildFplMetadata } from "../lib/metadata.ts";
import {
  isStaleOpportunityDataset,
  loadOpportunityDataset,
  opportunityMapFromDataset,
} from "../lib/opportunity-data.ts";
import { useWarmHorizons } from "../lib/warm-horizons.ts";

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
  loaderDeps: ({ search }) => ({ dataset: search.dataset, horizon: search.horizon }),
  loader: ({ deps }) => loadOpportunityDataset(deps.dataset, deps.horizon),
  staleTime: 60_000,
  preloadStaleTime: 60_000,
  head: () =>
    buildFplMetadata({
      title: "Squad lab",
      description:
        "Build or improve a valid £100m FPL squad using official prices and forecast points, with fixtures and a range of outcomes for every player.",
      path: "/squad",
    }),
  component: SquadPage,
});

function SquadPage() {
  const dataset = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const router = useRouter();
  const map = opportunityMapFromDataset(dataset, search.horizon);
  useWarmHorizons(search.horizon, (horizon) =>
    router.preloadRoute({ to: "/squad", search: { ...search, horizon } }),
  );

  return (
    <>
      {isStaleOpportunityDataset(dataset) ? (
        <p className="squad-stale" role="status">
          The live forecast isn’t available right now, so this is the latest one that passed our
          checks.
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
