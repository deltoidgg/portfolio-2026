import type { CaptureBatch, JsonValue } from "./contracts.ts";
import type { MarketIntelligenceStore } from "./store.ts";

export type SnapshotEnvelope = {
  sourceKey: string;
  endpoint: string;
  observedAt: string;
  payload: JsonValue;
  statusCode?: number;
  headers?: Record<string, string>;
};

export type StoredSnapshot = {
  objectKey: string;
  sha256: string;
  compressedBytes: number;
  uncompressedBytes: number;
  encoding: "gzip" | "identity";
  contentType: "application/json";
};

export interface SnapshotStore {
  put(snapshot: SnapshotEnvelope): Promise<StoredSnapshot>;
}

export type MemorySnapshotStore = SnapshotStore & {
  count(): Promise<number>;
  read(sha256: string): Promise<string | null>;
};

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string): Promise<string> {
  return hex(await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

export function createMemorySnapshotStore(): MemorySnapshotStore {
  const objects = new Map<string, string>();
  return {
    async put(snapshot) {
      const serialized = JSON.stringify(snapshot.payload);
      const digest = await sha256(serialized);
      objects.set(digest, serialized);
      const date = snapshot.observedAt.slice(0, 10).replaceAll("-", "/");
      return {
        objectKey: `memory://raw/${snapshot.sourceKey}/${date}/${digest}.json`,
        sha256: digest,
        compressedBytes: new TextEncoder().encode(serialized).byteLength,
        uncompressedBytes: new TextEncoder().encode(serialized).byteLength,
        encoding: "identity",
        contentType: "application/json",
      };
    },
    async count() {
      return objects.size;
    },
    async read(digest) {
      return objects.get(digest) ?? null;
    },
  };
}

export type CaptureAttemptStatus = "running" | "succeeded" | "partial" | "failed" | "skipped";

export type CaptureAttempt = {
  key: string;
  sourceKey: string;
  scopeKey: string;
  scheduledFor: string;
  status: CaptureAttemptStatus;
  startedAt?: string;
  finishedAt?: string;
  batchId?: string;
  snapshot?: StoredSnapshot;
  error?: string;
};

export interface CaptureAttemptStore {
  claim(attempt: CaptureAttempt): Promise<boolean>;
  finish(attempt: CaptureAttempt): Promise<void>;
  read(key: string): Promise<CaptureAttempt | null>;
  list(): Promise<CaptureAttempt[]>;
}

export function createMemoryCaptureAttemptStore(): CaptureAttemptStore {
  const attempts = new Map<string, CaptureAttempt>();
  return {
    async claim(attempt) {
      if (attempts.has(attempt.key)) return false;
      attempts.set(attempt.key, structuredClone(attempt));
      return true;
    },
    async finish(attempt) {
      attempts.set(attempt.key, structuredClone(attempt));
    },
    async read(key) {
      const attempt = attempts.get(key);
      return attempt ? structuredClone(attempt) : null;
    },
    async list() {
      return [...attempts.values()].map((attempt) => structuredClone(attempt));
    },
  };
}

export type CollectionCapture = {
  snapshot?: SnapshotEnvelope;
  snapshots?: SnapshotEnvelope[];
  batch: CaptureBatch;
};

export function collectionFromBatch(batch: CaptureBatch): CollectionCapture {
  return {
    batch,
    snapshots: batch.rawSnapshots.flatMap((snapshot) =>
      snapshot.payload === undefined
        ? []
        : [
            {
              sourceKey: batch.source.key,
              endpoint: snapshot.endpoint,
              observedAt: snapshot.observedAt,
              payload: snapshot.payload,
              ...(snapshot.statusCode === undefined ? {} : { statusCode: snapshot.statusCode }),
            },
          ],
    ),
  };
}

export type CollectionJob = {
  sourceKey: string;
  scopeKey: string;
  scheduledFor: string;
  capture(): Promise<CollectionCapture>;
};

export interface CollectionOrchestrator {
  tick(jobs: CollectionJob[]): Promise<{ attempts: CaptureAttempt[] }>;
}

function attemptKey(job: CollectionJob): string {
  return `${job.sourceKey}:${job.scopeKey}:${job.scheduledFor}`;
}

function safeError(error: unknown): string {
  if (!(error instanceof Error)) return "Unknown collection failure";
  return error.message
    .replaceAll(/([?&](?:api[_-]?key|token|secret)=)[^&\s]+/gi, "$1[redacted]")
    .slice(0, 1_000);
}

export function createCollectionOrchestrator({
  attemptStore,
  snapshotStore,
  marketStore,
}: {
  attemptStore: CaptureAttemptStore;
  snapshotStore: SnapshotStore;
  marketStore: MarketIntelligenceStore;
}): CollectionOrchestrator {
  return {
    async tick(jobs) {
      const attempts: CaptureAttempt[] = [];
      for (const job of jobs) {
        const key = attemptKey(job);
        const running: CaptureAttempt = {
          key,
          sourceKey: job.sourceKey,
          scopeKey: job.scopeKey,
          scheduledFor: job.scheduledFor,
          status: "running",
          startedAt: job.scheduledFor,
        };
        if (!(await attemptStore.claim(running))) {
          attempts.push({ ...running, status: "skipped", finishedAt: job.scheduledFor });
          continue;
        }
        try {
          const captured = await job.capture();
          const envelopes = captured.snapshots ?? (captured.snapshot ? [captured.snapshot] : []);
          if (envelopes.length === 0) throw new Error("Collection produced no raw snapshots");
          const storedSnapshots = await Promise.all(
            envelopes.map((snapshot) => snapshotStore.put(snapshot)),
          );
          const batch = structuredClone(captured.batch);
          batch.rawSnapshots = batch.rawSnapshots.map((raw, index) => {
            const stored = storedSnapshots[index];
            if (!stored) return raw;
            const { payload: _payload, ...reference } = raw;
            return {
              ...reference,
              objectKey: stored.objectKey,
              sha256: stored.sha256,
              compressedBytes: stored.compressedBytes,
              uncompressedBytes: stored.uncompressedBytes,
              contentEncoding: stored.encoding,
              contentType: stored.contentType,
            };
          });
          const receipt = await marketStore.saveBatch(batch);
          const completed: CaptureAttempt = {
            ...running,
            status: "succeeded",
            finishedAt: captured.batch.capturedAt,
            batchId: receipt.batchId,
            snapshot: storedSnapshots[0],
          };
          await attemptStore.finish(completed);
          attempts.push(completed);
        } catch (error) {
          const failed: CaptureAttempt = {
            ...running,
            status: "failed",
            finishedAt: job.scheduledFor,
            error: safeError(error),
          };
          await attemptStore.finish(failed);
          attempts.push(failed);
        }
      }
      return { attempts };
    },
  };
}
