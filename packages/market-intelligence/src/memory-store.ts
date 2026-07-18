import type { CaptureBatch, DeadlineRoomQuery } from "./contracts.ts";
import { projectDeadlineRoom } from "./deadline-room.ts";
import {
  opportunityMapQuerySchema,
  opportunitySnapshotSchema,
  projectOpportunityMap,
  type OpportunitySnapshot,
} from "./opportunity-map.ts";
import { captureReceipt, type MarketIntelligenceStore } from "./store.ts";

function matchesQuery(batch: CaptureBatch, query: DeadlineRoomQuery) {
  const datasetKey = query.datasetKey ?? "live";
  const batchDatasetKey =
    typeof batch.metadata?.datasetKey === "string" ? batch.metadata.datasetKey : "live";
  if (batchDatasetKey !== datasetKey) return false;
  return (
    batch.fixtures.some(
      (fixture) =>
        fixture.competition === query.competition &&
        fixture.season === query.season &&
        fixture.gameweek === query.gameweek,
    ) ||
    batch.forecasts.some(
      (forecast) =>
        forecast.competition === query.competition &&
        forecast.season === query.season &&
        forecast.gameweek === query.gameweek,
    )
  );
}

export function createMemoryStore(
  options: { mode?: "demo" | "neon" } = {},
): MarketIntelligenceStore {
  const batches = new Map<string, CaptureBatch>();
  const opportunitySnapshots = new Map<string, OpportunitySnapshot>();
  const dataMode = options.mode ?? "demo";

  return {
    async saveBatch(batch) {
      if (batches.has(batch.id)) return captureReceipt(batch, false);
      batches.set(batch.id, structuredClone(batch));
      return captureReceipt(batch, true);
    },

    async readDeadlineRoom(query) {
      const selected = [...batches.values()].filter((batch) => matchesQuery(batch, query));
      const forecasts = selected.flatMap((batch) =>
        batch.forecasts.filter(
          (forecast) =>
            forecast.competition === query.competition &&
            forecast.season === query.season &&
            forecast.gameweek === query.gameweek &&
            (forecast.datasetKey ?? "live") === (query.datasetKey ?? "live"),
        ),
      );
      return projectDeadlineRoom({
        query,
        dataMode,
        fixtures: selected.flatMap((batch) => batch.fixtures),
        forecasts,
        sourceCaptures: selected.map((batch) => ({
          source: batch.source,
          capturedAt: batch.capturedAt,
        })),
        annotations: selected.flatMap((batch) => batch.annotations),
      });
    },

    async saveOpportunitySnapshot(snapshot) {
      const parsed = opportunitySnapshotSchema.parse(snapshot);
      opportunitySnapshots.set(parsed.key, structuredClone(parsed));
    },

    async readOpportunityMap(untrustedQuery) {
      const query = opportunityMapQuerySchema.parse(untrustedQuery);
      const selected = [...opportunitySnapshots.values()]
        .filter(
          (snapshot) =>
            snapshot.datasetKey === query.datasetKey &&
            snapshot.season.key === query.seasonKey &&
            snapshot.fromGameweek === query.fromGameweek &&
            snapshot.horizon === query.horizon &&
            (!query.snapshotAt || snapshot.observedAt <= query.snapshotAt),
        )
        .toSorted((a, b) => a.observedAt.localeCompare(b.observedAt))
        .at(-1);
      return selected ? projectOpportunityMap(structuredClone(selected)) : null;
    },
  };
}
