import { describe, expect, it, vi } from "vite-plus/test";
import { canonicalJson, createPublishedOpportunityBundle, sha256Hex } from "market-intelligence";
import { createDemoOpportunitySnapshot } from "market-intelligence/demo";
import { createPublicOpportunityClient } from "./public-opportunity.ts";

function requestUrl(value: string | URL | Request): string {
  return typeof value === "string" ? value : value instanceof URL ? value.href : value.url;
}

async function fixture() {
  const snapshot = createDemoOpportunitySnapshot();
  const bundle = createPublishedOpportunityBundle({
    publicationId: "publication-1",
    runId: "run-1",
    snapshots: {
      1: { ...snapshot, horizon: 1 },
      3: { ...snapshot, horizon: 3 },
      5: { ...snapshot, horizon: 5 },
    },
  });
  const body = canonicalJson(bundle);
  const manifest = {
    schemaVersion: "opportunity-current/v1",
    seasonKey: bundle.season.key,
    checkedAt: bundle.observedAt,
    observedAt: bundle.observedAt,
    validUntil: "2026-08-21T18:30:00.000Z",
    runId: bundle.runId,
    publicationId: bundle.publicationId,
    sourceHealth: bundle.sourceHealth,
    artifact: {
      key: "serving/v1/next/epl-2026-27/runs/publication-1.json.gz",
      contentSha256: await sha256Hex(body),
      objectSha256: "a".repeat(64),
      compressedBytes: 10,
      uncompressedBytes: new TextEncoder().encode(body).byteLength,
    },
  };
  return { body, bundle, manifest };
}

describe("public opportunity client", () => {
  it("fetches and validates one combined bundle", async () => {
    const { body, manifest } = await fixture();
    const fetcher = vi.fn<typeof fetch>(async (url: string | URL | Request) =>
      requestUrl(url).endsWith("current.json")
        ? new Response(JSON.stringify(manifest))
        : new Response(body),
    );
    const client = createPublicOpportunityClient({
      baseUrl: "https://data.example/serving/v1/next",
      fetcher,
    });

    const loaded = await client.load("epl:2026-27");

    expect(loaded.bundle.availableHorizons).toEqual([1, 3, 5]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("shares an in-flight first load between routes", async () => {
    const { body, manifest } = await fixture();
    const fetcher = vi.fn<typeof fetch>(async (url: string | URL | Request) =>
      requestUrl(url).endsWith("current.json")
        ? new Response(JSON.stringify(manifest))
        : new Response(body),
    );
    const client = createPublicOpportunityClient({
      baseUrl: "https://data.example/serving/v1/next",
      fetcher,
    });

    const [opportunities, squad] = await Promise.all([
      client.load("epl:2026-27"),
      client.load("epl:2026-27"),
    ]);

    expect(opportunities.bundle.publicationId).toBe(squad.bundle.publicationId);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("retains a validated same-season bundle when navigation refresh fails", async () => {
    const { body, manifest } = await fixture();
    let clock = 0;
    let fail = false;
    const fetcher = vi.fn<typeof fetch>(async (url: string | URL | Request) => {
      if (fail) throw new Error("offline");
      return requestUrl(url).endsWith("current.json")
        ? new Response(JSON.stringify(manifest))
        : new Response(body);
    });
    const client = createPublicOpportunityClient({
      baseUrl: "https://data.example/serving/v1/next",
      fetcher,
      now: () => clock,
    });
    await client.load("epl:2026-27");
    clock = 61_000;
    fail = true;

    expect((await client.load("epl:2026-27")).stale).toBe(true);
  });

  it("fails the first load instead of substituting demo data", async () => {
    const client = createPublicOpportunityClient({
      baseUrl: "https://data.example/serving/v1/next",
      fetcher: vi.fn<typeof fetch>(async () => new Response("missing", { status: 404 })),
    });

    await expect(client.load("epl:2026-27")).rejects.toThrow(
      "Opportunity manifest failed with HTTP 404",
    );
  });

  it("does not fetch replay until playback asks for it", async () => {
    const { body, manifest } = await fixture();
    const replay = {
      schemaVersion: "opportunity-replay/v1",
      publicationId: manifest.publicationId,
      players: [],
    } as const;
    const replayBody = canonicalJson(replay);
    const replayManifest = {
      ...manifest,
      replay: {
        key: "serving/v1/next/epl-2026-27/replay/replay.json.gz",
        contentSha256: await sha256Hex(replayBody),
        objectSha256: "b".repeat(64),
        compressedBytes: 10,
        uncompressedBytes: new TextEncoder().encode(replayBody).byteLength,
        pointCount: 0,
      },
    };
    const fetcher = vi.fn<typeof fetch>(async (url: string | URL | Request) => {
      const value = requestUrl(url);
      if (value.endsWith("current.json")) return new Response(JSON.stringify(replayManifest));
      if (value.includes("/replay/")) return new Response(replayBody);
      return new Response(body);
    });
    const client = createPublicOpportunityClient({
      baseUrl: "https://data.example/serving/v1/next",
      fetcher,
    });

    const loaded = await client.load("epl:2026-27");
    expect(fetcher).toHaveBeenCalledTimes(2);
    await client.loadReplay(loaded.manifest);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
