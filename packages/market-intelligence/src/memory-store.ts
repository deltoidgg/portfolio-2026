import type { CaptureBatch, DeadlineRoomQuery } from "./contracts.ts";
import { projectDeadlineRoom } from "./deadline-room.ts";
import { captureReceipt, type MarketIntelligenceStore } from "./store.ts";

function matchesQuery(batch: CaptureBatch, query: DeadlineRoomQuery) {
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
            forecast.gameweek === query.gameweek,
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
  };
}
