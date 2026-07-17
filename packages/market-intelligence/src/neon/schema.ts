import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { ForecastComponents, ForecastEvidence, JsonValue } from "../contracts.ts";

const capturedAt = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "string" }).notNull();

export const sources = pgTable("mi_sources", {
  sourceKey: text("source_key").primaryKey(),
  label: text("label").notNull(),
  kind: text("kind").notNull(),
  metadata: jsonb("metadata").$type<Record<string, JsonValue>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  lastCapturedAt: capturedAt("last_captured_at"),
});

export const entities = pgTable(
  "mi_entities",
  {
    entityKey: text("entity_key").primaryKey(),
    entityType: text("entity_type").notNull(),
    name: text("name").notNull(),
    teamKey: text("team_key"),
    metadata: jsonb("metadata").$type<Record<string, JsonValue>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("mi_entities_type_idx").on(table.entityType)],
);

export const sourceEntityAliases = pgTable(
  "mi_source_entity_aliases",
  {
    sourceKey: text("source_key")
      .notNull()
      .references(() => sources.sourceKey, { onDelete: "cascade" }),
    sourceEntityKey: text("source_entity_key").notNull(),
    entityKey: text("entity_key")
      .notNull()
      .references(() => entities.entityKey, { onDelete: "cascade" }),
    matchMethod: text("match_method").notNull(),
    confidence: doublePrecision("confidence").notNull(),
    effectiveFrom: capturedAt("effective_from"),
    effectiveTo: timestamp("effective_to", { withTimezone: true, mode: "string" }),
    metadata: jsonb("metadata").$type<Record<string, JsonValue>>().notNull().default({}),
  },
  (table) => [
    primaryKey({ columns: [table.sourceKey, table.sourceEntityKey, table.effectiveFrom] }),
    index("mi_source_entity_aliases_entity_idx").on(table.entityKey),
  ],
);

export const fixtures = pgTable(
  "mi_fixtures",
  {
    fixtureKey: text("fixture_key").primaryKey(),
    competition: text("competition").notNull(),
    season: text("season").notNull(),
    gameweek: integer("gameweek").notNull(),
    homeTeam: text("home_team").notNull(),
    awayTeam: text("away_team").notNull(),
    kickoffAt: capturedAt("kickoff_at"),
    deadlineAt: capturedAt("deadline_at"),
    metadata: jsonb("metadata").$type<Record<string, JsonValue>>().notNull().default({}),
  },
  (table) => [
    index("mi_fixtures_scope_idx").on(table.competition, table.season, table.gameweek),
    index("mi_fixtures_kickoff_idx").on(table.kickoffAt),
  ],
);

export const captureBatches = pgTable(
  "mi_capture_batches",
  {
    batchId: text("batch_id").primaryKey(),
    sourceKey: text("source_key")
      .notNull()
      .references(() => sources.sourceKey),
    capturedAt: capturedAt("captured_at"),
    fixtureCount: integer("fixture_count").notNull(),
    observationCount: integer("observation_count").notNull(),
    forecastCount: integer("forecast_count").notNull(),
    annotationCount: integer("annotation_count").notNull(),
    metadata: jsonb("metadata").$type<Record<string, JsonValue>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("mi_capture_batches_source_time_idx").on(table.sourceKey, table.capturedAt)],
);

export const captureScopes = pgTable(
  "mi_capture_scopes",
  {
    batchId: text("batch_id")
      .notNull()
      .references(() => captureBatches.batchId, { onDelete: "cascade" }),
    competition: text("competition").notNull(),
    season: text("season").notNull(),
    gameweek: integer("gameweek").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.batchId, table.competition, table.season, table.gameweek] }),
    index("mi_capture_scopes_room_idx").on(table.competition, table.season, table.gameweek),
  ],
);

export const rawSnapshots = pgTable(
  "mi_raw_snapshots",
  {
    snapshotKey: text("snapshot_key").primaryKey(),
    batchId: text("batch_id")
      .notNull()
      .references(() => captureBatches.batchId, { onDelete: "cascade" }),
    sourceKey: text("source_key")
      .notNull()
      .references(() => sources.sourceKey),
    endpoint: text("endpoint").notNull(),
    observedAt: capturedAt("observed_at"),
    payload: jsonb("payload").$type<JsonValue>().notNull(),
    statusCode: integer("status_code"),
    metadata: jsonb("metadata").$type<Record<string, JsonValue>>().notNull().default({}),
  },
  (table) => [index("mi_raw_snapshots_source_time_idx").on(table.sourceKey, table.observedAt)],
);

export const observations = pgTable(
  "mi_observations",
  {
    observationKey: text("observation_key").primaryKey(),
    batchId: text("batch_id")
      .notNull()
      .references(() => captureBatches.batchId, { onDelete: "cascade" }),
    sourceKey: text("source_key")
      .notNull()
      .references(() => sources.sourceKey),
    fixtureKey: text("fixture_key").references(() => fixtures.fixtureKey),
    entityKey: text("entity_key").notNull(),
    metric: text("metric").notNull(),
    observedAt: capturedAt("observed_at"),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }),
    numericValue: doublePrecision("numeric_value"),
    stringValue: text("string_value"),
    unit: text("unit"),
    marketFamily: text("market_family"),
    outcome: text("outcome"),
    metadata: jsonb("metadata").$type<Record<string, JsonValue>>().notNull().default({}),
  },
  (table) => [
    index("mi_observations_entity_metric_time_idx").on(
      table.entityKey,
      table.metric,
      table.observedAt,
    ),
    index("mi_observations_fixture_time_idx").on(table.fixtureKey, table.observedAt),
    index("mi_observations_market_idx").on(table.marketFamily, table.outcome),
  ],
);

export const forecasts = pgTable(
  "mi_forecasts",
  {
    forecastKey: text("forecast_key").primaryKey(),
    batchId: text("batch_id")
      .notNull()
      .references(() => captureBatches.batchId, { onDelete: "cascade" }),
    modelKey: text("model_key").notNull(),
    playerKey: text("player_key").notNull(),
    playerName: text("player_name").notNull(),
    teamKey: text("team_key").notNull(),
    position: text("position").notNull(),
    competition: text("competition").notNull(),
    season: text("season").notNull(),
    gameweek: integer("gameweek").notNull(),
    observedAt: capturedAt("observed_at"),
    deadlineAt: capturedAt("deadline_at"),
    expectedPoints: doublePrecision("expected_points").notNull(),
    p10: doublePrecision("p10").notNull(),
    p50: doublePrecision("p50").notNull(),
    p90: doublePrecision("p90").notNull(),
    rank: integer("rank").notNull(),
    components: jsonb("components").$type<ForecastComponents>().notNull(),
    evidence: jsonb("evidence").$type<ForecastEvidence>().notNull(),
    metadata: jsonb("metadata").$type<Record<string, JsonValue>>().notNull().default({}),
  },
  (table) => [
    index("mi_forecasts_room_time_idx").on(
      table.competition,
      table.season,
      table.gameweek,
      table.observedAt,
    ),
    index("mi_forecasts_player_time_idx").on(table.playerKey, table.observedAt),
  ],
);

export const annotations = pgTable(
  "mi_annotations",
  {
    annotationKey: text("annotation_key").primaryKey(),
    batchId: text("batch_id")
      .notNull()
      .references(() => captureBatches.batchId, { onDelete: "cascade" }),
    observedAt: capturedAt("observed_at"),
    sourceKey: text("source_key")
      .notNull()
      .references(() => sources.sourceKey),
    category: text("category").notNull(),
    title: text("title").notNull(),
    detail: text("detail").notNull(),
    impact: doublePrecision("impact").notNull(),
    fixtureKey: text("fixture_key").references(() => fixtures.fixtureKey),
    playerKey: text("player_key"),
    metadata: jsonb("metadata").$type<Record<string, JsonValue>>().notNull().default({}),
  },
  (table) => [index("mi_annotations_time_idx").on(table.observedAt)],
);
