import type { ForecastInputState, HotArtifactReference } from "./hot-state.ts";

const MEBIBYTE = 1024 * 1024;
export const DATABASE_WARNING_BYTES = 75 * MEBIBYTE;
export const DATABASE_WRITE_CEILING_BYTES = 100 * MEBIBYTE;

export type PipelineMode = "auto" | "force-collect" | "finalise" | "retention" | "verify";
export type ArtifactChannel = "next" | "production";
export type PipelineSource = "premier-league-schedule" | "fpl" | "fpl-element-summary" | "odds-api";

export type ScheduledPipelineInput = {
  mode: PipelineMode;
  now: string;
  channel: ArtifactChannel;
  codeVersion: string;
};

export type PipelinePlan = {
  nominalSlot: string;
  dueSources: PipelineSource[];
  retentionDue: boolean;
  finalisationDue: boolean;
  verificationDue: boolean;
  reason: string;
};

export type PipelineCaptureReceipt = {
  sourceKey: PipelineSource;
  rawObjects: HotArtifactReference[];
  captureHash: string;
  modelInputHash: string;
  modelInputChanged: boolean;
  displayStateChanged: boolean;
  sourceHealthChanged?: boolean;
  changedRows: {
    playerStates: number;
    playerPriors: number;
    fixtureMarkets: number;
  };
};

export type PipelinePublicationReceipt = {
  runId?: string;
  publicationId?: string;
  privateBytes: number;
  publicBytes: number;
  replayBytes: number;
};

export type LedgerPruneReceipt = {
  exportedKey?: string;
  exportedRows: number;
  succeededOrSkipped: number;
  failedOrPartial: number;
  publicationHeaders?: number;
  seasonArchiveKey?: string;
  seasonRowsPruned?: number;
  r2Bytes: number;
};

export type PipelineFinalisationReceipt = {
  status: "not-due" | "pending" | "final" | "failed";
  gameweek?: number;
  evaluationStatus?: "not-due" | "completed" | "failed";
  evaluationKey?: string;
};

export type PipelineVerificationReceipt = {
  status: "not-due" | "passed" | "failed";
  detail?: string;
};

export type PipelineWorker = {
  databaseSize(this: void): Promise<number>;
  collect(
    this: void,
    sourceKey: PipelineSource,
    nominalSlot: string,
  ): Promise<PipelineCaptureReceipt>;
  loadForecastState(this: void, cutoffAt: string): Promise<ForecastInputState | null>;
  forecastAndPublish(
    this: void,
    input: {
      state: ForecastInputState;
      channel: ArtifactChannel;
      codeVersion: string;
      now: string;
      modelInputChanged: boolean;
      displayStateChanged: boolean;
      sourceHealthChanged: boolean;
    },
  ): Promise<PipelinePublicationReceipt>;
  exportLedgerAndPrune(this: void, now: string): Promise<LedgerPruneReceipt>;
  finalise(this: void, now: string): Promise<PipelineFinalisationReceipt>;
  verify(this: void, now: string, channel: ArtifactChannel): Promise<PipelineVerificationReceipt>;
  close(this: void): Promise<void>;
};

export type PipelineReceipt = {
  nominalSlot: string;
  neonOpened: boolean;
  dueSources: PipelineSource[];
  reason: string;
  captures: PipelineCaptureReceipt[];
  modelRunId?: string;
  publicationId?: string;
  r2Bytes: {
    raw: number;
    privateForecast: number;
    public: number;
    ledger: number;
  };
  databaseBytes?: {
    before: number;
    after: number;
  };
  storage: {
    status: "ok" | "warning" | "blocked";
    warningAtBytes: number;
    ceilingBytes: number;
    detail?: string;
  };
  pruning?: LedgerPruneReceipt;
  finalisation?: PipelineFinalisationReceipt;
  evaluation?: {
    status: "not-due" | "completed" | "failed";
    key?: string;
  };
  verification?: PipelineVerificationReceipt;
  durationMs: number;
};

type ScheduledPipelineDependencies = {
  plan(input: ScheduledPipelineInput): Promise<PipelinePlan>;
  open(input: ScheduledPipelineInput): Promise<PipelineWorker>;
  clock?: () => number;
};

function hasWork(plan: PipelinePlan): boolean {
  return (
    plan.dueSources.length > 0 || plan.retentionDue || plan.finalisationDue || plan.verificationDue
  );
}

function rawBytes(captures: PipelineCaptureReceipt[]): number {
  return captures.reduce(
    (total, capture) =>
      total +
      capture.rawObjects.reduce((sourceTotal, object) => sourceTotal + object.compressedBytes, 0),
    0,
  );
}

export function isEligibleDeadlineCheckpoint(input: {
  forecastObservedAt: string;
  publishedAt: string;
  deadlineAt: string;
}): boolean {
  const deadline = Date.parse(input.deadlineAt);
  return (
    Number.isFinite(deadline) &&
    Date.parse(input.forecastObservedAt) <= deadline &&
    Date.parse(input.publishedAt) <= deadline
  );
}

export function createScheduledPipeline(dependencies: ScheduledPipelineDependencies) {
  return async function runScheduledPipeline(
    input: ScheduledPipelineInput,
  ): Promise<PipelineReceipt> {
    const clock = dependencies.clock ?? Date.now;
    const startedAt = clock();
    const plan = await dependencies.plan(input);
    const base = {
      nominalSlot: plan.nominalSlot,
      dueSources: plan.dueSources,
      reason: plan.reason,
      captures: [] as PipelineCaptureReceipt[],
      r2Bytes: { raw: 0, privateForecast: 0, public: 0, ledger: 0 },
      storage: {
        status: "ok" as const,
        warningAtBytes: DATABASE_WARNING_BYTES,
        ceilingBytes: DATABASE_WRITE_CEILING_BYTES,
      },
    };
    if (!hasWork(plan)) {
      return { ...base, neonOpened: false, durationMs: Math.max(0, clock() - startedAt) };
    }

    const worker = await dependencies.open(input);
    let databaseBefore = 0;
    let databaseAfter = 0;
    let pruning: LedgerPruneReceipt | undefined;
    try {
      databaseBefore = await worker.databaseSize();
      let storageStatus: PipelineReceipt["storage"] =
        databaseBefore >= DATABASE_WARNING_BYTES
          ? {
              status: "warning",
              warningAtBytes: DATABASE_WARNING_BYTES,
              ceilingBytes: DATABASE_WRITE_CEILING_BYTES,
              detail: `Database is ${(databaseBefore / MEBIBYTE).toFixed(1)} MiB`,
            }
          : base.storage;
      if (plan.retentionDue || databaseBefore >= DATABASE_WRITE_CEILING_BYTES) {
        pruning = await worker.exportLedgerAndPrune(input.now);
        base.r2Bytes.ledger = pruning.r2Bytes;
      }
      const afterRetention = pruning ? await worker.databaseSize() : databaseBefore;
      const storageBlocked = afterRetention >= DATABASE_WRITE_CEILING_BYTES;
      if (storageBlocked) {
        storageStatus = {
          status: "blocked",
          warningAtBytes: DATABASE_WARNING_BYTES,
          ceilingBytes: DATABASE_WRITE_CEILING_BYTES,
          detail: `Storage-increasing writes refused at ${(afterRetention / MEBIBYTE).toFixed(1)} MiB`,
        };
      } else if (afterRetention >= DATABASE_WARNING_BYTES) {
        storageStatus = {
          status: "warning",
          warningAtBytes: DATABASE_WARNING_BYTES,
          ceilingBytes: DATABASE_WRITE_CEILING_BYTES,
          detail: `Database is ${(afterRetention / MEBIBYTE).toFixed(1)} MiB after retention`,
        };
      } else {
        storageStatus = base.storage;
      }

      const captures: PipelineCaptureReceipt[] = [];
      if (!storageBlocked) {
        for (const sourceKey of plan.dueSources) {
          captures.push(await worker.collect(sourceKey, plan.nominalSlot));
        }
      }
      base.captures = captures;
      base.r2Bytes.raw = rawBytes(captures);
      const modelInputChanged = captures.some((capture) => capture.modelInputChanged);
      const displayStateChanged = captures.some((capture) => capture.displayStateChanged);
      const sourceHealthChanged = captures.some((capture) => capture.sourceHealthChanged);
      let publication: PipelinePublicationReceipt | undefined;
      if (
        !storageBlocked &&
        (captures.length > 0 || modelInputChanged || displayStateChanged || sourceHealthChanged)
      ) {
        const state = await worker.loadForecastState(input.now);
        if (state) {
          publication = await worker.forecastAndPublish({
            state,
            channel: input.channel,
            codeVersion: input.codeVersion,
            now: input.now,
            modelInputChanged,
            displayStateChanged,
            sourceHealthChanged,
          });
          base.r2Bytes.privateForecast = publication.privateBytes;
          base.r2Bytes.public = publication.publicBytes + publication.replayBytes;
        }
      }

      const finalisation = plan.finalisationDue ? await worker.finalise(input.now) : undefined;
      const verification = plan.verificationDue
        ? await worker.verify(input.now, input.channel)
        : undefined;
      databaseAfter = await worker.databaseSize();
      return {
        ...base,
        neonOpened: true,
        storage: storageStatus,
        ...(publication?.runId ? { modelRunId: publication.runId } : {}),
        ...(publication?.publicationId ? { publicationId: publication.publicationId } : {}),
        databaseBytes: { before: databaseBefore, after: databaseAfter },
        ...(pruning ? { pruning } : {}),
        ...(finalisation ? { finalisation } : {}),
        ...(finalisation?.evaluationStatus
          ? {
              evaluation: {
                status: finalisation.evaluationStatus,
                ...(finalisation.evaluationKey ? { key: finalisation.evaluationKey } : {}),
              },
            }
          : {}),
        ...(verification ? { verification } : {}),
        durationMs: Math.max(0, clock() - startedAt),
      };
    } finally {
      await worker.close();
    }
  };
}
