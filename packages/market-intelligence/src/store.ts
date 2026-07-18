import type { CaptureBatch, DeadlineRoom, DeadlineRoomQuery, IngestReceipt } from "./contracts.ts";
import type {
  OpportunityMap,
  OpportunityMapQuery,
  OpportunitySnapshot,
} from "./opportunity-map.ts";

export function captureReceipt(batch: CaptureBatch, inserted: boolean): IngestReceipt {
  return {
    batchId: batch.id,
    inserted,
    capturedAt: batch.capturedAt,
    fixtures: batch.fixtures.length,
    observations: batch.observations.length,
    forecasts: batch.forecasts.length,
    annotations: batch.annotations.length,
  };
}

export interface MarketIntelligenceStore {
  saveBatch(batch: CaptureBatch): Promise<IngestReceipt>;
  readDeadlineRoom(query: DeadlineRoomQuery): Promise<DeadlineRoom | null>;
  saveOpportunitySnapshot(snapshot: OpportunitySnapshot): Promise<void>;
  readOpportunityMap(query: OpportunityMapQuery): Promise<OpportunityMap | null>;
}
