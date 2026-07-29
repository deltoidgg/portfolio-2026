import { describe, expect, it } from "vitest";
import { createR2ArtifactStore } from "../src/neon/r2-artifact-store.ts";
import type { CurrentOpportunityManifestV1 } from "../src/hot-cold/artifacts.ts";

type Stored = {
  body: Uint8Array;
  etag: string;
  input: Record<string, unknown>;
};

function fakeS3Client() {
  const objects = new Map<string, Stored>();
  return {
    objects,
    async send(command: unknown) {
      const candidate = command as {
        constructor: { name: string };
        input: Record<string, unknown>;
      };
      const key = String(candidate.input.Key);
      const current = objects.get(key);
      if (candidate.constructor.name === "PutObjectCommand") {
        if (candidate.input.IfNoneMatch === "*" && current) {
          throw Object.assign(new Error("exists"), {
            name: "PreconditionFailed",
            $metadata: { httpStatusCode: 412 },
          });
        }
        if (candidate.input.IfMatch !== undefined && candidate.input.IfMatch !== current?.etag) {
          throw Object.assign(new Error("conflict"), {
            name: "PreconditionFailed",
            $metadata: { httpStatusCode: 412 },
          });
        }
        const body = new Uint8Array(candidate.input.Body as Uint8Array);
        const etag = `"etag-${body.byteLength}-${objects.size}"`;
        objects.set(key, { body, etag, input: candidate.input });
        return { ETag: etag };
      }
      if (!current) {
        throw Object.assign(new Error("missing"), {
          name: "NoSuchKey",
          $metadata: { httpStatusCode: 404 },
        });
      }
      if (candidate.constructor.name === "HeadObjectCommand") {
        return {
          ETag: current.etag,
          ContentLength: current.body.byteLength,
          ContentType: current.input.ContentType,
          ContentEncoding: current.input.ContentEncoding,
          CacheControl: current.input.CacheControl,
          Metadata: current.input.Metadata,
        };
      }
      return {
        ETag: current.etag,
        ContentLength: current.body.byteLength,
        ContentType: current.input.ContentType,
        ContentEncoding: current.input.ContentEncoding,
        CacheControl: current.input.CacheControl,
        Metadata: current.input.Metadata,
        Body: {
          async transformToByteArray() {
            return current.body;
          },
        },
      };
    },
  };
}

function manifest(publicationId: string): CurrentOpportunityManifestV1 {
  return {
    schemaVersion: "opportunity-current/v1",
    seasonKey: "epl:2026-27",
    checkedAt: "2026-07-29T10:00:00.000Z",
    observedAt: "2026-07-29T10:00:00.000Z",
    validUntil: "2026-07-29T11:00:00.000Z",
    runId: "run-1",
    publicationId,
    sourceHealth: [],
    artifact: {
      key: `serving/v1/next/epl-2026-27/runs/${publicationId}.json.gz`,
      contentSha256: "a".repeat(64),
      objectSha256: "b".repeat(64),
      compressedBytes: 1,
      uncompressedBytes: 1,
    },
  };
}

describe("R2 artifact store", () => {
  it("deduplicates immutable content and rejects another body at the same key", async () => {
    const client = fakeS3Client();
    const store = createR2ArtifactStore({ bucket: "private", client });
    const input = {
      key: "forecast/v1/epl-2026-27/run.json.gz",
      body: new Uint8Array([1, 2, 3]),
      contentType: "application/json" as const,
      contentEncoding: "gzip" as const,
      cacheControl: "public,max-age=31536000,immutable",
    };

    expect((await store.putImmutable(input)).inserted).toBe(true);
    expect((await store.putImmutable(input)).inserted).toBe(false);
    await expect(store.putImmutable({ ...input, body: new Uint8Array([4, 5, 6]) })).rejects.toThrow(
      /immutable/i,
    );
    expect((await store.get(input.key))?.body).toEqual(input.body);
  });

  it("updates current.json only with the previous ETag", async () => {
    const client = fakeS3Client();
    const store = createR2ArtifactStore({ bucket: "public", client });

    const first = await store.putManifest("current.json", manifest("publication-1"));
    await expect(
      store.putManifest("current.json", manifest("publication-2"), "wrong"),
    ).rejects.toThrow(/etag/i);
    const second = await store.putManifest("current.json", manifest("publication-2"), first.etag);

    expect(second.previousEtag).toBe(first.etag);
    expect((client.objects.get("current.json")?.input.CacheControl as string) ?? "").toContain(
      "stale-while-revalidate=300",
    );
  });
});
