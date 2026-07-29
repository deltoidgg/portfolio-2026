import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  canonicalJson,
  sha256Hex,
  type ArtifactHead,
  type ArtifactStore,
} from "../hot-cold/artifact-store.ts";
import { currentOpportunityManifestSchema } from "../hot-cold/artifacts.ts";

type S3LikeClient = {
  send(command: unknown): Promise<unknown>;
};

export type R2ArtifactStoreOptions = {
  bucket: string;
  client?: S3LikeClient;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
};

function createClient(options: R2ArtifactStoreOptions): S3LikeClient {
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

function statusCode(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "$metadata" in error &&
    typeof error.$metadata === "object" &&
    error.$metadata !== null &&
    "httpStatusCode" in error.$metadata &&
    typeof error.$metadata.httpStatusCode === "number"
  ) {
    return error.$metadata.httpStatusCode;
  }
  return undefined;
}

function named(error: unknown, name: string): boolean {
  return typeof error === "object" && error !== null && "name" in error && error.name === name;
}

function isPreconditionFailure(error: unknown): boolean {
  return statusCode(error) === 412 || named(error, "PreconditionFailed");
}

function isMissing(error: unknown): boolean {
  return statusCode(error) === 404 || named(error, "NoSuchKey") || named(error, "NotFound");
}

type S3Head = {
  ETag?: string;
  ContentLength?: number;
  ContentType?: string;
  ContentEncoding?: string;
  CacheControl?: string;
  Metadata?: Record<string, string>;
};

function artifactHead(key: string, response: S3Head): ArtifactHead {
  const metadata = { ...response.Metadata };
  return {
    key,
    etag: response.ETag ?? "",
    sha256: metadata.sha256 ?? "",
    bytes: response.ContentLength ?? 0,
    ...(response.ContentType ? { contentType: response.ContentType } : {}),
    ...(response.ContentEncoding ? { contentEncoding: response.ContentEncoding } : {}),
    ...(response.CacheControl ? { cacheControl: response.CacheControl } : {}),
    metadata,
  };
}

async function bodyBytes(body: unknown): Promise<Uint8Array> {
  if (body instanceof Uint8Array) return body.slice();
  if (
    body &&
    typeof body === "object" &&
    "transformToByteArray" in body &&
    typeof body.transformToByteArray === "function"
  ) {
    return new Uint8Array(await body.transformToByteArray());
  }
  if (body && typeof body === "object" && Symbol.asyncIterator in body) {
    const chunks: Uint8Array[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array | string>) {
      chunks.push(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk);
    }
    const length = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
    const result = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return result;
  }
  throw new Error("R2 returned an unreadable object body");
}

export function createR2ArtifactStore(options: R2ArtifactStoreOptions): ArtifactStore {
  if (!options.bucket) throw new Error("R2 bucket is required");
  const client = createClient(options);

  const head: ArtifactStore["head"] = async (key) => {
    try {
      const response = (await client.send(
        new HeadObjectCommand({ Bucket: options.bucket, Key: key }),
      )) as S3Head;
      return artifactHead(key, response);
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
  };

  return {
    async putImmutable(input) {
      const sha256 = await sha256Hex(input.body);
      try {
        const response = (await client.send(
          new PutObjectCommand({
            Bucket: options.bucket,
            Key: input.key,
            Body: input.body,
            ContentType: input.contentType,
            ...(input.contentEncoding ? { ContentEncoding: input.contentEncoding } : {}),
            CacheControl: input.cacheControl,
            IfNoneMatch: "*",
            Metadata: { ...input.metadata, sha256 },
          }),
        )) as { ETag?: string };
        return {
          key: input.key,
          etag: response.ETag ?? sha256,
          sha256,
          bytes: input.body.byteLength,
          inserted: true,
        };
      } catch (error) {
        if (!isPreconditionFailure(error)) throw error;
        const existing = await head(input.key);
        if (!existing || existing.sha256 !== sha256) {
          throw new Error(`Artifact ${input.key} is immutable and already contains other content`);
        }
        return { ...existing, inserted: false };
      }
    },

    async get(key) {
      try {
        const response = (await client.send(
          new GetObjectCommand({ Bucket: options.bucket, Key: key }),
        )) as S3Head & { Body?: unknown };
        const body = await bodyBytes(response.Body);
        return { ...artifactHead(key, { ...response, ContentLength: body.byteLength }), body };
      } catch (error) {
        if (isMissing(error)) return null;
        throw error;
      }
    },

    head,

    async putManifest(key, input, expectedEtag) {
      const manifest = currentOpportunityManifestSchema.parse(input);
      const body = new TextEncoder().encode(canonicalJson(manifest));
      const sha256 = await sha256Hex(body);
      try {
        const response = (await client.send(
          new PutObjectCommand({
            Bucket: options.bucket,
            Key: key,
            Body: body,
            ContentType: "application/json",
            ContentEncoding: "identity",
            CacheControl: "public,max-age=60,stale-while-revalidate=300",
            ...(expectedEtag === undefined ? { IfNoneMatch: "*" } : { IfMatch: expectedEtag }),
            Metadata: {
              sha256,
              schemaVersion: manifest.schemaVersion,
              publicationId: manifest.publicationId,
            },
          }),
        )) as { ETag?: string };
        return {
          key,
          etag: response.ETag ?? sha256,
          ...(expectedEtag === undefined ? {} : { previousEtag: expectedEtag }),
        };
      } catch (error) {
        if (isPreconditionFailure(error)) {
          throw new Error(`Manifest ETag conflict for ${key}`);
        }
        throw error;
      }
    },
  };
}
