import {
  currentOpportunityManifestSchema,
  opportunityReplayArtifactSchema,
  publishedOpportunityBundleSchema,
  sha256Hex,
  type CurrentOpportunityManifestV1,
  type OpportunityReplayArtifactV1,
  type PublishedOpportunityBundleV1,
} from "market-intelligence";

export type PublicOpportunityLoad = {
  manifest: CurrentOpportunityManifestV1;
  bundle: PublishedOpportunityBundleV1;
  stale: boolean;
};

type PublicOpportunityClientOptions = {
  baseUrl: string;
  fetcher?: typeof fetch;
  now?: () => number;
};

function seasonSlug(seasonKey: string): string {
  return seasonKey.replaceAll(":", "-");
}

async function responseText(response: Response, label: string): Promise<string> {
  if (!response.ok) throw new Error(`${label} failed with HTTP ${response.status}`);
  return response.text();
}

async function validateArtifactResponse(
  response: Response,
  reference: CurrentOpportunityManifestV1["artifact"],
): Promise<unknown> {
  const text = await responseText(response, `Opportunity artifact ${reference.key}`);
  const bytes = new TextEncoder().encode(text);
  if (bytes.byteLength !== reference.uncompressedBytes) {
    throw new Error(`Opportunity artifact ${reference.key} has an invalid byte count`);
  }
  if ((await sha256Hex(bytes)) !== reference.contentSha256) {
    throw new Error(`Opportunity artifact ${reference.key} failed content verification`);
  }
  return JSON.parse(text);
}

export function createPublicOpportunityClient({
  baseUrl,
  fetcher = fetch,
  now = Date.now,
}: PublicOpportunityClientOptions) {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const artifactUrl = (key: string) => new URL(`/${key}`, normalizedBase).toString();
  const cache = new Map<
    string,
    {
      loadedAt: number;
      value?: PublicOpportunityLoad;
      pending?: Promise<PublicOpportunityLoad>;
    }
  >();

  async function freshLoad(seasonKey: string): Promise<PublicOpportunityLoad> {
    const manifestUrl = `${normalizedBase}/${seasonSlug(seasonKey)}/current.json`;
    const manifest = currentOpportunityManifestSchema.parse(
      JSON.parse(
        await responseText(
          await fetcher(manifestUrl, { headers: { Accept: "application/json" } }),
          "Opportunity manifest",
        ),
      ),
    );
    if (manifest.seasonKey !== seasonKey) {
      throw new Error(`Opportunity manifest season mismatch for ${seasonKey}`);
    }
    const bundle = publishedOpportunityBundleSchema.parse(
      await validateArtifactResponse(
        await fetcher(artifactUrl(manifest.artifact.key), {
          headers: { Accept: "application/json" },
        }),
        manifest.artifact,
      ),
    );
    if (
      bundle.publicationId !== manifest.publicationId ||
      bundle.runId !== manifest.runId ||
      bundle.season.key !== manifest.seasonKey
    ) {
      throw new Error("Opportunity bundle does not match its current manifest");
    }
    return { manifest, bundle, stale: false };
  }

  return {
    async load(seasonKey: string): Promise<PublicOpportunityLoad> {
      const current = cache.get(seasonKey);
      if (current?.value && now() - current.loadedAt < 60_000) return current.value;
      if (current?.pending) return current.pending;
      const pending = freshLoad(seasonKey)
        .then((value) => {
          cache.set(seasonKey, { loadedAt: now(), value });
          return value;
        })
        .catch((error) => {
          if (current?.value) {
            const stale = { ...current.value, stale: true };
            cache.set(seasonKey, { loadedAt: now(), value: stale });
            return stale;
          }
          cache.delete(seasonKey);
          throw error;
        });
      cache.set(seasonKey, { loadedAt: current?.loadedAt ?? now(), ...current, pending });
      return pending;
    },

    async loadReplay(
      manifest: CurrentOpportunityManifestV1,
    ): Promise<OpportunityReplayArtifactV1 | undefined> {
      if (!manifest.replay) return undefined;
      const response = await fetcher(artifactUrl(manifest.replay.key), {
        headers: { Accept: "application/json" },
      });
      return opportunityReplayArtifactSchema.parse(
        await validateArtifactResponse(response, manifest.replay),
      );
    },

    clear() {
      cache.clear();
    },
  };
}

let defaultClient: ReturnType<typeof createPublicOpportunityClient> | undefined;

export function publicOpportunityClient() {
  if (defaultClient) return defaultClient;
  const baseUrl = import.meta.env.VITE_MI_PUBLIC_ARTIFACT_BASE_URL;
  if (!baseUrl) throw new Error("VITE_MI_PUBLIC_ARTIFACT_BASE_URL is required in R2 data mode");
  defaultClient = createPublicOpportunityClient({ baseUrl });
  return defaultClient;
}
