import { z } from "zod";

const isoDateTime = z.iso.datetime({ offset: true });
const probabilitySchema = z.number().min(0).max(1);
export const jsonValueSchema = z.json();
const jsonRecord = z.record(z.string(), jsonValueSchema);

export const gameweekScopeSchema = z.object({
  competition: z.string().min(1),
  season: z.string().min(1),
  gameweek: z.number().int().positive(),
});

export const sourceSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum([
    "fpl",
    "aggregator",
    "bookmaker",
    "exchange",
    "prediction-market",
    "model",
    "event-data",
  ]),
  metadata: jsonRecord.optional(),
});

export const entitySchema = z.object({
  key: z.string().min(1),
  type: z.enum(["team", "player", "fixture", "market"]),
  name: z.string().min(1),
  teamKey: z.string().min(1).optional(),
  metadata: jsonRecord.optional(),
});

export const sourceEntityAliasSchema = z.object({
  sourceKey: z.string().min(1),
  sourceEntityKey: z.string().min(1),
  entityKey: z.string().min(1),
  matchMethod: z.enum(["provider-id", "deterministic-alias", "reviewed", "fuzzy-review"]),
  confidence: z.number().min(0).max(1),
  effectiveFrom: isoDateTime,
  effectiveTo: isoDateTime.optional(),
  metadata: jsonRecord.optional(),
});

export const fixtureSchema = gameweekScopeSchema.extend({
  key: z.string().min(1),
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  kickoffAt: isoDateTime,
  deadlineAt: isoDateTime,
  metadata: jsonRecord.optional(),
});

export const rawSnapshotSchema = z.object({
  key: z.string().min(1),
  endpoint: z.string().min(1),
  observedAt: isoDateTime,
  payload: jsonValueSchema,
  statusCode: z.number().int().optional(),
  metadata: jsonRecord.optional(),
});

export const observationSchema = z.object({
  key: z.string().min(1),
  fixtureKey: z.string().min(1).optional(),
  entityKey: z.string().min(1),
  metric: z.string().min(1),
  observedAt: isoDateTime,
  publishedAt: isoDateTime.optional(),
  numericValue: z.number().finite().optional(),
  stringValue: z.string().optional(),
  unit: z.string().optional(),
  marketFamily: z.string().optional(),
  outcome: z.string().optional(),
  metadata: jsonRecord.optional(),
});

export const forecastComponentsSchema = z.object({
  appearance: z.number().finite(),
  goals: z.number().finite(),
  assists: z.number().finite(),
  cleanSheet: z.number().finite(),
  bonus: z.number().finite(),
  other: z.number().finite().optional(),
});

export const forecastSignalSchema = z.object({
  key: z.string().min(1),
  sourceKey: z.string().min(1),
  label: z.string().min(1),
  value: z.string().min(1),
  movement: z.number().finite().optional(),
  direction: z.enum(["up", "down", "flat"]).optional(),
  detail: z.string().optional(),
});

export const forecastQuoteSchema = z.object({
  sourceKey: z.string().min(1),
  label: z.string().min(1),
  marketFamily: z.string().min(1),
  decimalOdds: z.number().gt(1),
  impliedProbability: probabilitySchema,
});

export const forecastConsensusSchema = z.object({
  marketFamily: z.string().min(1),
  label: z.string().min(1),
  probability: probabilitySchema,
  low: probabilitySchema,
  high: probabilitySchema,
  spread: probabilitySchema,
  quoteCount: z.number().int().nonnegative(),
  adjustmentMethod: z.string().min(1),
});

export const forecastRecipeSchema = z.object({
  quotes: z.array(forecastQuoteSchema),
  consensus: z.array(forecastConsensusSchema),
  minutes: z.object({
    playProbability: probabilitySchema,
    sixtyMinuteProbability: probabilitySchema,
    expectedMinutes: z.number().min(0).max(90),
  }),
  rates: z.object({
    goal: z.number().min(0),
    assist: z.number().min(0),
    cleanSheet: probabilitySchema,
  }),
});

export const forecastEvidenceSchema = z.object({
  headline: z.string().min(1),
  detail: z.string().min(1),
  sourceKeys: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  signals: z.array(forecastSignalSchema).optional(),
  recipe: forecastRecipeSchema.optional(),
});

export const forecastSchema = gameweekScopeSchema.extend({
  modelKey: z.string().min(1),
  playerKey: z.string().min(1),
  playerName: z.string().min(1),
  teamKey: z.string().min(1),
  position: z.enum(["GKP", "DEF", "MID", "FWD"]),
  observedAt: isoDateTime,
  deadlineAt: isoDateTime,
  expectedPoints: z.number().finite(),
  p10: z.number().finite(),
  p50: z.number().finite(),
  p90: z.number().finite(),
  rank: z.number().int().positive(),
  components: forecastComponentsSchema,
  evidence: forecastEvidenceSchema,
  metadata: jsonRecord.optional(),
});

export const annotationSchema = z.object({
  key: z.string().min(1),
  observedAt: isoDateTime,
  sourceKey: z.string().min(1),
  category: z.enum(["market-move", "team-news", "availability", "model", "system"]),
  title: z.string().min(1),
  detail: z.string().min(1),
  impact: z.number().finite(),
  fixtureKey: z.string().min(1).optional(),
  playerKey: z.string().min(1).optional(),
  metadata: jsonRecord.optional(),
});

export const captureBatchSchema = z.object({
  id: z.string().min(1),
  source: sourceSchema,
  capturedAt: isoDateTime,
  fixtures: z.array(fixtureSchema),
  rawSnapshots: z.array(rawSnapshotSchema),
  observations: z.array(observationSchema),
  forecasts: z.array(forecastSchema),
  annotations: z.array(annotationSchema),
  entities: z.array(entitySchema).optional(),
  entityAliases: z.array(sourceEntityAliasSchema).optional(),
  metadata: jsonRecord.optional(),
});

export const deadlineRoomQuerySchema = gameweekScopeSchema;

export type Source = z.infer<typeof sourceSchema>;
export type Entity = z.infer<typeof entitySchema>;
export type SourceEntityAlias = z.infer<typeof sourceEntityAliasSchema>;
export type JsonValue = z.infer<typeof jsonValueSchema>;
export type Fixture = z.infer<typeof fixtureSchema>;
export type RawSnapshot = z.infer<typeof rawSnapshotSchema>;
export type Observation = z.infer<typeof observationSchema>;
export type Forecast = z.infer<typeof forecastSchema>;
export type ForecastComponents = z.infer<typeof forecastComponentsSchema>;
export type ForecastEvidence = z.infer<typeof forecastEvidenceSchema>;
export type ForecastSignal = z.infer<typeof forecastSignalSchema>;
export type ForecastQuote = z.infer<typeof forecastQuoteSchema>;
export type ForecastConsensus = z.infer<typeof forecastConsensusSchema>;
export type ForecastRecipe = z.infer<typeof forecastRecipeSchema>;
export type Annotation = z.infer<typeof annotationSchema>;
export type CaptureBatch = z.infer<typeof captureBatchSchema>;
export type GameweekScope = z.infer<typeof gameweekScopeSchema>;
export type DeadlineRoomQuery = z.infer<typeof deadlineRoomQuerySchema>;

export type IngestReceipt = {
  batchId: string;
  inserted: boolean;
  capturedAt: string;
  fixtures: number;
  observations: number;
  forecasts: number;
  annotations: number;
};

export type TimelinePoint = {
  observedAt: string;
  label: string;
  minutesToDeadline: number;
};

export type ForecastPoint = Pick<
  Forecast,
  "observedAt" | "expectedPoints" | "p10" | "p50" | "p90" | "rank" | "components" | "evidence"
>;

export type RoomPlayer = Pick<Forecast, "playerKey" | "playerName" | "teamKey" | "position"> & {
  series: ForecastPoint[];
};

export type RoomSource = Source & {
  lastCapturedAt: string;
  captureCount: number;
  captureTimes: string[];
};

export type DeadlineRoom = DeadlineRoomQuery & {
  dataMode: "demo" | "neon";
  deadlineAt: string;
  generatedAt: string;
  fixtures: Fixture[];
  sources: RoomSource[];
  timeline: TimelinePoint[];
  players: RoomPlayer[];
  annotations: Annotation[];
};
