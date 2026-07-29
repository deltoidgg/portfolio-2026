import { z } from "zod";
import type { JsonValue } from "../contracts.ts";
import {
  forecastProvenanceSchema,
  opportunityGameweekSchema,
  opportunitySeasonContextSchema,
  opportunityTrailPointSchema,
  ownershipStateSchema,
  priceStateSchema,
  projectOpportunityMap,
  sourceHealthSchema,
  type FplPlayerState,
  type OpportunityMap,
  type OpportunitySnapshot,
  type SourceHealth,
} from "../opportunity-map.ts";

const isoDateTime = z.iso.datetime({ offset: true });
const probability = z.number().min(0).max(1);
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const horizonSchema = z.union([z.literal(1), z.literal(3), z.literal(5)]);

export const publishedFplPlayerStateSchema = z.object({
  pricePressureStatus: z.enum(["locked", "unavailable"]),
  chanceOfPlayingThisRound: probability.optional(),
  news: z.string().optional(),
  newsAddedAt: isoDateTime.optional(),
});

export const publishedHorizonSummarySchema = z.object({
  expectedPoints: z.number().finite(),
  p10: z.number().finite(),
  p50: z.number().finite(),
  p90: z.number().finite(),
  haulProbability: probability,
  sixtyMinuteProbability: probability,
  marketCoverage: probability,
  sourceAgreement: probability,
  forecastRankWithinPosition: z.number().int().positive(),
  gameweeks: z.array(opportunityGameweekSchema),
  provenance: forecastProvenanceSchema,
});

const publishedPlayerSchema = z.object({
  registrationKey: z.string().min(1),
  playerKey: z.string().min(1),
  name: z.string().min(1),
  team: z.string().min(1),
  position: z.enum(["GKP", "DEF", "MID", "FWD"]),
  registrationStatus: z.enum(["provisional", "active", "departed", "unresolved"]),
  price: priceStateSchema,
  ownership: ownershipStateSchema,
  fpl: publishedFplPlayerStateSchema.optional(),
  horizons: z.object({
    "1": publishedHorizonSummarySchema,
    "3": publishedHorizonSummarySchema,
    "5": publishedHorizonSummarySchema,
  }),
});

export const publishedOpportunityBundleSchema = z.object({
  schemaVersion: z.literal("opportunity-bundle/v1"),
  publicationId: z.string().min(1),
  runId: z.string().min(1),
  datasetKey: z.string().min(1),
  season: opportunitySeasonContextSchema,
  observedAt: isoDateTime,
  fromGameweek: z.number().int().positive(),
  availableHorizons: z.tuple([z.literal(1), z.literal(3), z.literal(5)]),
  sourceHealth: z.array(sourceHealthSchema),
  players: z.array(publishedPlayerSchema),
});

const replayPlayerSchema = z.object({
  registrationKey: z.string().min(1),
  horizons: z.object({
    "1": z.array(opportunityTrailPointSchema).max(12),
    "3": z.array(opportunityTrailPointSchema).max(12),
    "5": z.array(opportunityTrailPointSchema).max(12),
  }),
});

export const opportunityReplayArtifactSchema = z.object({
  schemaVersion: z.literal("opportunity-replay/v1"),
  publicationId: z.string().min(1),
  players: z.array(replayPlayerSchema),
});

const artifactReferenceSchema = z.object({
  key: z.string().min(1),
  contentSha256: sha256,
  objectSha256: sha256,
  compressedBytes: z.number().int().nonnegative(),
  uncompressedBytes: z.number().int().nonnegative(),
});

export const currentOpportunityManifestSchema = z.object({
  schemaVersion: z.literal("opportunity-current/v1"),
  seasonKey: z.string().min(1),
  checkedAt: isoDateTime,
  observedAt: isoDateTime,
  validUntil: isoDateTime,
  runId: z.string().min(1),
  publicationId: z.string().min(1),
  sourceHealth: z.array(sourceHealthSchema),
  artifact: artifactReferenceSchema,
  replay: artifactReferenceSchema.extend({ pointCount: z.number().int().nonnegative() }).optional(),
});

const forecastInputHeadSchema = z.object({
  sourceKey: z.string().min(1),
  materialHash: sha256,
  rawObjectKeys: z.array(z.string().min(1)).min(1),
  capturedAt: isoDateTime,
});

export const forecastBundleArtifactSchema = z.object({
  schemaVersion: z.literal("forecast-bundle/v1"),
  runId: z.string().min(1),
  datasetKey: z.string().min(1),
  seasonKey: z.string().min(1),
  fromGameweek: z.number().int().positive(),
  horizons: z.tuple([z.literal(1), z.literal(3), z.literal(5)]),
  cutoffAt: isoDateTime,
  modelKey: z.string().min(1),
  modelVersion: z.string().min(1),
  codeVersion: z.string().min(1),
  rulesetKey: z.string().min(1),
  modelInputHash: sha256,
  inputHeads: z.array(forecastInputHeadSchema),
  normalizedInput: z.record(z.string(), z.json()),
  fixtureForecasts: z.array(z.record(z.string(), z.json())),
  snapshots: z.object({
    "1": z.json(),
    "3": z.json(),
    "5": z.json(),
  }),
});

export type PublishedOpportunityBundleV1 = z.infer<typeof publishedOpportunityBundleSchema>;
export type OpportunityReplayArtifactV1 = z.infer<typeof opportunityReplayArtifactSchema>;
export type CurrentOpportunityManifestV1 = z.infer<typeof currentOpportunityManifestSchema>;
export type ForecastBundleArtifactV1 = z.infer<typeof forecastBundleArtifactSchema>;

type HorizonSnapshots = Record<1 | 3 | 5, OpportunitySnapshot>;

function compactFplState(state: FplPlayerState | undefined) {
  if (!state) return undefined;
  return {
    pricePressureStatus:
      state.pricePressureStatus === "locked" ? ("locked" as const) : ("unavailable" as const),
    ...(state.chanceOfPlayingThisRound === undefined
      ? {}
      : { chanceOfPlayingThisRound: state.chanceOfPlayingThisRound }),
    ...(state.news === undefined ? {} : { news: state.news }),
    ...(state.newsAddedAt === undefined ? {} : { newsAddedAt: state.newsAddedAt }),
  };
}

function horizonSummary(
  player: OpportunitySnapshot["players"][number],
): z.infer<typeof publishedHorizonSummarySchema> {
  return {
    expectedPoints: player.expectedPoints,
    p10: player.p10,
    p50: player.p50,
    p90: player.p90,
    haulProbability: player.haulProbability,
    sixtyMinuteProbability: player.sixtyMinuteProbability,
    marketCoverage: player.marketCoverage,
    sourceAgreement: player.sourceAgreement,
    forecastRankWithinPosition: player.forecastRankWithinPosition,
    gameweeks: player.gameweeks,
    provenance: player.provenance,
  };
}

function playersByRegistration(snapshot: OpportunitySnapshot) {
  return new Map(snapshot.players.map((player) => [player.registrationKey, player]));
}

function assertCompatibleSnapshots(snapshots: HorizonSnapshots): void {
  const baseline = snapshots[1];
  const registrations = baseline.players.map((player) => player.registrationKey).toSorted();
  for (const horizon of [1, 3, 5] as const) {
    const snapshot = snapshots[horizon];
    const candidate = snapshot.players.map((player) => player.registrationKey).toSorted();
    if (
      snapshot.horizon !== horizon ||
      snapshot.datasetKey !== baseline.datasetKey ||
      snapshot.season.key !== baseline.season.key ||
      snapshot.fromGameweek !== baseline.fromGameweek ||
      JSON.stringify(candidate) !== JSON.stringify(registrations)
    ) {
      throw new Error(`Opportunity horizon ${horizon} is incompatible with the bundle`);
    }
  }
}

export function createPublishedOpportunityBundle(input: {
  publicationId: string;
  runId: string;
  snapshots: HorizonSnapshots;
}): PublishedOpportunityBundleV1 {
  assertCompatibleSnapshots(input.snapshots);
  const byHorizon = {
    1: playersByRegistration(input.snapshots[1]),
    3: playersByRegistration(input.snapshots[3]),
    5: playersByRegistration(input.snapshots[5]),
  };
  const baseline = input.snapshots[1];
  return publishedOpportunityBundleSchema.parse({
    schemaVersion: "opportunity-bundle/v1",
    publicationId: input.publicationId,
    runId: input.runId,
    datasetKey: baseline.datasetKey,
    season: baseline.season,
    observedAt: [1, 3, 5]
      .map((horizon) => input.snapshots[horizon as 1 | 3 | 5].observedAt)
      .toSorted()
      .at(-1),
    fromGameweek: baseline.fromGameweek,
    availableHorizons: [1, 3, 5],
    sourceHealth: baseline.sourceHealth,
    players: baseline.players.map((player) => {
      const horizon1 = byHorizon[1].get(player.registrationKey)!;
      const horizon3 = byHorizon[3].get(player.registrationKey)!;
      const horizon5 = byHorizon[5].get(player.registrationKey)!;
      return {
        registrationKey: player.registrationKey,
        playerKey: player.playerKey,
        name: player.name,
        team: player.team,
        position: player.position,
        registrationStatus: player.registrationStatus,
        price: player.price,
        ownership: player.ownership,
        ...(compactFplState(player.fpl) ? { fpl: compactFplState(player.fpl) } : {}),
        horizons: {
          1: horizonSummary(horizon1),
          3: horizonSummary(horizon3),
          5: horizonSummary(horizon5),
        },
      };
    }),
  });
}

export function createOpportunityReplayArtifact(input: {
  publicationId: string;
  snapshots: HorizonSnapshots;
}): OpportunityReplayArtifactV1 {
  assertCompatibleSnapshots(input.snapshots);
  const byHorizon = {
    1: playersByRegistration(input.snapshots[1]),
    3: playersByRegistration(input.snapshots[3]),
    5: playersByRegistration(input.snapshots[5]),
  };
  return opportunityReplayArtifactSchema.parse({
    schemaVersion: "opportunity-replay/v1",
    publicationId: input.publicationId,
    players: input.snapshots[1].players.map((player) => ({
      registrationKey: player.registrationKey,
      horizons: {
        1: byHorizon[1].get(player.registrationKey)!.trail.slice(-12),
        3: byHorizon[3].get(player.registrationKey)!.trail.slice(-12),
        5: byHorizon[5].get(player.registrationKey)!.trail.slice(-12),
      },
    })),
  });
}

export function selectOpportunityMap(
  untrustedBundle: PublishedOpportunityBundleV1,
  horizon: 1 | 3 | 5,
  untrustedReplay?: OpportunityReplayArtifactV1,
  sourceHealth?: SourceHealth[],
): OpportunityMap {
  const bundle = publishedOpportunityBundleSchema.parse(untrustedBundle);
  const selectedHorizon = horizonSchema.parse(horizon);
  const replay = untrustedReplay
    ? opportunityReplayArtifactSchema.parse(untrustedReplay)
    : undefined;
  if (replay && replay.publicationId !== bundle.publicationId) {
    throw new Error("Replay artifact does not match the selected opportunity publication");
  }
  const trails = new Map(
    replay?.players.map((player) => [
      player.registrationKey,
      player.horizons[String(selectedHorizon) as "1" | "3" | "5"],
    ]) ?? [],
  );
  return projectOpportunityMap({
    key: `${bundle.publicationId}:h${selectedHorizon}`,
    datasetKey: bundle.datasetKey,
    season: bundle.season,
    observedAt: bundle.observedAt,
    fromGameweek: bundle.fromGameweek,
    horizon: selectedHorizon,
    sourceHealth: sourceHealth ?? bundle.sourceHealth,
    players: bundle.players.map((player) => {
      const summary = player.horizons[String(selectedHorizon) as "1" | "3" | "5"];
      return {
        registrationKey: player.registrationKey,
        playerKey: player.playerKey,
        name: player.name,
        team: player.team,
        position: player.position,
        registrationStatus: player.registrationStatus,
        price: player.price,
        ownership: player.ownership,
        ...summary,
        trail: trails.get(player.registrationKey) ?? [],
        ...(player.fpl ? { fpl: player.fpl } : {}),
      };
    }),
  });
}

export type ForecastBundleInput = {
  runId: string;
  normalizedInput: Record<string, JsonValue>;
};
