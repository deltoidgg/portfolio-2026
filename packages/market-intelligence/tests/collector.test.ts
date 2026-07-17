import { describe, expect, test } from "vite-plus/test";
import {
  createCollectionOrchestrator,
  createMemoryCaptureAttemptStore,
  createMemorySnapshotStore,
  createMemoryStore,
  type CaptureBatch,
  type CollectionJob,
  type MarketIntelligenceStore,
} from "market-intelligence";

const capturedAt = "2026-08-21T12:15:00.000Z";

function batch(sourceKey: string): CaptureBatch {
  return {
    id: `${sourceKey}:${capturedAt}`,
    source: { key: sourceKey, label: sourceKey.toUpperCase(), kind: "aggregator" },
    capturedAt,
    fixtures: [],
    rawSnapshots: [],
    observations: [],
    forecasts: [],
    annotations: [],
  };
}

describe("collection orchestrator", () => {
  test("keeps successful sources when another fails and makes scheduled slots idempotent", async () => {
    const attemptStore = createMemoryCaptureAttemptStore();
    const snapshotStore = createMemorySnapshotStore();
    const marketStore = createMemoryStore();
    let fplCalls = 0;
    let oddsCalls = 0;
    const jobs: CollectionJob[] = [
      {
        sourceKey: "fpl",
        scopeKey: "epl:2026-27:gw1",
        scheduledFor: capturedAt,
        capture: async () => {
          fplCalls += 1;
          return {
            snapshot: {
              sourceKey: "fpl",
              endpoint: "https://fantasy.premierleague.com/api/bootstrap-static/",
              observedAt: capturedAt,
              payload: { elements: [1, 2, 3] },
              statusCode: 200,
            },
            batch: batch("fpl"),
          };
        },
      },
      {
        sourceKey: "odds-api",
        scopeKey: "epl:2026-27:gw1",
        scheduledFor: capturedAt,
        capture: async () => {
          oddsCalls += 1;
          throw new Error("quota exhausted");
        },
      },
    ];
    const orchestrator = createCollectionOrchestrator({
      attemptStore,
      snapshotStore,
      marketStore,
    });

    const first = await orchestrator.tick(jobs);
    const repeated = await orchestrator.tick(jobs);

    expect(first.attempts.map((attempt) => attempt.status)).toEqual(["succeeded", "failed"]);
    expect(first.attempts[1]?.error).toBe("quota exhausted");
    expect(first.attempts[0]?.snapshot?.objectKey).toMatch(/^memory:\/\/raw\/fpl\//);
    expect(repeated.attempts.map((attempt) => attempt.status)).toEqual(["skipped", "skipped"]);
    expect({ fplCalls, oddsCalls }).toEqual({ fplCalls: 1, oddsCalls: 1 });
  });

  test("deduplicates identical raw payload objects without losing capture attempts", async () => {
    const store = createMemorySnapshotStore();
    const snapshot = {
      sourceKey: "fpl",
      endpoint: "https://example.test/fpl",
      observedAt: capturedAt,
      payload: { stable: true },
      statusCode: 200,
    };

    const first = await store.put(snapshot);
    const second = await store.put({ ...snapshot, observedAt: "2026-08-21T12:30:00.000Z" });

    expect(second.objectKey).toBe(first.objectKey);
    expect(second.sha256).toBe(first.sha256);
    expect(await store.count()).toBe(1);
  });

  test("externalises every raw response before saving the canonical batch", async () => {
    let saved: CaptureBatch | undefined;
    const marketStore: MarketIntelligenceStore = {
      async saveBatch(input) {
        saved = input;
        return {
          batchId: input.id,
          inserted: true,
          capturedAt: input.capturedAt,
          fixtures: 0,
          observations: 0,
          forecasts: 0,
          annotations: 0,
        };
      },
      async readDeadlineRoom() {
        return null;
      },
      async saveOpportunitySnapshot() {},
      async readOpportunityMap() {
        return null;
      },
    };
    const input = batch("fpl");
    input.rawSnapshots = [
      {
        key: "bootstrap",
        endpoint: "https://example.test/bootstrap",
        observedAt: capturedAt,
        payload: { elements: [] },
      },
      {
        key: "fixtures",
        endpoint: "https://example.test/fixtures",
        observedAt: capturedAt,
        payload: { fixtures: [] },
      },
    ];
    const orchestrator = createCollectionOrchestrator({
      attemptStore: createMemoryCaptureAttemptStore(),
      snapshotStore: createMemorySnapshotStore(),
      marketStore,
    });

    await orchestrator.tick([
      {
        sourceKey: "fpl",
        scopeKey: "epl:2026-27:gw1",
        scheduledFor: capturedAt,
        capture: async () => ({
          snapshots: input.rawSnapshots.map((snapshot) => ({
            sourceKey: "fpl",
            endpoint: snapshot.endpoint,
            observedAt: snapshot.observedAt,
            payload: snapshot.payload!,
          })),
          batch: input,
        }),
      },
    ]);

    expect(saved?.rawSnapshots).toHaveLength(2);
    expect(saved?.rawSnapshots.every((snapshot) => snapshot.payload === undefined)).toBe(true);
    expect(
      saved?.rawSnapshots.every((snapshot) => snapshot.objectKey?.startsWith("memory://")),
    ).toBe(true);
  });
});
