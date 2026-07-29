import { gunzipSync } from "node:zlib";
import { createR2ArtifactStore } from "./r2-artifact-store.ts";
import { requiredEnvironment } from "./load-env.ts";

function endpoint(): string {
  return (
    process.env.R2_ENDPOINT ??
    `https://${requiredEnvironment("CLOUDFLARE_ACCOUNT_ID")}.r2.cloudflarestorage.com`
  );
}

export function createCutoverPrivateStore() {
  return createR2ArtifactStore({
    bucket: requiredEnvironment("R2_PRIVATE_BUCKET"),
    endpoint: endpoint(),
    accessKeyId: requiredEnvironment("R2_PRIVATE_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnvironment("R2_PRIVATE_SECRET_ACCESS_KEY"),
  });
}

export function createCutoverPublicStore() {
  return createR2ArtifactStore({
    bucket: requiredEnvironment("R2_PUBLIC_BUCKET"),
    endpoint: endpoint(),
    accessKeyId: requiredEnvironment("R2_PUBLIC_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnvironment("R2_PUBLIC_SECRET_ACCESS_KEY"),
  });
}

export function freezeAt(): string {
  const value = process.env.MI_CUTOVER_AT?.trim() || new Date().toISOString();
  if (!Number.isFinite(Date.parse(value)))
    throw new Error("MI_CUTOVER_AT must be an ISO date-time");
  return new Date(value).toISOString();
}

export function uncompressedBody(body: Uint8Array, encoding?: string): Uint8Array {
  return encoding === "gzip" ? new Uint8Array(gunzipSync(body)) : body;
}
