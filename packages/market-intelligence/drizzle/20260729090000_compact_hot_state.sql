DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "mi_capture_batches" LIMIT 1)
    OR EXISTS (SELECT 1 FROM "mi_capture_scopes" LIMIT 1)
    OR EXISTS (SELECT 1 FROM "mi_raw_snapshots" LIMIT 1)
    OR EXISTS (SELECT 1 FROM "mi_observations" LIMIT 1)
    OR EXISTS (SELECT 1 FROM "mi_annotations" LIMIT 1)
    OR EXISTS (SELECT 1 FROM "mi_forecasts" LIMIT 1)
    OR EXISTS (SELECT 1 FROM "mi_model_runs" LIMIT 1)
    OR EXISTS (SELECT 1 FROM "mi_model_run_inputs" LIMIT 1)
    OR EXISTS (SELECT 1 FROM "mi_player_fixture_forecasts" LIMIT 1)
    OR EXISTS (SELECT 1 FROM "mi_forecast_horizons" LIMIT 1)
    OR EXISTS (SELECT 1 FROM "mi_opportunity_snapshots" LIMIT 1)
    OR EXISTS (SELECT 1 FROM "mi_player_fixture_results" LIMIT 1)
  THEN
    RAISE EXCEPTION 'compact-v1 migration is fresh-project-only; export and backfill instead';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "mi_fixtures" ADD COLUMN "season_key" text;
--> statement-breakpoint
UPDATE "mi_fixtures"
SET "season_key" = "metadata"->>'seasonKey'
WHERE "season_key" IS NULL;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "mi_fixtures" WHERE "season_key" IS NULL) THEN
    RAISE EXCEPTION 'compact-v1 requires every existing fixture to have metadata.seasonKey';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "mi_fixtures" ALTER COLUMN "season_key" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "mi_fixtures"
ADD CONSTRAINT "mi_fixtures_season_key_mi_seasons_season_key_fk"
FOREIGN KEY ("season_key") REFERENCES "public"."mi_seasons"("season_key");
--> statement-breakpoint
ALTER TABLE "mi_rulesets" ADD COLUMN "ui_config" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "mi_rulesets" ADD COLUMN "observed_at" timestamp with time zone;
--> statement-breakpoint
CREATE UNIQUE INDEX "mi_source_entity_aliases_open_idx"
ON "mi_source_entity_aliases" ("source_key", "source_entity_key", coalesce("season_key", ''))
WHERE "effective_to" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "mi_fixture_gameweek_assignments_open_idx"
ON "mi_fixture_gameweek_assignments" ("fixture_key")
WHERE "effective_to" IS NULL;
--> statement-breakpoint

CREATE TABLE "mi_schema_metadata" (
  "schema_key" text PRIMARY KEY NOT NULL,
  "version" text NOT NULL,
  "applied_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "mi_schema_metadata" ("schema_key", "version")
VALUES ('storage', 'compact-v1');
--> statement-breakpoint

CREATE TABLE "mi_source_heads" (
  "source_key" text NOT NULL,
  "season_key" text NOT NULL,
  "scope_key" text NOT NULL,
  "last_attempt_status" text NOT NULL,
  "last_attempt_at" timestamp with time zone NOT NULL,
  "last_attempt_error" text,
  "last_successful_batch_id" text,
  "last_successful_captured_at" timestamp with time zone,
  "capture_hash" text,
  "model_input_hash" text,
  "raw_objects" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "state_row_count" integer DEFAULT 0 NOT NULL,
  "health_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "mi_source_heads_source_key_season_key_pk" PRIMARY KEY ("source_key", "season_key"),
  CONSTRAINT "mi_source_heads_source_key_mi_sources_source_key_fk"
    FOREIGN KEY ("source_key") REFERENCES "public"."mi_sources"("source_key"),
  CONSTRAINT "mi_source_heads_season_key_mi_seasons_season_key_fk"
    FOREIGN KEY ("season_key") REFERENCES "public"."mi_seasons"("season_key")
);
--> statement-breakpoint
CREATE INDEX "mi_source_heads_attempt_idx" ON "mi_source_heads" ("last_attempt_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "mi_player_gameweek_results_season_gameweek_registration_idx"
ON "mi_player_gameweek_results" ("season_key", "gameweek", "registration_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "mi_evaluation_runs_season_gameweek_idx"
ON "mi_evaluation_runs" ("season_key", "gameweek");
--> statement-breakpoint

CREATE TABLE "mi_capture_ledger" (
  "attempt_key" text PRIMARY KEY NOT NULL,
  "source_key" text NOT NULL,
  "season_key" text NOT NULL,
  "scope_key" text NOT NULL,
  "scheduled_for" timestamp with time zone NOT NULL,
  "status" text NOT NULL,
  "started_at" timestamp with time zone,
  "finished_at" timestamp with time zone,
  "batch_id" text,
  "capture_hash" text,
  "model_input_hash" text,
  "raw_objects" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "state_row_count" integer DEFAULT 0 NOT NULL,
  "error" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  CONSTRAINT "mi_capture_ledger_source_key_mi_sources_source_key_fk"
    FOREIGN KEY ("source_key") REFERENCES "public"."mi_sources"("source_key"),
  CONSTRAINT "mi_capture_ledger_season_key_mi_seasons_season_key_fk"
    FOREIGN KEY ("season_key") REFERENCES "public"."mi_seasons"("season_key")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "mi_capture_ledger_slot_idx"
ON "mi_capture_ledger" ("source_key", "scope_key", "scheduled_for");
--> statement-breakpoint
CREATE INDEX "mi_capture_ledger_expiry_idx" ON "mi_capture_ledger" ("expires_at");
--> statement-breakpoint

CREATE TABLE "mi_player_state_current" (
  "registration_key" text PRIMARY KEY NOT NULL,
  "season_key" text NOT NULL,
  "observed_at" timestamp with time zone NOT NULL,
  "batch_id" text NOT NULL,
  "row_hash" text NOT NULL,
  "price" double precision,
  "ownership" double precision,
  "availability_probability" double precision NOT NULL,
  "chance_of_playing_this_round" double precision,
  "minutes" integer NOT NULL,
  "starts" integer NOT NULL,
  "expected_goals" double precision,
  "expected_assists" double precision,
  "expected_goals_per_90" double precision,
  "expected_assists_per_90" double precision,
  "saves_per_90" double precision,
  "defensive_contributions_per_90" double precision,
  "cards_per_90" double precision,
  "expected_points_next" double precision,
  "news" text,
  "news_added_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "mi_player_state_current_registration_key_mi_player_registrations_registration_key_fk"
    FOREIGN KEY ("registration_key") REFERENCES "public"."mi_player_registrations"("registration_key")
    ON DELETE CASCADE,
  CONSTRAINT "mi_player_state_current_season_key_mi_seasons_season_key_fk"
    FOREIGN KEY ("season_key") REFERENCES "public"."mi_seasons"("season_key"),
  CONSTRAINT "mi_player_state_current_availability_check"
    CHECK ("availability_probability" >= 0 AND "availability_probability" <= 1)
);
--> statement-breakpoint
CREATE INDEX "mi_player_state_current_season_idx" ON "mi_player_state_current" ("season_key");
--> statement-breakpoint

CREATE TABLE "mi_player_priors_current" (
  "registration_key" text PRIMARY KEY NOT NULL,
  "season_key" text NOT NULL,
  "observed_at" timestamp with time zone NOT NULL,
  "batch_id" text NOT NULL,
  "weighted_minutes" double precision NOT NULL,
  "goals_per_90" double precision NOT NULL,
  "assists_per_90" double precision NOT NULL,
  "source_seasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "calculation_version" text NOT NULL,
  "source_artifact_key" text,
  "source_artifact_hash" text,
  "row_hash" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "mi_player_priors_current_registration_key_mi_player_registrations_registration_key_fk"
    FOREIGN KEY ("registration_key") REFERENCES "public"."mi_player_registrations"("registration_key")
    ON DELETE CASCADE,
  CONSTRAINT "mi_player_priors_current_season_key_mi_seasons_season_key_fk"
    FOREIGN KEY ("season_key") REFERENCES "public"."mi_seasons"("season_key")
);
--> statement-breakpoint
CREATE INDEX "mi_player_priors_current_season_idx" ON "mi_player_priors_current" ("season_key");
--> statement-breakpoint

CREATE TABLE "mi_fixture_market_state_current" (
  "source_key" text NOT NULL,
  "fixture_key" text PRIMARY KEY NOT NULL,
  "season_key" text NOT NULL,
  "observed_at" timestamp with time zone NOT NULL,
  "batch_id" text NOT NULL,
  "home_goal_rate" double precision NOT NULL,
  "away_goal_rate" double precision NOT NULL,
  "market_coverage" double precision NOT NULL,
  "source_agreement" double precision NOT NULL,
  "bookmaker_count" integer NOT NULL,
  "projection_version" text NOT NULL,
  "raw_object_key" text,
  "raw_object_hash" text,
  "row_hash" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "mi_fixture_market_state_current_fixture_key_mi_fixtures_fixture_key_fk"
    FOREIGN KEY ("fixture_key") REFERENCES "public"."mi_fixtures"("fixture_key") ON DELETE CASCADE,
  CONSTRAINT "mi_fixture_market_state_current_season_key_mi_seasons_season_key_fk"
    FOREIGN KEY ("season_key") REFERENCES "public"."mi_seasons"("season_key"),
  CONSTRAINT "mi_fixture_market_state_current_coverage_check"
    CHECK ("market_coverage" >= 0 AND "market_coverage" <= 1),
  CONSTRAINT "mi_fixture_market_state_current_agreement_check"
    CHECK ("source_agreement" >= 0 AND "source_agreement" <= 1)
);
--> statement-breakpoint
CREATE INDEX "mi_fixture_market_state_current_season_idx"
ON "mi_fixture_market_state_current" ("season_key");
--> statement-breakpoint

CREATE TABLE "mi_forecast_publications" (
  "publication_id" text PRIMARY KEY NOT NULL,
  "run_id" text NOT NULL,
  "dataset_key" text NOT NULL,
  "season_key" text NOT NULL,
  "from_gameweek" integer NOT NULL,
  "through_gameweek" integer NOT NULL,
  "cutoff_at" timestamp with time zone NOT NULL,
  "model_key" text NOT NULL,
  "model_version" text NOT NULL,
  "code_version" text NOT NULL,
  "ruleset_key" text NOT NULL,
  "model_input_hash" text NOT NULL,
  "serving_state_hash" text NOT NULL,
  "input_manifest" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "private_artifact" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "public_artifact" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "replay_artifact" jsonb,
  "status" text NOT NULL,
  "error" text,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "mi_forecast_publications_dataset_key_mi_datasets_dataset_key_fk"
    FOREIGN KEY ("dataset_key") REFERENCES "public"."mi_datasets"("dataset_key"),
  CONSTRAINT "mi_forecast_publications_season_key_mi_seasons_season_key_fk"
    FOREIGN KEY ("season_key") REFERENCES "public"."mi_seasons"("season_key"),
  CONSTRAINT "mi_forecast_publications_ruleset_key_mi_rulesets_ruleset_key_fk"
    FOREIGN KEY ("ruleset_key") REFERENCES "public"."mi_rulesets"("ruleset_key")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "mi_forecast_publications_input_idx"
ON "mi_forecast_publications" ("season_key", "model_input_hash", "serving_state_hash");
--> statement-breakpoint
CREATE INDEX "mi_forecast_publications_expiry_idx"
ON "mi_forecast_publications" ("expires_at");
--> statement-breakpoint

CREATE TABLE "mi_serving_artifact_current" (
  "dataset_key" text NOT NULL,
  "season_key" text NOT NULL,
  "publication_id" text NOT NULL,
  "run_id" text NOT NULL,
  "from_gameweek" integer NOT NULL,
  "observed_at" timestamp with time zone NOT NULL,
  "public_object_key" text NOT NULL,
  "public_object_hash" text NOT NULL,
  "public_object_bytes" integer NOT NULL,
  "replay_object_key" text,
  "replay_object_hash" text,
  "manifest_etag" text NOT NULL,
  "schema_version" text NOT NULL,
  "source_health_hash" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "mi_serving_artifact_current_dataset_key_season_key_pk"
    PRIMARY KEY ("dataset_key", "season_key")
);
--> statement-breakpoint

CREATE TABLE "mi_deadline_forecast_checkpoints" (
  "season_key" text NOT NULL,
  "gameweek" integer NOT NULL,
  "deadline_at" timestamp with time zone NOT NULL,
  "publication_id" text NOT NULL,
  "cutoff_at" timestamp with time zone NOT NULL,
  "artifact_key" text NOT NULL,
  "artifact_hash" text NOT NULL,
  "row_count" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "mi_deadline_forecast_checkpoints_season_key_gameweek_pk"
    PRIMARY KEY ("season_key", "gameweek"),
  CONSTRAINT "mi_deadline_forecast_checkpoints_season_key_mi_seasons_season_key_fk"
    FOREIGN KEY ("season_key") REFERENCES "public"."mi_seasons"("season_key")
);
--> statement-breakpoint

CREATE TABLE "mi_deadline_forecast_rows" (
  "season_key" text NOT NULL,
  "gameweek" integer NOT NULL,
  "registration_key" text NOT NULL,
  "expected_points" double precision NOT NULL,
  "p10" double precision NOT NULL,
  "p90" double precision NOT NULL,
  "haul_probability" double precision NOT NULL,
  CONSTRAINT "mi_deadline_forecast_rows_season_key_gameweek_registration_key_pk"
    PRIMARY KEY ("season_key", "gameweek", "registration_key"),
  CONSTRAINT "mi_deadline_forecast_rows_checkpoint_fk"
    FOREIGN KEY ("season_key", "gameweek")
    REFERENCES "public"."mi_deadline_forecast_checkpoints"("season_key", "gameweek")
    ON DELETE CASCADE,
  CONSTRAINT "mi_deadline_forecast_rows_registration_key_mi_player_registrations_registration_key_fk"
    FOREIGN KEY ("registration_key") REFERENCES "public"."mi_player_registrations"("registration_key")
    ON DELETE CASCADE
);
--> statement-breakpoint

CREATE TABLE "mi_import_manifests" (
  "import_key" text PRIMARY KEY NOT NULL,
  "legacy_fingerprint" text NOT NULL,
  "cutoff_at" timestamp with time zone NOT NULL,
  "manifest_object_key" text NOT NULL,
  "manifest_hash" text NOT NULL,
  "counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" text NOT NULL,
  "applied_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
