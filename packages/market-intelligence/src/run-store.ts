import type { ForecastRunArtifact } from "./model/v2.ts";

export type ForecastRunReceipt = { runId: string; inserted: boolean };

export interface ForecastRunStore {
  save(artifact: ForecastRunArtifact): Promise<ForecastRunReceipt>;
  read(runId: string): Promise<ForecastRunArtifact | null>;
}

async function artifactHash(artifact: ForecastRunArtifact): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(artifact));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function createMemoryForecastRunStore(): ForecastRunStore {
  const runs = new Map<string, { hash: string; artifact: ForecastRunArtifact }>();
  return {
    async save(artifact) {
      const current = runs.get(artifact.request.runId);
      const hash = await artifactHash(artifact);
      if (current) {
        if (current.hash !== hash) {
          throw new Error(
            `Forecast run ${artifact.request.runId} is immutable and cannot be reused`,
          );
        }
        return { runId: artifact.request.runId, inserted: false };
      }
      runs.set(artifact.request.runId, { hash, artifact: structuredClone(artifact) });
      return { runId: artifact.request.runId, inserted: true };
    },
    async read(runId) {
      const run = runs.get(runId);
      return run ? structuredClone(run.artifact) : null;
    },
  };
}
