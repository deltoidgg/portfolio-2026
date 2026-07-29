import { gzipSync, gunzipSync } from "node:zlib";
import type { SourceHealth } from "../opportunity-map.ts";
import {
  currentOpportunityManifestSchema,
  forecastBundleArtifactSchema,
  opportunityReplayArtifactSchema,
  publishedOpportunityBundleSchema,
  type CurrentOpportunityManifestV1,
  type ForecastBundleArtifactV1,
  type OpportunityReplayArtifactV1,
  type PublishedOpportunityBundleV1,
} from "./artifacts.ts";
import {
  canonicalJson,
  sha256Hex,
  type ArtifactReceipt,
  type ArtifactStore,
  type ManifestReceipt,
} from "./artifact-store.ts";

const IMMUTABLE_CACHE = "public,max-age=31536000,immutable";

export type PublicationStage = {
  publicationId: string;
  runId: string;
  datasetKey: string;
  seasonKey: string;
  fromGameweek: number;
  throughGameweek: number;
  cutoffAt: string;
  modelKey: string;
  modelVersion: string;
  codeVersion: string;
  rulesetKey: string;
  modelInputHash: string;
  servingStateHash: string;
  inputManifest: ForecastBundleArtifactV1["inputHeads"];
  privateArtifact: ArtifactReference;
  publicArtifact: ArtifactReference;
  replayArtifact?: ArtifactReference;
  stagedAt: string;
  expiresAt: string;
};

export type PublicationCommit = {
  publicationId: string;
  manifestKey: string;
  manifestEtag: string;
  committedAt: string;
  current: CurrentOpportunityManifestV1;
};

export interface PublicationRepository {
  stage(publication: PublicationStage): Promise<void>;
  commit(publication: PublicationCommit): Promise<void>;
}

export type MemoryPublication = PublicationStage & {
  status: "staged" | "committed";
  manifestKey?: string;
  manifestEtag?: string;
  committedAt?: string;
};

export type MemoryPublicationRepository = PublicationRepository & {
  publication(publicationId: string): MemoryPublication | undefined;
};

export function createMemoryPublicationRepository(): MemoryPublicationRepository {
  const publications = new Map<string, MemoryPublication>();
  return {
    async stage(stage) {
      const current = publications.get(stage.publicationId);
      if (
        current &&
        (current.runId !== stage.runId ||
          current.privateArtifact.key !== stage.privateArtifact.key ||
          current.publicArtifact.key !== stage.publicArtifact.key)
      ) {
        throw new Error(`Publication ${stage.publicationId} was staged with different content`);
      }
      publications.set(stage.publicationId, current ?? { ...stage, status: "staged" });
    },
    async commit(commit) {
      const current = publications.get(commit.publicationId);
      if (!current) throw new Error(`Publication ${commit.publicationId} was not staged`);
      publications.set(commit.publicationId, {
        ...current,
        status: "committed",
        manifestKey: commit.manifestKey,
        manifestEtag: commit.manifestEtag,
        committedAt: commit.committedAt,
        expiresAt: new Date(Date.parse(commit.committedAt) + 14 * 86_400_000).toISOString(),
      });
    },
    publication(publicationId) {
      const publication = publications.get(publicationId);
      return publication ? structuredClone(publication) : undefined;
    },
  };
}

type ArtifactReference = CurrentOpportunityManifestV1["artifact"];

async function encodeArtifact(value: unknown): Promise<{
  canonical: Uint8Array;
  compressed: Uint8Array;
  contentSha256: string;
  objectSha256: string;
}> {
  const canonical = new TextEncoder().encode(canonicalJson(value));
  const compressed = new Uint8Array(gzipSync(canonical, { level: 9 }));
  return {
    canonical,
    compressed,
    contentSha256: await sha256Hex(canonical),
    objectSha256: await sha256Hex(compressed),
  };
}

async function verifyArtifact<T>(
  store: ArtifactStore,
  key: string,
  expected: Awaited<ReturnType<typeof encodeArtifact>>,
  parse: (value: unknown) => T,
): Promise<T> {
  const stored = await store.get(key);
  if (!stored) throw new Error(`Artifact read-back failed for ${key}`);
  const objectSha256 = await sha256Hex(stored.body);
  if (
    objectSha256 !== expected.objectSha256 ||
    stored.body.byteLength !== expected.compressed.length
  ) {
    throw new Error(`Compressed artifact verification failed for ${key}`);
  }
  let uncompressed: Uint8Array;
  try {
    uncompressed = new Uint8Array(gunzipSync(stored.body));
  } catch {
    throw new Error(`Artifact ${key} is not valid gzip`);
  }
  const contentSha256 = await sha256Hex(uncompressed);
  if (
    contentSha256 !== expected.contentSha256 ||
    uncompressed.byteLength !== expected.canonical.byteLength
  ) {
    throw new Error(`Canonical artifact verification failed for ${key}`);
  }
  return parse(JSON.parse(new TextDecoder().decode(uncompressed)));
}

function reference(
  key: string,
  encoded: Awaited<ReturnType<typeof encodeArtifact>>,
): ArtifactReference {
  return {
    key,
    contentSha256: encoded.contentSha256,
    objectSha256: encoded.objectSha256,
    compressedBytes: encoded.compressed.byteLength,
    uncompressedBytes: encoded.canonical.byteLength,
  };
}

function replayPointCount(replay: OpportunityReplayArtifactV1): number {
  return replay.players.reduce(
    (total, player) =>
      total +
      player.horizons["1"].length +
      player.horizons["3"].length +
      player.horizons["5"].length,
    0,
  );
}

export type PublishOpportunityArtifactsInput = {
  privateStore: ArtifactStore;
  publicStore: ArtifactStore;
  repository: PublicationRepository;
  privateBundle: ForecastBundleArtifactV1;
  publicBundle: PublishedOpportunityBundleV1;
  replay?: OpportunityReplayArtifactV1;
  channel: "next" | "production";
  seasonSlug: string;
  checkedAt: string;
  validUntil: string;
  expectedManifestEtag?: string;
  sourceHealth?: SourceHealth[];
};

export type PublicationSagaReceipt = {
  privateArtifact: ArtifactReceipt;
  publicArtifact: ArtifactReceipt;
  replayArtifact?: ArtifactReceipt;
  manifest: ManifestReceipt;
  current: CurrentOpportunityManifestV1;
};

export async function publishOpportunityArtifacts(
  input: PublishOpportunityArtifactsInput,
): Promise<PublicationSagaReceipt> {
  const privateBundle = forecastBundleArtifactSchema.parse(input.privateBundle);
  const publicBundle = publishedOpportunityBundleSchema.parse(input.publicBundle);
  if (
    privateBundle.runId !== publicBundle.runId ||
    privateBundle.seasonKey !== publicBundle.season.key
  ) {
    throw new Error("Private and public forecast bundles do not describe the same run");
  }
  const replay = input.replay ? opportunityReplayArtifactSchema.parse(input.replay) : undefined;
  if (replay && replay.publicationId !== publicBundle.publicationId) {
    throw new Error("Replay does not describe the public opportunity bundle");
  }

  const privateKey = `forecast/v1/${input.seasonSlug}/${privateBundle.runId}.json.gz`;
  const publicPrefix = `serving/v1/${input.channel}/${input.seasonSlug}`;
  const publicKey = `${publicPrefix}/runs/${publicBundle.publicationId}.json.gz`;
  const replayKey = replay
    ? `${publicPrefix}/replay/${await sha256Hex(canonicalJson(replay))}.json.gz`
    : undefined;
  const [privateEncoded, publicEncoded, replayEncoded] = await Promise.all([
    encodeArtifact(privateBundle),
    encodeArtifact(publicBundle),
    replay ? encodeArtifact(replay) : undefined,
  ]);
  const privateArtifact = await input.privateStore.putImmutable({
    key: privateKey,
    body: privateEncoded.compressed,
    contentType: "application/json",
    contentEncoding: "gzip",
    cacheControl: IMMUTABLE_CACHE,
    metadata: { contentSha256: privateEncoded.contentSha256, runId: privateBundle.runId },
  });
  await verifyArtifact(input.privateStore, privateKey, privateEncoded, (value) =>
    forecastBundleArtifactSchema.parse(value),
  );

  const publicArtifact = await input.publicStore.putImmutable({
    key: publicKey,
    body: publicEncoded.compressed,
    contentType: "application/json",
    contentEncoding: "gzip",
    cacheControl: IMMUTABLE_CACHE,
    metadata: {
      contentSha256: publicEncoded.contentSha256,
      publicationId: publicBundle.publicationId,
    },
  });
  await verifyArtifact(input.publicStore, publicKey, publicEncoded, (value) =>
    publishedOpportunityBundleSchema.parse(value),
  );

  let replayArtifact: ArtifactReceipt | undefined;
  if (replay && replayEncoded && replayKey) {
    replayArtifact = await input.publicStore.putImmutable({
      key: replayKey,
      body: replayEncoded.compressed,
      contentType: "application/json",
      contentEncoding: "gzip",
      cacheControl: IMMUTABLE_CACHE,
      metadata: {
        contentSha256: replayEncoded.contentSha256,
        publicationId: publicBundle.publicationId,
      },
    });
    await verifyArtifact(input.publicStore, replayKey, replayEncoded, (value) =>
      opportunityReplayArtifactSchema.parse(value),
    );
  }

  await input.repository.stage({
    publicationId: publicBundle.publicationId,
    runId: privateBundle.runId,
    datasetKey: privateBundle.datasetKey,
    seasonKey: privateBundle.seasonKey,
    fromGameweek: privateBundle.fromGameweek,
    throughGameweek: Math.max(
      privateBundle.fromGameweek,
      ...publicBundle.players.flatMap((player) =>
        player.horizons["5"].gameweeks.map((gameweek) => gameweek.gameweek),
      ),
    ),
    cutoffAt: privateBundle.cutoffAt,
    modelKey: privateBundle.modelKey,
    modelVersion: privateBundle.modelVersion,
    codeVersion: privateBundle.codeVersion,
    rulesetKey: privateBundle.rulesetKey,
    modelInputHash: privateBundle.modelInputHash,
    servingStateHash: publicEncoded.contentSha256,
    inputManifest: privateBundle.inputHeads,
    privateArtifact: reference(privateKey, privateEncoded),
    publicArtifact: reference(publicKey, publicEncoded),
    ...(replayEncoded && replayKey ? { replayArtifact: reference(replayKey, replayEncoded) } : {}),
    stagedAt: input.checkedAt,
    expiresAt: new Date(Date.parse(input.checkedAt) + 30 * 86_400_000).toISOString(),
  });

  const current = currentOpportunityManifestSchema.parse({
    schemaVersion: "opportunity-current/v1",
    seasonKey: privateBundle.seasonKey,
    checkedAt: input.checkedAt,
    observedAt: publicBundle.observedAt,
    validUntil: input.validUntil,
    runId: privateBundle.runId,
    publicationId: publicBundle.publicationId,
    sourceHealth: input.sourceHealth ?? publicBundle.sourceHealth,
    artifact: reference(publicKey, publicEncoded),
    ...(replay && replayEncoded && replayKey
      ? {
          replay: {
            ...reference(replayKey, replayEncoded),
            pointCount: replayPointCount(replay),
          },
        }
      : {}),
  });
  const manifestKey = `${publicPrefix}/current.json`;
  const manifest = await input.publicStore.putManifest(
    manifestKey,
    current,
    input.expectedManifestEtag,
  );
  await input.repository.commit({
    publicationId: publicBundle.publicationId,
    manifestKey,
    manifestEtag: manifest.etag,
    committedAt: input.checkedAt,
    current,
  });
  return {
    privateArtifact,
    publicArtifact,
    ...(replayArtifact ? { replayArtifact } : {}),
    manifest,
    current,
  };
}
