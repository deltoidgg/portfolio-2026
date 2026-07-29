import { describe, expect, test } from "vite-plus/test";
import { createMemoryArtifactStore, type CurrentOpportunityManifestV1 } from "market-intelligence";

const digest = "a".repeat(64);

function manifest(publicationId = "publication-1"): CurrentOpportunityManifestV1 {
  return {
    schemaVersion: "opportunity-current/v1",
    seasonKey: "epl:2026-27",
    checkedAt: "2026-07-29T08:00:00.000Z",
    observedAt: "2026-07-29T08:00:00.000Z",
    validUntil: "2026-07-29T09:00:00.000Z",
    runId: "run-1",
    publicationId,
    sourceHealth: [],
    artifact: {
      key: `serving/${publicationId}.json.gz`,
      contentSha256: digest,
      objectSha256: digest,
      compressedBytes: 10,
      uncompressedBytes: 20,
    },
  };
}

describe("artifact store", () => {
  test("deduplicates an identical immutable object and rejects changed content", async () => {
    const store = createMemoryArtifactStore();
    const input = {
      key: "forecast/v1/epl-2026-27/run-1.json.gz",
      body: new TextEncoder().encode("forecast"),
      contentType: "application/json" as const,
      contentEncoding: "gzip" as const,
      cacheControl: "private, max-age=31536000, immutable",
    };

    expect((await store.putImmutable(input)).inserted).toBe(true);
    expect((await store.putImmutable(input)).inserted).toBe(false);
    await expect(
      store.putImmutable({ ...input, body: new TextEncoder().encode("changed") }),
    ).rejects.toThrow(/immutable/i);
  });

  test("conditionally replaces a manifest and keeps the previous value on conflict", async () => {
    const store = createMemoryArtifactStore();
    const first = await store.putManifest("serving/current.json", manifest());
    const second = await store.putManifest(
      "serving/current.json",
      manifest("publication-2"),
      first.etag,
    );

    await expect(
      store.putManifest("serving/current.json", manifest("publication-3"), first.etag),
    ).rejects.toThrow(/etag/i);
    expect(second.previousEtag).toBe(first.etag);
    const stored = await store.get("serving/current.json");
    expect(JSON.parse(new TextDecoder().decode(stored?.body)).publicationId).toBe("publication-2");
  });
});
