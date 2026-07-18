import { z } from "zod";
import { pricePublicationStateSchema, seasonLifecycleSchema } from "./season-domain.ts";

const isoDateTime = z.iso.datetime({ offset: true });
const probability = z.number().min(0).max(1);

export const priceStateSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("unpublished") }),
  z.object({
    status: z.literal("estimated"),
    low: z.number().positive(),
    midpoint: z.number().positive(),
    high: z.number().positive(),
    method: z.string().min(1),
  }),
  z.object({
    status: z.literal("official"),
    value: z.number().positive(),
    observedAt: isoDateTime,
    priorEstimate: z
      .object({
        low: z.number().positive(),
        midpoint: z.number().positive(),
        high: z.number().positive(),
      })
      .optional(),
  }),
]);

export const ownershipStateSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("unavailable") }),
  z.object({ status: z.literal("provisional"), value: z.number().min(0).max(100) }),
  z.object({
    status: z.literal("official"),
    value: z.number().min(0).max(100),
    rankWithinPosition: z.number().int().positive(),
    observedAt: isoDateTime,
  }),
]);

export const forecastProvenanceSchema = z.object({
  seasonKey: z.string().min(1),
  rulesetKey: z.string().min(1),
  rulesetStatus: z.enum(["provisional", "official"]),
  modelKey: z.string().min(1),
  modelVersion: z.string().min(1),
  cutoffAt: isoDateTime,
  codeVersion: z.string().min(1),
  inputBatchIds: z.array(z.string().min(1)).min(1),
});

export const opportunityGameweekSchema = z.object({
  gameweek: z.number().int().positive(),
  expectedPoints: z.number().finite(),
  p10: z.number().finite(),
  p50: z.number().finite(),
  p90: z.number().finite(),
  fixtures: z.array(z.string()),
});

export const opportunityTrailPointSchema = z.object({
  observedAt: isoDateTime,
  expectedPoints: z.number().finite(),
  price: z.number().positive().optional(),
  ownershipRankGap: z.number().finite().optional(),
});

export const opportunityPlayerSchema = z.object({
  registrationKey: z.string().min(1),
  playerKey: z.string().min(1),
  name: z.string().min(1),
  team: z.string().min(1),
  position: z.enum(["GKP", "DEF", "MID", "FWD"]),
  registrationStatus: z.enum(["provisional", "active", "departed", "unresolved"]),
  price: priceStateSchema,
  ownership: ownershipStateSchema,
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
  trail: z.array(opportunityTrailPointSchema),
  provenance: forecastProvenanceSchema,
});

export const sourceHealthSchema = z.object({
  sourceKey: z.string().min(1),
  label: z.string().min(1),
  status: z.enum(["fresh", "stale", "partial", "failed", "missing"]),
  lastCapturedAt: isoDateTime.optional(),
  coverage: probability,
  detail: z.string().optional(),
});

export const opportunitySeasonContextSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  lifecycle: seasonLifecycleSchema,
  priceState: pricePublicationStateSchema,
  rulesetKey: z.string().min(1),
  rulesetStatus: z.enum(["provisional", "official"]),
});

export const opportunitySnapshotSchema = z.object({
  key: z.string().min(1),
  datasetKey: z.string().min(1),
  season: opportunitySeasonContextSchema,
  observedAt: isoDateTime,
  fromGameweek: z.number().int().positive(),
  horizon: z.union([z.literal(1), z.literal(3), z.literal(5)]),
  sourceHealth: z.array(sourceHealthSchema),
  players: z.array(opportunityPlayerSchema),
});

export const opportunityMapQuerySchema = z.object({
  datasetKey: z.string().min(1).default("live"),
  seasonKey: z.string().min(1),
  fromGameweek: z.number().int().positive(),
  horizon: z.union([z.literal(1), z.literal(3), z.literal(5)]),
  snapshotAt: isoDateTime.optional(),
});

export type PriceState = z.infer<typeof priceStateSchema>;
export type OwnershipState = z.infer<typeof ownershipStateSchema>;
export type ForecastProvenance = z.infer<typeof forecastProvenanceSchema>;
export type OpportunityGameweek = z.infer<typeof opportunityGameweekSchema>;
export type OpportunityTrailPoint = z.infer<typeof opportunityTrailPointSchema>;
export type OpportunityPlayer = z.infer<typeof opportunityPlayerSchema>;
export type SourceHealth = z.infer<typeof sourceHealthSchema>;
export type OpportunitySeasonContext = z.infer<typeof opportunitySeasonContextSchema>;
export type OpportunitySnapshot = z.infer<typeof opportunitySnapshotSchema>;
export type OpportunityMapQuery = z.input<typeof opportunityMapQuerySchema>;
export type OpportunityMap = Omit<OpportunitySnapshot, "players"> & {
  players: Array<
    OpportunityPlayer & {
      expectedPointsPerMillion?: number;
      ownershipRankGap?: number;
    }
  >;
};

function round(value: number): number {
  return Number(value.toFixed(2));
}

export function projectOpportunityMap(snapshot: OpportunitySnapshot): OpportunityMap {
  const parsed = opportunitySnapshotSchema.parse(snapshot);
  return {
    ...parsed,
    players: parsed.players.map((player) => {
      const expectedPointsPerMillion =
        player.price.status === "official"
          ? round(player.expectedPoints / player.price.value)
          : player.price.status === "estimated"
            ? round(player.expectedPoints / player.price.midpoint)
            : undefined;
      const ownershipRankGap =
        player.ownership.status === "official"
          ? player.ownership.rankWithinPosition - player.forecastRankWithinPosition
          : undefined;
      return {
        ...player,
        ...(expectedPointsPerMillion === undefined ? {} : { expectedPointsPerMillion }),
        ...(ownershipRankGap === undefined ? {} : { ownershipRankGap }),
      };
    }),
  };
}
