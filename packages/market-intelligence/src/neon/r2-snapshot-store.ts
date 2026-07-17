import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { SnapshotEnvelope, SnapshotStore, StoredSnapshot } from "../collector.ts";

type S3LikeClient = {
  send(command: unknown): Promise<unknown>;
};

type R2SnapshotStoreOptions = {
  bucket: string;
  client?: S3LikeClient;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
};

function createClient(options: R2SnapshotStoreOptions): S3LikeClient {
  if (options.client) return options.client;
  if (!options.endpoint || !options.accessKeyId || !options.secretAccessKey) {
    throw new Error("R2 endpoint and credentials are required when no client is supplied");
  }
  return new S3Client({
    region: "auto",
    endpoint: options.endpoint,
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
  });
}

export function createR2SnapshotStore(options: R2SnapshotStoreOptions): SnapshotStore {
  if (!options.bucket) throw new Error("R2 bucket is required");
  const client = createClient(options);
  return {
    async put(snapshot: SnapshotEnvelope): Promise<StoredSnapshot> {
      const serialized = JSON.stringify(snapshot.payload);
      const digest = createHash("sha256").update(serialized).digest("hex");
      const compressed = gzipSync(serialized, { level: 9 });
      const [year, month, day] = snapshot.observedAt.slice(0, 10).split("-");
      const objectKey = `raw/${snapshot.sourceKey}/${year}/${month}/${day}/${digest}.json.gz`;
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: options.bucket,
            Key: objectKey,
            Body: compressed,
            ContentType: "application/json",
            ContentEncoding: "gzip",
            IfNoneMatch: "*",
            Metadata: {
              sha256: digest,
              source: snapshot.sourceKey,
              observedAt: snapshot.observedAt,
            },
          }),
        );
      } catch (error) {
        const duplicate =
          typeof error === "object" &&
          error !== null &&
          (("name" in error && error.name === "PreconditionFailed") ||
            ("$metadata" in error &&
              typeof error.$metadata === "object" &&
              error.$metadata !== null &&
              "httpStatusCode" in error.$metadata &&
              error.$metadata.httpStatusCode === 412));
        if (!duplicate) throw error;
      }
      return {
        objectKey,
        sha256: digest,
        compressedBytes: compressed.byteLength,
        uncompressedBytes: Buffer.byteLength(serialized),
        encoding: "gzip",
        contentType: "application/json",
      };
    },
  };
}
