import { gzipSync } from "node:zlib";
import {
  currentOpportunityManifestSchema,
  opportunityReplayArtifactSchema,
  publishedOpportunityBundleSchema,
  type CurrentOpportunityManifestV1,
} from "../hot-cold/artifacts.ts";
import { canonicalJson, sha256Hex } from "../hot-cold/artifact-store.ts";
import {
  createCutoverPrivateStore,
  createCutoverPublicStore,
  uncompressedBody,
} from "./cutover-r2.ts";
import { loadLocalEnvironment, requiredEnvironment } from "./load-env.ts";

type RollbackRecord = {
  schemaVersion: "artifact-promotion-rollback/v1";
  createdAt: string;
  targetKey: string;
  previousEtag: string;
  previousManifest: CurrentOpportunityManifestV1;
  promotedPublicationId: string;
};

function parseManifest(body: Uint8Array): CurrentOpportunityManifestV1 {
  return currentOpportunityManifestSchema.parse(JSON.parse(new TextDecoder().decode(body)));
}

async function verifyReferencedArtifact(
  reference: CurrentOpportunityManifestV1["artifact"],
  kind: "bundle" | "replay",
) {
  const store = createCutoverPublicStore();
  const object = await store.get(reference.key);
  if (!object) throw new Error(`${kind} ${reference.key} is missing`);
  const uncompressed = uncompressedBody(object.body, object.contentEncoding);
  if (
    object.body.byteLength !== reference.compressedBytes ||
    uncompressed.byteLength !== reference.uncompressedBytes ||
    (await sha256Hex(object.body)) !== reference.objectSha256 ||
    (await sha256Hex(uncompressed)) !== reference.contentSha256
  ) {
    throw new Error(`${kind} ${reference.key} failed hash or byte-count verification`);
  }
  const parsed = JSON.parse(new TextDecoder().decode(uncompressed));
  if (kind === "bundle") publishedOpportunityBundleSchema.parse(parsed);
  else opportunityReplayArtifactSchema.parse(parsed);
  return object;
}

function channel(value: string): "next" | "production" {
  if (value !== "next" && value !== "production") {
    throw new Error("Promotion channels must be next or production");
  }
  return value;
}

loadLocalEnvironment();
const promote = process.argv.includes("--promote");
const restore = process.argv.includes("--restore");
if (promote === restore) throw new Error("Choose exactly one of --promote or --restore");

const publicStore = createCutoverPublicStore();
const privateStore = createCutoverPrivateStore();
const seasonKey = process.env.MI_SEASON_KEY ?? "epl:2026-27";
const seasonSlug = process.env.MI_SEASON_SLUG ?? seasonKey.replaceAll(":", "-");
const sourceChannel = channel(process.env.MI_PROMOTE_SOURCE_CHANNEL ?? "next");
const targetChannel = channel(process.env.MI_PROMOTE_TARGET_CHANNEL ?? "production");
if (sourceChannel === targetChannel) throw new Error("Promotion source and target must differ");
const sourcePrefix = `serving/v1/${sourceChannel}/${seasonSlug}`;
const targetPrefix = `serving/v1/${targetChannel}/${seasonSlug}`;
const targetKey = `${targetPrefix}/current.json`;

if (promote) {
  const sourceObject = await publicStore.get(`${sourcePrefix}/current.json`);
  if (!sourceObject) throw new Error(`Source channel ${sourceChannel} has no current manifest`);
  const source = parseManifest(sourceObject.body);
  if (source.seasonKey !== seasonKey) {
    throw new Error(`Source manifest is for ${source.seasonKey}, expected ${seasonKey}`);
  }
  const sourceBundle = await verifyReferencedArtifact(source.artifact, "bundle");
  const bundleKey = `${targetPrefix}/runs/${source.publicationId}.json.gz`;
  const bundleReceipt = await publicStore.putImmutable({
    key: bundleKey,
    body: sourceBundle.body,
    contentType: "application/json",
    contentEncoding: "gzip",
    cacheControl: "public,max-age=31536000,immutable",
    metadata: {
      contentSha256: source.artifact.contentSha256,
      publicationId: source.publicationId,
    },
  });

  let replay: (CurrentOpportunityManifestV1["replay"] & { pointCount: number }) | undefined;
  if (source.replay) {
    const sourceReplay = await verifyReferencedArtifact(source.replay, "replay");
    const replayName = source.replay.key.split("/").at(-1);
    if (!replayName) throw new Error("Source replay key is invalid");
    const replayKey = `${targetPrefix}/replay/${replayName}`;
    const replayReceipt = await publicStore.putImmutable({
      key: replayKey,
      body: sourceReplay.body,
      contentType: "application/json",
      contentEncoding: "gzip",
      cacheControl: "public,max-age=31536000,immutable",
      metadata: {
        contentSha256: source.replay.contentSha256,
        publicationId: source.publicationId,
      },
    });
    replay = {
      ...source.replay,
      key: replayKey,
      objectSha256: replayReceipt.sha256,
      compressedBytes: replayReceipt.bytes,
    };
  }

  const checkedAt = new Date().toISOString();
  const promoted = currentOpportunityManifestSchema.parse({
    ...source,
    checkedAt,
    validUntil: new Date(Date.parse(checkedAt) + 60 * 60_000).toISOString(),
    artifact: {
      ...source.artifact,
      key: bundleKey,
      objectSha256: bundleReceipt.sha256,
      compressedBytes: bundleReceipt.bytes,
    },
    ...(replay ? { replay } : {}),
  });
  const previousObject = await publicStore.get(targetKey);
  if (!previousObject) {
    throw new Error(
      "Production has no previous manifest; publish directly once before using promotion",
    );
  }
  const previousManifest = parseManifest(previousObject.body);
  const rollback: RollbackRecord = {
    schemaVersion: "artifact-promotion-rollback/v1",
    createdAt: checkedAt,
    targetKey,
    previousEtag: previousObject.etag,
    previousManifest,
    promotedPublicationId: promoted.publicationId,
  };
  const rollbackCanonical = canonicalJson(rollback);
  const rollbackHash = await sha256Hex(rollbackCanonical);
  const date = checkedAt.slice(0, 10);
  const rollbackKey = `ledger/v1/${seasonSlug}/${date}/${rollbackHash}.json.gz`;
  await privateStore.putImmutable({
    key: rollbackKey,
    body: new Uint8Array(gzipSync(rollbackCanonical, { level: 9 })),
    contentType: "application/json",
    contentEncoding: "gzip",
    cacheControl: "private,max-age=31536000,immutable",
    metadata: { contentSha256: rollbackHash, kind: "artifact-promotion-rollback" },
  });
  const rollbackObject = await privateStore.get(rollbackKey);
  if (
    !rollbackObject ||
    (await sha256Hex(uncompressedBody(rollbackObject.body, rollbackObject.contentEncoding))) !==
      rollbackHash
  ) {
    throw new Error(`Rollback record ${rollbackKey} failed read-back verification`);
  }
  const receipt = await publicStore.putManifest(targetKey, promoted, previousObject.etag);
  console.log(
    JSON.stringify({
      action: "promote",
      sourceChannel,
      targetChannel,
      publicationId: promoted.publicationId,
      rollbackKey,
      manifestEtag: receipt.etag,
      purgeUrl: `https://data.fpl.wasimarif.com/${targetKey}`,
    }),
  );
} else {
  const rollbackKey = requiredEnvironment("MI_ROLLBACK_RECORD_KEY");
  const rollbackObject = await privateStore.get(rollbackKey);
  if (!rollbackObject) throw new Error(`Rollback record ${rollbackKey} is missing`);
  const rollbackBody = uncompressedBody(rollbackObject.body, rollbackObject.contentEncoding);
  const rollbackHash = rollbackKey
    .split("/")
    .at(-1)
    ?.replace(/\.json\.gz$/, "");
  if (!rollbackHash || (await sha256Hex(rollbackBody)) !== rollbackHash) {
    throw new Error(`Rollback record ${rollbackKey} failed hash verification`);
  }
  const rollback = JSON.parse(new TextDecoder().decode(rollbackBody)) as RollbackRecord;
  if (
    rollback.schemaVersion !== "artifact-promotion-rollback/v1" ||
    rollback.targetKey !== targetKey
  ) {
    throw new Error("Rollback record does not match the selected production pointer");
  }
  const currentObject = await publicStore.get(targetKey);
  if (!currentObject) throw new Error("Cannot restore a missing production pointer");
  const current = parseManifest(currentObject.body);
  if (current.publicationId !== rollback.promotedPublicationId) {
    throw new Error("Production pointer has moved since this promotion; refusing stale rollback");
  }
  const receipt = await publicStore.putManifest(
    targetKey,
    rollback.previousManifest,
    currentObject.etag,
  );
  console.log(
    JSON.stringify({
      action: "restore",
      publicationId: rollback.previousManifest.publicationId,
      rollbackKey,
      manifestEtag: receipt.etag,
      purgeUrl: `https://data.fpl.wasimarif.com/${targetKey}`,
    }),
  );
}
