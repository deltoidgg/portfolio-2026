import { describe, expect, it } from "vitest";
import { createDemoOpportunitySnapshot } from "../src/demo.ts";
import {
  createPublishedOpportunityBundle,
  type ForecastBundleArtifactV1,
} from "../src/hot-cold/artifacts.ts";
import { createMemoryArtifactStore, type ArtifactStore } from "../src/hot-cold/artifact-store.ts";
import {
  createMemoryPublicationRepository,
  publishOpportunityArtifacts,
} from "../src/hot-cold/publication.ts";

function snapshot(horizon: 1 | 3 | 5) {
  return {
    ...createDemoOpportunitySnapshot(),
    key: `run-1:h${horizon}`,
    horizon,
  };
}

function input() {
  const snapshots = { 1: snapshot(1), 3: snapshot(3), 5: snapshot(5) } as const;
  const publicBundle = createPublishedOpportunityBundle({
    publicationId: "publication-1",
    runId: "run-1",
    snapshots,
  });
  const privateBundle: ForecastBundleArtifactV1 = {
    schemaVersion: "forecast-bundle/v1",
    runId: "run-1",
    datasetKey: publicBundle.datasetKey,
    seasonKey: publicBundle.season.key,
    fromGameweek: publicBundle.fromGameweek,
    horizons: [1, 3, 5],
    cutoffAt: publicBundle.observedAt,
    modelKey: "market-xp-v2",
    modelVersion: "2",
    codeVersion: "test",
    rulesetKey: "fpl:2026-27:official-v1",
    modelInputHash: "a".repeat(64),
    inputHeads: [],
    normalizedInput: {},
    fixtureForecasts: [],
    snapshots,
  };
  return {
    privateBundle,
    publicBundle,
    channel: "next" as const,
    seasonSlug: "epl-2026-27",
    checkedAt: "2026-07-29T10:00:00.000Z",
    validUntil: "2026-07-29T11:00:00.000Z",
  };
}

describe("opportunity artifact publication saga", () => {
  it("verifies immutable artifacts before replacing current.json and commits last", async () => {
    const privateStore = createMemoryArtifactStore();
    const publicStore = createMemoryArtifactStore();
    const repository = createMemoryPublicationRepository();

    const receipt = await publishOpportunityArtifacts({
      ...input(),
      privateStore,
      publicStore,
      repository,
    });

    expect(receipt.privateArtifact.key).toBe("forecast/v1/epl-2026-27/run-1.json.gz");
    expect(receipt.publicArtifact.key).toContain("/runs/publication-1.json.gz");
    expect(receipt.manifest.key).toContain("/current.json");
    expect(repository.publication("publication-1")?.status).toBe("committed");
    expect(repository.publication("publication-1")?.manifestEtag).toBe(receipt.manifest.etag);
  });

  it("leaves the previous pointer live when the conditional pointer update fails", async () => {
    const privateStore = createMemoryArtifactStore();
    const basePublicStore = createMemoryArtifactStore();
    const repository = createMemoryPublicationRepository();
    const first = await publishOpportunityArtifacts({
      ...input(),
      privateStore,
      publicStore: basePublicStore,
      repository,
    });
    const failingPublicStore: ArtifactStore = {
      ...basePublicStore,
      async putManifest() {
        throw new Error("simulated pointer failure");
      },
    };

    await expect(
      publishOpportunityArtifacts({
        ...input(),
        publicBundle: { ...input().publicBundle, publicationId: "publication-2" },
        privateStore,
        publicStore: failingPublicStore,
        repository,
        expectedManifestEtag: first.manifest.etag,
      }),
    ).rejects.toThrow("simulated pointer failure");

    const current = await basePublicStore.get(first.manifest.key);
    expect(new TextDecoder().decode(current?.body)).toContain('"publicationId":"publication-1"');
    expect(repository.publication("publication-2")?.status).toBe("staged");
  });
});
