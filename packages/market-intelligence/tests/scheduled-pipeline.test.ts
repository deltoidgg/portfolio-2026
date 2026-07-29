import { describe, expect, it, vi } from "vitest";
import type { ForecastInputState } from "../src/hot-cold/hot-state.ts";
import {
  createScheduledPipeline,
  isEligibleDeadlineCheckpoint,
  type PipelinePlan,
  type PipelineWorker,
} from "../src/hot-cold/scheduled-pipeline.ts";

const now = "2026-07-29T10:15:00.000Z";
const emptyState: ForecastInputState = {
  seasonKey: "epl:2026-27",
  sourceHeads: [],
  playerStates: [],
  playerPriors: [],
  fixtureMarkets: [],
};

function plan(overrides: Partial<PipelinePlan> = {}): PipelinePlan {
  return {
    nominalSlot: now,
    dueSources: [],
    retentionDue: false,
    finalisationDue: false,
    verificationDue: false,
    reason: "test",
    ...overrides,
  };
}

function worker(overrides: Partial<PipelineWorker> = {}): PipelineWorker {
  return {
    databaseSize: vi.fn(async () => 40 * 1024 * 1024),
    collect: vi.fn(async (sourceKey) => ({
      sourceKey,
      rawObjects: [
        {
          key: `raw/${sourceKey}/capture.json.gz`,
          sha256: "a".repeat(64),
          compressedBytes: 100,
          uncompressedBytes: 1_000,
        },
      ],
      captureHash: "b".repeat(64),
      modelInputHash: "c".repeat(64),
      modelInputChanged: true,
      displayStateChanged: true,
      changedRows: { playerStates: 1, playerPriors: 0, fixtureMarkets: 0 },
    })),
    loadForecastState: vi.fn(async () => emptyState),
    forecastAndPublish: vi.fn(async () => ({
      runId: "run-1",
      publicationId: "publication-1",
      privateBytes: 200,
      publicBytes: 100,
      replayBytes: 20,
    })),
    exportLedgerAndPrune: vi.fn(async () => ({
      exportedKey: "ledger/v1/epl-2026-27/2026-07-29/hash.json.gz",
      exportedRows: 2,
      succeededOrSkipped: 1,
      failedOrPartial: 1,
      r2Bytes: 50,
    })),
    finalise: vi.fn(async () => ({ status: "not-due" as const, gameweek: 0 })),
    verify: vi.fn(async () => ({ status: "not-due" as const })),
    close: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("scheduled hot/cold pipeline", () => {
  it("excludes forecasts or publications that cross the gameweek deadline", () => {
    const deadlineAt = "2026-08-21T17:30:00.000Z";
    expect(
      isEligibleDeadlineCheckpoint({
        forecastObservedAt: "2026-08-21T17:15:00.000Z",
        publishedAt: "2026-08-21T17:20:00.000Z",
        deadlineAt,
      }),
    ).toBe(true);
    expect(
      isEligibleDeadlineCheckpoint({
        forecastObservedAt: "2026-08-21T17:15:00.000Z",
        publishedAt: "2026-08-21T17:31:00.000Z",
        deadlineAt,
      }),
    ).toBe(false);
  });

  it("does not open Neon when the gate finds no work", async () => {
    const open = vi.fn(async () => worker());
    const run = createScheduledPipeline({ plan: async () => plan(), open, clock: () => 0 });

    const receipt = await run({
      mode: "auto",
      now,
      channel: "production",
      codeVersion: "test",
    });

    expect(open).not.toHaveBeenCalled();
    expect(receipt.neonOpened).toBe(false);
    expect(receipt.dueSources).toEqual([]);
  });

  it("opens one worker, loads state once, and publishes all changed sources together", async () => {
    const activeWorker = worker();
    const run = createScheduledPipeline({
      plan: async () => plan({ dueSources: ["fpl", "odds-api"] }),
      open: async () => activeWorker,
      clock: (() => {
        let value = 0;
        return () => (value += 5);
      })(),
    });

    const receipt = await run({
      mode: "auto",
      now,
      channel: "next",
      codeVersion: "test",
    });

    expect(activeWorker.collect).toHaveBeenCalledTimes(2);
    expect(activeWorker.loadForecastState).toHaveBeenCalledTimes(1);
    expect(activeWorker.forecastAndPublish).toHaveBeenCalledTimes(1);
    expect(activeWorker.close).toHaveBeenCalledOnce();
    expect(receipt).toMatchObject({
      neonOpened: true,
      modelRunId: "run-1",
      publicationId: "publication-1",
      r2Bytes: { raw: 200, privateForecast: 200, public: 120, ledger: 0 },
    });
  });

  it("checks for a staged retry after an unchanged due capture without creating a receipt row", async () => {
    const activeWorker = worker({
      collect: vi.fn(async (sourceKey) => ({
        sourceKey,
        rawObjects: [],
        captureHash: "b".repeat(64),
        modelInputHash: "c".repeat(64),
        modelInputChanged: false,
        displayStateChanged: false,
        sourceHealthChanged: false,
        changedRows: { playerStates: 0, playerPriors: 0, fixtureMarkets: 0 },
      })),
      forecastAndPublish: vi.fn(async () => ({
        privateBytes: 0,
        publicBytes: 0,
        replayBytes: 0,
      })),
    });
    const run = createScheduledPipeline({
      plan: async () => plan({ dueSources: ["fpl"] }),
      open: async () => activeWorker,
      clock: () => 0,
    });

    const receipt = await run({
      mode: "auto",
      now,
      channel: "production",
      codeVersion: "test",
    });

    expect(activeWorker.loadForecastState).toHaveBeenCalledOnce();
    expect(activeWorker.forecastAndPublish).toHaveBeenCalledOnce();
    expect(receipt.modelRunId).toBeUndefined();
    expect(receipt.publicationId).toBeUndefined();
  });

  it("runs retention first and blocks storage-increasing work above 100 MB", async () => {
    const activeWorker = worker({
      databaseSize: vi
        .fn<PipelineWorker["databaseSize"]>()
        .mockResolvedValueOnce(101 * 1024 * 1024)
        .mockResolvedValueOnce(100.5 * 1024 * 1024)
        .mockResolvedValueOnce(100.5 * 1024 * 1024),
    });
    const run = createScheduledPipeline({
      plan: async () => plan({ dueSources: ["fpl"], retentionDue: false, finalisationDue: false }),
      open: async () => activeWorker,
      clock: () => 0,
    });

    const receipt = await run({
      mode: "auto",
      now,
      channel: "production",
      codeVersion: "test",
    });

    expect(activeWorker.exportLedgerAndPrune).toHaveBeenCalledOnce();
    expect(activeWorker.collect).not.toHaveBeenCalled();
    expect(receipt.storage.status).toBe("blocked");
    expect(receipt.pruning?.exportedRows).toBe(2);
  });
});
