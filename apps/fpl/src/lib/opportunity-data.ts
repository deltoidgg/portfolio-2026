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

export type OpportunityHorizon = 1 | 3 | 5;

export type OpportunityDataset =
  | {
      source: "r2";
      public: PublicOpportunityLoad;
    }
  | {
      source: "local";
      /** Only the horizons that have been loaded, normally just the one being shown. */
      maps: Partial<Record<OpportunityHorizon, OpportunityMap>>;
    };

function demoMap(horizon: OpportunityHorizon): OpportunityMap {
  return projectOpportunityMap({ ...createDemoOpportunitySnapshot(), horizon });
}

function neonMap(horizon: OpportunityHorizon): Promise<OpportunityMap> {
  return getOpportunityMap({
    data: {
      ...demoOpportunityQuery,
      datasetKey: "current",
      horizon,
    },
  });
}

/**
 * Loads one forecast horizon. Every horizon repeats the full player list, so loading all three
 * triples the data sent with the page. The routes re-run this when the horizon changes and warm
 * the other two once the page is idle, which keeps the 1, 3 and 5 gameweek switch instant.
 */
export async function loadOpportunityDataset(
  dataset: "current" | "demo",
  horizon: OpportunityHorizon = 3,
): Promise<OpportunityDataset> {
  if (dataset === "demo") return { source: "local", maps: { [horizon]: demoMap(horizon) } };
  const source = import.meta.env.VITE_MI_DATA_SOURCE ?? "neon";
  if (source === "r2") {
    return {
      source: "r2",
      public: await publicOpportunityClient().load(demoOpportunityQuery.seasonKey),
    };
  }
  if (source !== "neon") throw new Error(`Unsupported VITE_MI_DATA_SOURCE ${source}`);
  return { source: "local", maps: { [horizon]: await neonMap(horizon) } };
}

export function opportunityMapFromDataset(
  dataset: OpportunityDataset,
  horizon: OpportunityHorizon,
  replay?: OpportunityReplayArtifactV1,
): OpportunityMap {
  if (dataset.source === "r2") {
    return selectOpportunityMap(
      dataset.public.bundle,
      horizon,
      replay,
      dataset.public.manifest.sourceHealth,
    );
  }
  // while a newly picked horizon is still loading, keep showing the one we have
  const map = dataset.maps[horizon] ?? Object.values(dataset.maps)[0];
  if (!map) throw new Error("No forecast has been loaded");
  return map;
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
