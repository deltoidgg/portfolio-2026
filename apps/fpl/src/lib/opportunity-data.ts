import {
  projectOpportunityMap,
  selectOpportunityMap,
  type OpportunityMap,
  type OpportunityReplayArtifactV1,
  type PublishedOpportunityBundleV1,
} from "market-intelligence";
import { createDemoOpportunitySnapshot, demoOpportunityQuery } from "market-intelligence/demo";
import { getOpportunityMap } from "./market-intelligence.functions.ts";
import { publicOpportunityClient, type PublicOpportunityLoad } from "./public-opportunity.ts";

export type OpportunityDataset =
  | {
      source: "r2";
      public: PublicOpportunityLoad;
    }
  | {
      source: "local";
      maps: Record<1 | 3 | 5, OpportunityMap>;
    };

function demoMaps(): Record<1 | 3 | 5, OpportunityMap> {
  const snapshot = createDemoOpportunitySnapshot();
  return {
    1: projectOpportunityMap({ ...snapshot, horizon: 1 }),
    3: projectOpportunityMap({ ...snapshot, horizon: 3 }),
    5: projectOpportunityMap({ ...snapshot, horizon: 5 }),
  };
}

async function neonMaps(): Promise<Record<1 | 3 | 5, OpportunityMap>> {
  const [horizon1, horizon3, horizon5] = await Promise.all(
    ([1, 3, 5] as const).map((horizon) =>
      getOpportunityMap({
        data: {
          ...demoOpportunityQuery,
          datasetKey: "current",
          horizon,
        },
      }),
    ),
  );
  return { 1: horizon1, 3: horizon3, 5: horizon5 };
}

export async function loadOpportunityDataset(
  dataset: "current" | "demo",
): Promise<OpportunityDataset> {
  if (dataset === "demo") return { source: "local", maps: demoMaps() };
  const source = import.meta.env.VITE_MI_DATA_SOURCE ?? "neon";
  if (source === "r2") {
    return {
      source: "r2",
      public: await publicOpportunityClient().load(demoOpportunityQuery.seasonKey),
    };
  }
  if (source !== "neon") throw new Error(`Unsupported VITE_MI_DATA_SOURCE ${source}`);
  return { source: "local", maps: await neonMaps() };
}

export function opportunityMapFromDataset(
  dataset: OpportunityDataset,
  horizon: 1 | 3 | 5,
  replay?: OpportunityReplayArtifactV1,
): OpportunityMap {
  return dataset.source === "r2"
    ? selectOpportunityMap(
        dataset.public.bundle,
        horizon,
        replay,
        dataset.public.manifest.sourceHealth,
      )
    : dataset.maps[horizon];
}

export async function loadOpportunityReplay(
  dataset: OpportunityDataset,
): Promise<OpportunityReplayArtifactV1 | undefined> {
  return dataset.source === "r2"
    ? publicOpportunityClient().loadReplay(dataset.public.manifest)
    : undefined;
}

export function isStaleOpportunityDataset(dataset: OpportunityDataset): boolean {
  return dataset.source === "r2" && dataset.public.stale;
}

export function opportunityBundle(
  dataset: OpportunityDataset,
): PublishedOpportunityBundleV1 | undefined {
  return dataset.source === "r2" ? dataset.public.bundle : undefined;
}
