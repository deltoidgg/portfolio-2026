import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { OpportunityReplayArtifactV1 } from "market-intelligence";
import {
  OpportunityMapExperience,
  type OpportunityViewState,
} from "../components/opportunity-map.tsx";
import "../opportunity-map.css";
import { buildFplMetadata } from "../lib/metadata.ts";
import {
  isStaleOpportunityDataset,
  loadOpportunityDataset,
  loadOpportunityReplay,
  opportunityMapFromDataset,
} from "../lib/opportunity-data.ts";
import { defaultOpportunitySearch } from "../lib/opportunity-search.ts";
import { useWarmHorizons } from "../lib/warm-horizons.ts";

const description =
  "Browse FPL forecasts by projected points, price, ownership and upside, with a range of outcomes for every player.";

type OpportunitySearch = OpportunityViewState & { dataset: "current" | "demo" };

function oneOf<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return typeof value === "string" && values.includes(value as T) ? (value as T) : fallback;
}

function optionalNumber(value: unknown): number | undefined {
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function validateSearch(search: Record<string, unknown>): OpportunitySearch {
  const horizon = optionalNumber(search.horizon);
  return {
    ...defaultOpportunitySearch,
    dataset: search.dataset === "demo" ? "demo" : "current",
    mode: oneOf(search.mode, ["forecast", "value", "opportunity"], "forecast"),
    view: oneOf(search.view, ["auto", "map", "list"], "auto"),
    horizon: horizon === 1 || horizon === 5 ? horizon : 3,
    position: oneOf(search.position, ["ALL", "GKP", "DEF", "MID", "FWD"], "ALL"),
    ...(typeof search.team === "string" && search.team ? { team: search.team } : {}),
    ...(optionalNumber(search.maxPrice) === undefined
      ? {}
      : { maxPrice: optionalNumber(search.maxPrice) }),
    minSixty: Math.max(0, Math.min(0.95, optionalNumber(search.minSixty) ?? 0)),
    ...(typeof search.search === "string" && search.search ? { search: search.search } : {}),
    ...(typeof search.player === "string" && search.player ? { player: search.player } : {}),
    ...(typeof search.compare === "string" && search.compare ? { compare: search.compare } : {}),
    snapshot: typeof search.snapshot === "string" && search.snapshot ? search.snapshot : "latest",
  };
}

export const Route = createFileRoute("/opportunities")({
  validateSearch,
  loaderDeps: ({ search }) => ({ dataset: search.dataset, horizon: search.horizon }),
  loader: ({ deps }) => loadOpportunityDataset(deps.dataset, deps.horizon),
  staleTime: 60_000,
  preloadStaleTime: 60_000,
  head: () =>
    buildFplMetadata({
      title: "Opportunity map",
      description,
      path: "/opportunities",
    }),
  component: OpportunityMapPage,
});

function OpportunityMapPage() {
  const dataset = Route.useLoaderData();
  const state = Route.useSearch();
  const navigate = Route.useNavigate();
  const router = useRouter();
  const [replay, setReplay] = useState<OpportunityReplayArtifactV1>();
  const map = useMemo(
    () => opportunityMapFromDataset(dataset, state.horizon, replay),
    [dataset, replay, state.horizon],
  );
  useWarmHorizons(state.horizon, (horizon) =>
    router.preloadRoute({ to: "/opportunities", search: { ...state, horizon } }),
  );
  return (
    <>
      {isStaleOpportunityDataset(dataset) ? (
        <p className="opportunity-stale" role="status">
          The live forecast isn’t available right now, so this is the latest one that passed our
          checks.
        </p>
      ) : null}
      <OpportunityMapExperience
        map={map}
        state={state}
        onReplayRequest={async () => setReplay(await loadOpportunityReplay(dataset))}
        onStateChange={(patch) =>
          void navigate({
            replace: true,
            search: (previous) => ({ ...previous, ...patch }),
          })
        }
      />
    </>
  );
}
