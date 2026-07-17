import {
  captureBatchSchema,
  deadlineRoomQuerySchema,
  type CaptureBatch,
  type DeadlineRoom,
  type DeadlineRoomQuery,
  type IngestReceipt,
} from "./contracts.ts";
import type { MarketIntelligenceStore } from "./store.ts";

export type MarketSourceAdapter<TRequest = void> = {
  key: string;
  capture(request: TRequest): Promise<CaptureBatch>;
};

export type MarketIntelligence = {
  ingest(batch: CaptureBatch): Promise<IngestReceipt>;
  capture<TRequest>(
    adapter: MarketSourceAdapter<TRequest>,
    request: TRequest,
  ): Promise<IngestReceipt>;
  getDeadlineRoom(query: DeadlineRoomQuery): Promise<DeadlineRoom>;
};

export function createMarketIntelligence({
  store,
}: {
  store: MarketIntelligenceStore;
}): MarketIntelligence {
  async function ingest(batch: CaptureBatch) {
    return store.saveBatch(captureBatchSchema.parse(batch));
  }

  return {
    ingest,
    async capture(adapter, request) {
      return ingest(await adapter.capture(request));
    },
    async getDeadlineRoom(query) {
      const parsedQuery = deadlineRoomQuerySchema.parse(query);
      const room = await store.readDeadlineRoom(parsedQuery);
      if (!room) {
        throw new Error(
          `No deadline-room data for ${parsedQuery.competition} ${parsedQuery.season} GW${parsedQuery.gameweek}`,
        );
      }
      return room;
    },
  };
}
