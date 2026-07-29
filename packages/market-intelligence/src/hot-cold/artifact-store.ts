import {
  currentOpportunityManifestSchema,
  type CurrentOpportunityManifestV1,
} from "./artifacts.ts";

export type ImmutableArtifactInput = {
  key: string;
  body: Uint8Array;
  contentType: "application/json" | "application/octet-stream";
  contentEncoding?: "gzip" | "identity";
  cacheControl: string;
  metadata?: Record<string, string>;
};

export type ArtifactReceipt = {
  key: string;
  etag: string;
  sha256: string;
  bytes: number;
  inserted: boolean;
};

export type ArtifactHead = Omit<ArtifactReceipt, "inserted"> & {
  contentType?: string;
  contentEncoding?: string;
  cacheControl?: string;
  metadata: Record<string, string>;
};

export type ArtifactObject = ArtifactHead & { body: Uint8Array };

export type ManifestReceipt = {
  key: string;
  etag: string;
  previousEtag?: string;
};

export interface ArtifactStore {
  putImmutable(input: ImmutableArtifactInput): Promise<ArtifactReceipt>;
  get(key: string): Promise<ArtifactObject | null>;
  head(key: string): Promise<ArtifactHead | null>;
  putManifest(
    key: string,
    manifest: CurrentOpportunityManifestV1,
    expectedEtag?: string,
  ): Promise<ManifestReceipt>;
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .toSorted(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalValue(item)]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalValue(value));
}

export async function sha256Hex(body: Uint8Array | string): Promise<string> {
  const bytes = typeof body === "string" ? new TextEncoder().encode(body) : body;
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", copy.buffer);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

type MemoryEntry = {
  body: Uint8Array;
  head: ArtifactHead;
};

export function createMemoryArtifactStore(): ArtifactStore {
  const objects = new Map<string, MemoryEntry>();

  return {
    async putImmutable(input) {
      const hash = await sha256Hex(input.body);
      const current = objects.get(input.key);
      if (current) {
        if (current.head.sha256 !== hash) {
          throw new Error(`Artifact ${input.key} is immutable and already contains other content`);
        }
        return { ...current.head, inserted: false };
      }
      const head: ArtifactHead = {
        key: input.key,
        etag: hash,
        sha256: hash,
        bytes: input.body.byteLength,
        contentType: input.contentType,
        contentEncoding: input.contentEncoding,
        cacheControl: input.cacheControl,
        metadata: { ...input.metadata },
      };
      objects.set(input.key, { body: input.body.slice(), head });
      return { ...head, inserted: true };
    },

    async get(key) {
      const current = objects.get(key);
      return current ? { ...current.head, body: current.body.slice() } : null;
    },

    async head(key) {
      const current = objects.get(key);
      return current ? structuredClone(current.head) : null;
    },

    async putManifest(key, untrustedManifest, expectedEtag) {
      const manifest = currentOpportunityManifestSchema.parse(untrustedManifest);
      const current = objects.get(key);
      if (expectedEtag !== undefined && current?.head.etag !== expectedEtag) {
        throw new Error(`Manifest ETag conflict for ${key}`);
      }
      if (expectedEtag === undefined && current) {
        throw new Error(`Manifest ETag is required to replace ${key}`);
      }
      const body = new TextEncoder().encode(canonicalJson(manifest));
      const hash = await sha256Hex(body);
      const head: ArtifactHead = {
        key,
        etag: hash,
        sha256: hash,
        bytes: body.byteLength,
        contentType: "application/json",
        contentEncoding: "identity",
        cacheControl: "public,max-age=60,stale-while-revalidate=300",
        metadata: {
          schemaVersion: manifest.schemaVersion,
          publicationId: manifest.publicationId,
          sha256: hash,
        },
      };
      objects.set(key, { body, head });
      return {
        key,
        etag: hash,
        ...(current ? { previousEtag: current.head.etag } : {}),
      };
    },
  };
}
