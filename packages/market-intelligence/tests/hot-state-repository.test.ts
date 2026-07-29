import { describe, expect, test } from "vite-plus/test";
import {
  createMemoryHotStateRepository,
  type CanonicalCaptureCommit,
  type CollectionSlot,
} from "market-intelligence";

const slot: CollectionSlot = {
  attemptKey: "fpl:epl:2026-27:2026-07-29T08:00:00.000Z",
  sourceKey: "fpl",
  seasonKey: "epl:2026-27",
  scopeKey: "epl:2026-27",
  scheduledFor: "2026-07-29T08:00:00.000Z",
};

function commit(capturedAt: string, price: number): CanonicalCaptureCommit {
  return {
    slot,
    batchId: `fpl:${capturedAt}`,
    capturedAt,
    captureHash: "a".repeat(64),
    modelInputHash: `${price}`.padStart(64, "0"),
    rawObjects: [
      {
        key: `raw/fpl/${capturedAt}.json.gz`,
        sha256: "b".repeat(64),
        compressedBytes: 10,
        uncompressedBytes: 20,
      },
    ],
    playerStates: [
      {
        registrationKey: "epl:2026-27:registration:fpl-1",
        seasonKey: "epl:2026-27",
        observedAt: capturedAt,
        price,
        ownership: 20,
        availabilityProbability: 1,
        minutes: 0,
        starts: 0,
        rowHash: "c".repeat(64),
      },
    ],
  };
}

describe("hot-state repository", () => {
  test("claims each nominal source slot once and exposes committed current state", async () => {
    const repository = createMemoryHotStateRepository();

    expect(await repository.claim(slot)).toBe(true);
    expect(await repository.claim(slot)).toBe(false);
    const receipt = await repository.commit(commit("2026-07-29T08:01:00.000Z", 7.5));
    const state = await repository.loadState({
      seasonKey: "epl:2026-27",
      cutoffAt: "2026-07-29T08:02:00.000Z",
    });

    expect(receipt.changedRows.playerStates).toBe(1);
    expect(state?.playerStates[0]?.price).toBe(7.5);
    expect(state?.sourceHeads[0]).toEqual(
      expect.objectContaining({ sourceKey: "fpl", lastAttemptStatus: "succeeded" }),
    );
  });

  test("rejects a late state overwrite and keeps the last success after failure", async () => {
    const repository = createMemoryHotStateRepository();
    await repository.claim(slot);
    await repository.commit(commit("2026-07-29T08:01:00.000Z", 7.5));

    const lateSlot = { ...slot, attemptKey: "late", scheduledFor: "2026-07-29T07:00:00.000Z" };
    await repository.claim(lateSlot);
    const lateReceipt = await repository.commit({
      ...commit("2026-07-29T07:01:00.000Z", 4.5),
      slot: lateSlot,
      batchId: "late",
    });
    const failedSlot = {
      ...slot,
      attemptKey: "failed",
      scheduledFor: "2026-07-29T09:00:00.000Z",
    };
    await repository.claim(failedSlot);
    await repository.fail({
      slot: failedSlot,
      finishedAt: "2026-07-29T09:01:00.000Z",
      error: "provider unavailable",
    });
    const state = await repository.loadState({
      seasonKey: "epl:2026-27",
      cutoffAt: "2026-07-29T09:02:00.000Z",
    });

    expect(state?.playerStates[0]?.price).toBe(7.5);
    expect(lateReceipt).toEqual(
      expect.objectContaining({
        captureChanged: false,
        modelInputChanged: false,
        changedRows: { playerStates: 0, playerPriors: 0, fixtureMarkets: 0 },
      }),
    );
    expect(state?.sourceHeads[0]).toEqual(
      expect.objectContaining({
        lastAttemptStatus: "failed",
        lastSuccessfulCapturedAt: "2026-07-29T08:01:00.000Z",
      }),
    );
  });

  test("replaces a complete odds snapshot without deleting unchanged rows", async () => {
    const repository = createMemoryHotStateRepository();
    const oddsSlot = {
      ...slot,
      attemptKey: "odds:one",
      sourceKey: "odds-api",
    };
    await repository.claim(oddsSlot);
    await repository.commit({
      ...commit("2026-07-29T08:01:00.000Z", 7.5),
      slot: oddsSlot,
      playerStates: undefined,
      fixtureMarkets: [
        {
          sourceKey: "odds-api",
          fixtureKey: "fixture-1",
          seasonKey: slot.seasonKey,
          observedAt: "2026-07-29T08:01:00.000Z",
          homeGoalRate: 1.4,
          awayGoalRate: 1.1,
          marketCoverage: 1,
          sourceAgreement: 0.9,
          bookmakerCount: 5,
          projectionVersion: "v1",
          rowHash: "1".repeat(64),
        },
        {
          sourceKey: "odds-api",
          fixtureKey: "fixture-2",
          seasonKey: slot.seasonKey,
          observedAt: "2026-07-29T08:01:00.000Z",
          homeGoalRate: 1.2,
          awayGoalRate: 1,
          marketCoverage: 1,
          sourceAgreement: 0.8,
          bookmakerCount: 4,
          projectionVersion: "v1",
          rowHash: "2".repeat(64),
        },
      ],
    });

    const nextSlot = {
      ...oddsSlot,
      attemptKey: "odds:two",
      scheduledFor: "2026-07-29T09:00:00.000Z",
    };
    await repository.claim(nextSlot);
    const receipt = await repository.commit({
      ...commit("2026-07-29T09:01:00.000Z", 7.5),
      slot: nextSlot,
      playerStates: undefined,
      fixtureMarkets: [
        {
          sourceKey: "odds-api",
          fixtureKey: "fixture-1",
          seasonKey: slot.seasonKey,
          observedAt: "2026-07-29T09:01:00.000Z",
          homeGoalRate: 1.4,
          awayGoalRate: 1.1,
          marketCoverage: 1,
          sourceAgreement: 0.9,
          bookmakerCount: 5,
          projectionVersion: "v1",
          rowHash: "1".repeat(64),
        },
      ],
    });
    const state = await repository.loadState({
      seasonKey: slot.seasonKey,
      cutoffAt: "2026-07-29T09:02:00.000Z",
    });

    expect(state?.fixtureMarkets.map((market) => market.fixtureKey)).toEqual(["fixture-1"]);
    expect(receipt.changedRows.fixtureMarkets).toBe(1);
  });

  test("retains failed attempts for 30 days and successes for 14 days", async () => {
    const repository = createMemoryHotStateRepository();
    await repository.claim(slot);
    await repository.commit(commit("2026-07-01T08:01:00.000Z", 7.5));
    const failedSlot = {
      ...slot,
      attemptKey: "failed-retention",
      scheduledFor: "2026-07-02T08:00:00.000Z",
    };
    await repository.claim(failedSlot);
    await repository.fail({
      slot: failedSlot,
      finishedAt: "2026-07-02T08:01:00.000Z",
      error: "provider unavailable",
    });

    expect(await repository.prune("2026-07-20T08:02:00.000Z")).toEqual({
      succeededOrSkipped: 1,
      failedOrPartial: 0,
    });
    expect(await repository.prune("2026-08-02T08:02:00.000Z")).toEqual({
      succeededOrSkipped: 0,
      failedOrPartial: 1,
    });
  });
});
