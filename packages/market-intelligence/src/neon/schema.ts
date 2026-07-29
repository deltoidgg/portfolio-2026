import {
  doublePrecision,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { ForecastComponents, ForecastEvidence, JsonValue } from "../contracts.ts";
import type { HotArtifactReference, SourceHead } from "../hot-cold/hot-state.ts";
import type { OpportunitySnapshot } from "../opportunity-map.ts";

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
    seasonKey: text("season_key"),
    metadata: jsonb("metadata").$type<Record<string, JsonValue>>().notNull().default({}),
  },
  (table) => [
    primaryKey({ columns: [table.sourceKey, table.sourceEntityKey, table.effectiveFrom] }),
    index("mi_source_entity_aliases_entity_idx").on(table.entityKey),
    uniqueIndex("mi_source_entity_aliases_open_idx")
      .on(table.sourceKey, table.sourceEntityKey, sql`coalesce(${table.seasonKey}, '')`)
      .where(sql`${table.effectiveTo} IS NULL`),
  ],
);

export const fixtures = pgTable(
  "mi_fixtures",
  {
    fixtureKey: text("fixture_key").primaryKey(),
    seasonKey: text("season_key")
      .notNull()
      .references(() => seasons.seasonKey),
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
    datasetKey: text("dataset_key").notNull().default("live"),
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
    payload: jsonb("payload").$type<JsonValue>(),
    statusCode: integer("status_code"),
    objectKey: text("object_key"),
    sha256: text("sha256"),
    compressedBytes: integer("compressed_bytes"),
    uncompressedBytes: integer("uncompressed_bytes"),
    contentEncoding: text("content_encoding"),
    contentType: text("content_type"),
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
    datasetKey: text("dataset_key").notNull().default("live"),
    registrationKey: text("registration_key"),
    runId: text("run_id"),
    schemaVersion: integer("schema_version").notNull().default(1),
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

export const datasets = pgTable("mi_datasets", {
  datasetKey: text("dataset_key").primaryKey(),
  seasonKey: text("season_key").notNull(),
  kind: text("kind").notNull(),
  label: text("label").notNull(),
  frozenAt: timestamp("frozen_at", { withTimezone: true, mode: "string" }),
  metadata: jsonb("metadata").$type<Record<string, JsonValue>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const seasons = pgTable("mi_seasons", {
  seasonKey: text("season_key").primaryKey(),
  competition: text("competition").notNull(),
  label: text("label").notNull(),
  startsAt: capturedAt("starts_at"),
  endsAt: capturedAt("ends_at"),
  lifecycle: text("lifecycle").notNull(),
  priceState: text("price_state").notNull().default("unpublished"),
  currentGameweek: integer("current_gameweek"),
  rulesetKey: text("ruleset_key").notNull(),
  metadata: jsonb("metadata").$type<Record<string, JsonValue>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const rulesets = pgTable("mi_rulesets", {
  rulesetKey: text("ruleset_key").primaryKey(),
  seasonKey: text("season_key").notNull(),
  version: text("version").notNull(),
  status: text("status").notNull(),
  scoring: jsonb("scoring").$type<Record<string, JsonValue>>().notNull(),
  uiConfig: jsonb("ui_config").$type<Record<string, JsonValue>>().notNull().default({}),
  observedAt: timestamp("observed_at", { withTimezone: true, mode: "string" }),
  checksum: text("checksum").notNull(),
  sourceUrl: text("source_url"),
  publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const teamSeasons = pgTable(
  "mi_team_seasons",
  {
    teamSeasonKey: text("team_season_key").primaryKey(),
    seasonKey: text("season_key")
      .notNull()
      .references(() => seasons.seasonKey),
    clubKey: text("club_key").notNull(),
    name: text("name").notNull(),
    shortName: text("short_name").notNull(),
    metadata: jsonb("metadata").$type<Record<string, JsonValue>>().notNull().default({}),
  },
  (table) => [uniqueIndex("mi_team_seasons_season_club_idx").on(table.seasonKey, table.clubKey)],
);

export const playerRegistrations = pgTable(
  "mi_player_registrations",
  {
    registrationKey: text("registration_key").primaryKey(),
    seasonKey: text("season_key")
      .notNull()
      .references(() => seasons.seasonKey),
    playerKey: text("player_key").notNull(),
    teamSeasonKey: text("team_season_key").references(() => teamSeasons.teamSeasonKey),
    fplElementId: integer("fpl_element_id"),
    playerName: text("player_name").notNull(),
    position: text("position").notNull(),
    status: text("status").notNull(),
    confidence: doublePrecision("confidence").notNull(),
    metadata: jsonb("metadata").$type<Record<string, JsonValue>>().notNull().default({}),
  },
  (table) => [
    uniqueIndex("mi_player_registrations_season_element_idx").on(
      table.seasonKey,
      table.fplElementId,
    ),
    index("mi_player_registrations_player_idx").on(table.playerKey),
  ],
);

export const fixtureGameweekAssignments = pgTable(
  "mi_fixture_gameweek_assignments",
  {
    fixtureKey: text("fixture_key")
      .notNull()
      .references(() => fixtures.fixtureKey),
    effectiveFrom: capturedAt("effective_from"),
    effectiveTo: timestamp("effective_to", { withTimezone: true, mode: "string" }),
    kickoffAt: capturedAt("kickoff_at"),
    deadlineAt: capturedAt("deadline_at"),
    gameweek: integer("gameweek").notNull(),
    status: text("status").notNull().default("scheduled"),
  },
  (table) => [
    primaryKey({ columns: [table.fixtureKey, table.effectiveFrom] }),
    uniqueIndex("mi_fixture_gameweek_assignments_open_idx")
      .on(table.fixtureKey)
      .where(sql`${table.effectiveTo} IS NULL`),
  ],
);

export const fixtureLinks = pgTable(
  "mi_fixture_links",
  {
    sourceKey: text("source_key").notNull(),
    seasonKey: text("season_key").notNull(),
    sourceEventId: text("source_event_id").notNull(),
    fixtureKey: text("fixture_key").references(() => fixtures.fixtureKey),
    status: text("status").notNull(),
    matchMethod: text("match_method"),
    confidence: doublePrecision("confidence").notNull(),
    candidateFixtureKeys: jsonb("candidate_fixture_keys").$type<string[]>().notNull().default([]),
    observedAt: capturedAt("observed_at"),
    metadata: jsonb("metadata").$type<Record<string, JsonValue>>().notNull().default({}),
  },
  (table) => [primaryKey({ columns: [table.sourceKey, table.seasonKey, table.sourceEventId] })],
);

export const captureAttempts = pgTable(
  "mi_capture_attempts",
  {
    attemptKey: text("attempt_key").primaryKey(),
    sourceKey: text("source_key").notNull(),
    scopeKey: text("scope_key").notNull(),
    scheduledFor: capturedAt("scheduled_for"),
    status: text("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "string" }),
    finishedAt: timestamp("finished_at", { withTimezone: true, mode: "string" }),
    batchId: text("batch_id").references(() => captureBatches.batchId),
    objectKey: text("object_key"),
    error: text("error"),
    metadata: jsonb("metadata").$type<Record<string, JsonValue>>().notNull().default({}),
  },
  (table) => [
    uniqueIndex("mi_capture_attempts_slot_idx").on(
      table.sourceKey,
      table.scopeKey,
      table.scheduledFor,
    ),
  ],
);

export const modelRuns = pgTable(
  "mi_model_runs",
  {
    runId: text("run_id").primaryKey(),
    datasetKey: text("dataset_key")
      .notNull()
      .references(() => datasets.datasetKey),
    seasonKey: text("season_key")
      .notNull()
      .references(() => seasons.seasonKey),
    modelKey: text("model_key").notNull(),
    modelVersion: text("model_version").notNull(),
    rulesetKey: text("ruleset_key")
      .notNull()
      .references(() => rulesets.rulesetKey),
    fromGameweek: integer("from_gameweek").notNull(),
    toGameweek: integer("to_gameweek").notNull(),
    cutoffAt: capturedAt("cutoff_at"),
    codeVersion: text("code_version").notNull(),
    config: jsonb("config").$type<Record<string, JsonValue>>().notNull().default({}),
    configHash: text("config_hash").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("mi_model_runs_scope_idx").on(table.seasonKey, table.cutoffAt)],
);

export const modelRunInputs = pgTable(
  "mi_model_run_inputs",
  {
    runId: text("run_id")
      .notNull()
      .references(() => modelRuns.runId, { onDelete: "cascade" }),
    batchId: text("batch_id")
      .notNull()
      .references(() => captureBatches.batchId),
    role: text("role").notNull(),
  },
  (table) => [primaryKey({ columns: [table.runId, table.batchId, table.role] })],
);

export const playerFixtureForecasts = pgTable(
  "mi_player_fixture_forecasts",
  {
    runId: text("run_id")
      .notNull()
      .references(() => modelRuns.runId, { onDelete: "cascade" }),
    fixtureKey: text("fixture_key")
      .notNull()
      .references(() => fixtures.fixtureKey),
    registrationKey: text("registration_key")
      .notNull()
      .references(() => playerRegistrations.registrationKey),
    expectedPoints: doublePrecision("expected_points").notNull(),
    distribution: jsonb("distribution").$type<Array<[number, number]>>().notNull(),
    components: jsonb("components").$type<ForecastComponents>().notNull(),
    marketCoverage: doublePrecision("market_coverage").notNull(),
  },
  (table) => [primaryKey({ columns: [table.runId, table.fixtureKey, table.registrationKey] })],
);

export const forecastHorizons = pgTable(
  "mi_forecast_horizons",
  {
    runId: text("run_id")
      .notNull()
      .references(() => modelRuns.runId, { onDelete: "cascade" }),
    registrationKey: text("registration_key")
      .notNull()
      .references(() => playerRegistrations.registrationKey),
    fromGameweek: integer("from_gameweek").notNull(),
    horizon: integer("horizon").notNull(),
    expectedPoints: doublePrecision("expected_points").notNull(),
    p10: doublePrecision("p10").notNull(),
    p50: doublePrecision("p50").notNull(),
    p90: doublePrecision("p90").notNull(),
    haulProbability: doublePrecision("haul_probability").notNull(),
    sixtyMinuteProbability: doublePrecision("sixty_minute_probability").notNull(),
    marketCoverage: doublePrecision("market_coverage").notNull(),
    sourceAgreement: doublePrecision("source_agreement").notNull(),
    gameweeks: jsonb("gameweeks").$type<JsonValue>().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.runId, table.registrationKey, table.fromGameweek, table.horizon],
    }),
  ],
);

export const playerGameweekResults = pgTable(
  "mi_player_gameweek_results",
  {
    resultKey: text("result_key").primaryKey(),
    seasonKey: text("season_key")
      .notNull()
      .references(() => seasons.seasonKey),
    registrationKey: text("registration_key")
      .notNull()
      .references(() => playerRegistrations.registrationKey),
    gameweek: integer("gameweek").notNull(),
    status: text("status").notNull(),
    observedAt: capturedAt("observed_at"),
    totalPoints: integer("total_points").notNull(),
    components: jsonb("components").$type<ForecastComponents>().notNull(),
  },
  (table) => [
    index("mi_player_gameweek_results_scope_idx").on(table.seasonKey, table.gameweek),
    uniqueIndex("mi_player_gameweek_results_season_gameweek_registration_idx").on(
      table.seasonKey,
      table.gameweek,
      table.registrationKey,
    ),
  ],
);

export const playerFixtureResults = pgTable(
  "mi_player_fixture_results",
  {
    resultKey: text("result_key").primaryKey(),
    seasonKey: text("season_key")
      .notNull()
      .references(() => seasons.seasonKey),
    fixtureKey: text("fixture_key")
      .notNull()
      .references(() => fixtures.fixtureKey),
    registrationKey: text("registration_key")
      .notNull()
      .references(() => playerRegistrations.registrationKey),
    status: text("status").notNull(),
    observedAt: capturedAt("observed_at"),
    totalPoints: integer("total_points").notNull(),
    components: jsonb("components").$type<ForecastComponents>().notNull(),
  },
  (table) => [index("mi_player_fixture_results_fixture_idx").on(table.fixtureKey)],
);

export const evaluationRuns = pgTable(
  "mi_evaluation_runs",
  {
    evaluationKey: text("evaluation_key").primaryKey(),
    seasonKey: text("season_key")
      .notNull()
      .references(() => seasons.seasonKey),
    gameweek: integer("gameweek").notNull(),
    cutoffPolicy: text("cutoff_policy").notNull(),
    metrics: jsonb("metrics").$type<Record<string, JsonValue>>().notNull(),
    rowCount: integer("row_count").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("mi_evaluation_runs_season_gameweek_idx").on(table.seasonKey, table.gameweek),
  ],
);

export const opportunitySnapshots = pgTable(
  "mi_opportunity_snapshots",
  {
    snapshotKey: text("snapshot_key").primaryKey(),
    datasetKey: text("dataset_key").notNull(),
    seasonKey: text("season_key").notNull(),
    fromGameweek: integer("from_gameweek").notNull(),
    horizon: integer("horizon").notNull(),
    observedAt: capturedAt("observed_at"),
    payload: jsonb("payload").$type<OpportunitySnapshot>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("mi_opportunity_snapshots_scope_idx").on(
      table.datasetKey,
      table.seasonKey,
      table.fromGameweek,
      table.horizon,
      table.observedAt,
    ),
  ],
);

export const schemaMetadata = pgTable("mi_schema_metadata", {
  schemaKey: text("schema_key").primaryKey(),
  version: text("version").notNull(),
  appliedAt: timestamp("applied_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const sourceHeads = pgTable(
  "mi_source_heads",
  {
    sourceKey: text("source_key").notNull(),
    seasonKey: text("season_key").notNull(),
    scopeKey: text("scope_key").notNull(),
    lastAttemptStatus: text("last_attempt_status").notNull(),
    lastAttemptAt: capturedAt("last_attempt_at"),
    lastAttemptError: text("last_attempt_error"),
    lastSuccessfulBatchId: text("last_successful_batch_id"),
    lastSuccessfulCapturedAt: timestamp("last_successful_captured_at", {
      withTimezone: true,
      mode: "string",
    }),
    captureHash: text("capture_hash"),
    modelInputHash: text("model_input_hash"),
    rawObjects: jsonb("raw_objects").$type<HotArtifactReference[]>().notNull().default([]),
    stateRowCount: integer("state_row_count").notNull().default(0),
    healthMetadata: jsonb("health_metadata")
      .$type<SourceHead["healthMetadata"]>()
      .notNull()
      .default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.sourceKey, table.seasonKey] }),
    index("mi_source_heads_attempt_idx").on(table.lastAttemptAt),
  ],
);

export const captureLedger = pgTable(
  "mi_capture_ledger",
  {
    attemptKey: text("attempt_key").primaryKey(),
    sourceKey: text("source_key").notNull(),
    seasonKey: text("season_key").notNull(),
    scopeKey: text("scope_key").notNull(),
    scheduledFor: capturedAt("scheduled_for"),
    status: text("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "string" }),
    finishedAt: timestamp("finished_at", { withTimezone: true, mode: "string" }),
    batchId: text("batch_id"),
    captureHash: text("capture_hash"),
    modelInputHash: text("model_input_hash"),
    rawObjects: jsonb("raw_objects").$type<HotArtifactReference[]>().notNull().default([]),
    stateRowCount: integer("state_row_count").notNull().default(0),
    error: text("error"),
    metadata: jsonb("metadata").$type<Record<string, JsonValue>>().notNull().default({}),
    expiresAt: capturedAt("expires_at"),
  },
  (table) => [
    uniqueIndex("mi_capture_ledger_slot_idx").on(
      table.sourceKey,
      table.scopeKey,
      table.scheduledFor,
    ),
    index("mi_capture_ledger_expiry_idx").on(table.expiresAt),
  ],
);

export const playerStateCurrent = pgTable(
  "mi_player_state_current",
  {
    registrationKey: text("registration_key")
      .primaryKey()
      .references(() => playerRegistrations.registrationKey, { onDelete: "cascade" }),
    seasonKey: text("season_key").notNull(),
    observedAt: capturedAt("observed_at"),
    batchId: text("batch_id").notNull(),
    rowHash: text("row_hash").notNull(),
    price: doublePrecision("price"),
    ownership: doublePrecision("ownership"),
    availabilityProbability: doublePrecision("availability_probability").notNull(),
    chanceOfPlayingThisRound: doublePrecision("chance_of_playing_this_round"),
    minutes: integer("minutes").notNull(),
    starts: integer("starts").notNull(),
    expectedGoals: doublePrecision("expected_goals"),
    expectedAssists: doublePrecision("expected_assists"),
    expectedGoalsPer90: doublePrecision("expected_goals_per_90"),
    expectedAssistsPer90: doublePrecision("expected_assists_per_90"),
    savesPer90: doublePrecision("saves_per_90"),
    defensiveContributionsPer90: doublePrecision("defensive_contributions_per_90"),
    cardsPer90: doublePrecision("cards_per_90"),
    expectedPointsNext: doublePrecision("expected_points_next"),
    news: text("news"),
    newsAddedAt: timestamp("news_added_at", { withTimezone: true, mode: "string" }),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("mi_player_state_current_season_idx").on(table.seasonKey)],
);

export const playerPriorsCurrent = pgTable(
  "mi_player_priors_current",
  {
    registrationKey: text("registration_key")
      .primaryKey()
      .references(() => playerRegistrations.registrationKey, { onDelete: "cascade" }),
    seasonKey: text("season_key").notNull(),
    observedAt: capturedAt("observed_at"),
    batchId: text("batch_id").notNull(),
    weightedMinutes: doublePrecision("weighted_minutes").notNull(),
    goalsPer90: doublePrecision("goals_per_90").notNull(),
    assistsPer90: doublePrecision("assists_per_90").notNull(),
    sourceSeasons: jsonb("source_seasons")
      .$type<Array<{ season: string; weight: number }>>()
      .notNull()
      .default([]),
    calculationVersion: text("calculation_version").notNull(),
    sourceArtifactKey: text("source_artifact_key"),
    sourceArtifactHash: text("source_artifact_hash"),
    rowHash: text("row_hash").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("mi_player_priors_current_season_idx").on(table.seasonKey)],
);

export const fixtureMarketStateCurrent = pgTable(
  "mi_fixture_market_state_current",
  {
    sourceKey: text("source_key").notNull(),
    fixtureKey: text("fixture_key")
      .primaryKey()
      .references(() => fixtures.fixtureKey, { onDelete: "cascade" }),
    seasonKey: text("season_key").notNull(),
    observedAt: capturedAt("observed_at"),
    batchId: text("batch_id").notNull(),
    homeGoalRate: doublePrecision("home_goal_rate").notNull(),
    awayGoalRate: doublePrecision("away_goal_rate").notNull(),
    marketCoverage: doublePrecision("market_coverage").notNull(),
    sourceAgreement: doublePrecision("source_agreement").notNull(),
    bookmakerCount: integer("bookmaker_count").notNull(),
    projectionVersion: text("projection_version").notNull(),
    rawObjectKey: text("raw_object_key"),
    rawObjectHash: text("raw_object_hash"),
    rowHash: text("row_hash").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("mi_fixture_market_state_current_season_idx").on(table.seasonKey)],
);

export const forecastPublications = pgTable(
  "mi_forecast_publications",
  {
    publicationId: text("publication_id").primaryKey(),
    runId: text("run_id").notNull(),
    datasetKey: text("dataset_key").notNull(),
    seasonKey: text("season_key").notNull(),
    fromGameweek: integer("from_gameweek").notNull(),
    throughGameweek: integer("through_gameweek").notNull(),
    cutoffAt: capturedAt("cutoff_at"),
    modelKey: text("model_key").notNull(),
    modelVersion: text("model_version").notNull(),
    codeVersion: text("code_version").notNull(),
    rulesetKey: text("ruleset_key").notNull(),
    modelInputHash: text("model_input_hash").notNull(),
    servingStateHash: text("serving_state_hash").notNull(),
    inputManifest: jsonb("input_manifest").$type<Record<string, JsonValue>>().notNull().default({}),
    privateArtifact: jsonb("private_artifact")
      .$type<Record<string, JsonValue>>()
      .notNull()
      .default({}),
    publicArtifact: jsonb("public_artifact")
      .$type<Record<string, JsonValue>>()
      .notNull()
      .default({}),
    replayArtifact: jsonb("replay_artifact").$type<Record<string, JsonValue>>(),
    status: text("status").notNull(),
    error: text("error"),
    expiresAt: capturedAt("expires_at"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("mi_forecast_publications_input_idx").on(
      table.seasonKey,
      table.modelInputHash,
      table.servingStateHash,
    ),
    index("mi_forecast_publications_expiry_idx").on(table.expiresAt),
  ],
);

export const servingArtifactCurrent = pgTable(
  "mi_serving_artifact_current",
  {
    datasetKey: text("dataset_key").notNull(),
    seasonKey: text("season_key").notNull(),
    publicationId: text("publication_id").notNull(),
    runId: text("run_id").notNull(),
    fromGameweek: integer("from_gameweek").notNull(),
    observedAt: capturedAt("observed_at"),
    publicObjectKey: text("public_object_key").notNull(),
    publicObjectHash: text("public_object_hash").notNull(),
    publicObjectBytes: integer("public_object_bytes").notNull(),
    replayObjectKey: text("replay_object_key"),
    replayObjectHash: text("replay_object_hash"),
    manifestEtag: text("manifest_etag").notNull(),
    schemaVersion: text("schema_version").notNull(),
    sourceHealthHash: text("source_health_hash").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.datasetKey, table.seasonKey] })],
);

export const deadlineForecastCheckpoints = pgTable(
  "mi_deadline_forecast_checkpoints",
  {
    seasonKey: text("season_key").notNull(),
    gameweek: integer("gameweek").notNull(),
    deadlineAt: capturedAt("deadline_at"),
    publicationId: text("publication_id").notNull(),
    cutoffAt: capturedAt("cutoff_at"),
    artifactKey: text("artifact_key").notNull(),
    artifactHash: text("artifact_hash").notNull(),
    rowCount: integer("row_count").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.seasonKey, table.gameweek] })],
);

export const deadlineForecastRows = pgTable(
  "mi_deadline_forecast_rows",
  {
    seasonKey: text("season_key").notNull(),
    gameweek: integer("gameweek").notNull(),
    registrationKey: text("registration_key")
      .notNull()
      .references(() => playerRegistrations.registrationKey, { onDelete: "cascade" }),
    expectedPoints: doublePrecision("expected_points").notNull(),
    p10: doublePrecision("p10").notNull(),
    p90: doublePrecision("p90").notNull(),
    haulProbability: doublePrecision("haul_probability").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.seasonKey, table.gameweek, table.registrationKey] }),
    foreignKey({
      columns: [table.seasonKey, table.gameweek],
      foreignColumns: [deadlineForecastCheckpoints.seasonKey, deadlineForecastCheckpoints.gameweek],
    }).onDelete("cascade"),
  ],
);

export const importManifests = pgTable("mi_import_manifests", {
  importKey: text("import_key").primaryKey(),
  legacyFingerprint: text("legacy_fingerprint").notNull(),
  cutoffAt: capturedAt("cutoff_at"),
  manifestObjectKey: text("manifest_object_key").notNull(),
  manifestHash: text("manifest_hash").notNull(),
  counts: jsonb("counts").$type<Record<string, number>>().notNull().default({}),
  status: text("status").notNull(),
  appliedAt: timestamp("applied_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});
