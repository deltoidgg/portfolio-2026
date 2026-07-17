ALTER TABLE "mi_source_entity_aliases" ADD COLUMN "season_key" text;
--> statement-breakpoint
ALTER TABLE "mi_capture_scopes" ADD COLUMN "dataset_key" text DEFAULT 'live' NOT NULL;
--> statement-breakpoint
ALTER TABLE "mi_raw_snapshots" ALTER COLUMN "payload" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "mi_raw_snapshots" ADD COLUMN "object_key" text;
--> statement-breakpoint
ALTER TABLE "mi_raw_snapshots" ADD COLUMN "sha256" text;
--> statement-breakpoint
ALTER TABLE "mi_raw_snapshots" ADD COLUMN "compressed_bytes" integer;
--> statement-breakpoint
ALTER TABLE "mi_raw_snapshots" ADD COLUMN "uncompressed_bytes" integer;
--> statement-breakpoint
ALTER TABLE "mi_raw_snapshots" ADD COLUMN "content_encoding" text;
--> statement-breakpoint
ALTER TABLE "mi_raw_snapshots" ADD COLUMN "content_type" text;
--> statement-breakpoint
ALTER TABLE "mi_forecasts" ADD COLUMN "dataset_key" text DEFAULT 'live' NOT NULL;
--> statement-breakpoint
ALTER TABLE "mi_forecasts" ADD COLUMN "registration_key" text;
--> statement-breakpoint
ALTER TABLE "mi_forecasts" ADD COLUMN "run_id" text;
--> statement-breakpoint
ALTER TABLE "mi_forecasts" ADD COLUMN "schema_version" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint

CREATE TABLE "mi_datasets" (
  "dataset_key" text PRIMARY KEY NOT NULL,
  "season_key" text NOT NULL,
  "kind" text NOT NULL,
  "label" text NOT NULL,
  "frozen_at" timestamp with time zone,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mi_seasons" (
  "season_key" text PRIMARY KEY NOT NULL,
  "competition" text NOT NULL,
  "label" text NOT NULL,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone NOT NULL,
  "lifecycle" text NOT NULL,
  "price_state" text DEFAULT 'unpublished' NOT NULL,
  "current_gameweek" integer,
  "ruleset_key" text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mi_rulesets" (
  "ruleset_key" text PRIMARY KEY NOT NULL,
  "season_key" text NOT NULL,
  "version" text NOT NULL,
  "status" text NOT NULL,
  "scoring" jsonb NOT NULL,
  "checksum" text NOT NULL,
  "source_url" text,
  "published_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mi_team_seasons" (
  "team_season_key" text PRIMARY KEY NOT NULL,
  "season_key" text NOT NULL,
  "club_key" text NOT NULL,
  "name" text NOT NULL,
  "short_name" text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mi_player_registrations" (
  "registration_key" text PRIMARY KEY NOT NULL,
  "season_key" text NOT NULL,
  "player_key" text NOT NULL,
  "team_season_key" text,
  "fpl_element_id" integer,
  "player_name" text NOT NULL,
  "position" text NOT NULL,
  "status" text NOT NULL,
  "confidence" double precision NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mi_fixture_gameweek_assignments" (
  "fixture_key" text NOT NULL,
  "effective_from" timestamp with time zone NOT NULL,
  "effective_to" timestamp with time zone,
  "kickoff_at" timestamp with time zone NOT NULL,
  "deadline_at" timestamp with time zone NOT NULL,
  "gameweek" integer NOT NULL,
  "status" text DEFAULT 'scheduled' NOT NULL,
  CONSTRAINT "mi_fixture_gameweek_assignments_fixture_key_effective_from_pk" PRIMARY KEY("fixture_key","effective_from")
);
--> statement-breakpoint
CREATE TABLE "mi_fixture_links" (
  "source_key" text NOT NULL,
  "season_key" text NOT NULL,
  "source_event_id" text NOT NULL,
  "fixture_key" text,
  "status" text NOT NULL,
  "match_method" text,
  "confidence" double precision NOT NULL,
  "candidate_fixture_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "observed_at" timestamp with time zone NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT "mi_fixture_links_source_key_season_key_source_event_id_pk" PRIMARY KEY("source_key","season_key","source_event_id")
);
--> statement-breakpoint
CREATE TABLE "mi_capture_attempts" (
  "attempt_key" text PRIMARY KEY NOT NULL,
  "source_key" text NOT NULL,
  "scope_key" text NOT NULL,
  "scheduled_for" timestamp with time zone NOT NULL,
  "status" text NOT NULL,
  "started_at" timestamp with time zone,
  "finished_at" timestamp with time zone,
  "batch_id" text,
  "object_key" text,
  "error" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mi_model_runs" (
  "run_id" text PRIMARY KEY NOT NULL,
  "dataset_key" text NOT NULL,
  "season_key" text NOT NULL,
  "model_key" text NOT NULL,
  "model_version" text NOT NULL,
  "ruleset_key" text NOT NULL,
  "from_gameweek" integer NOT NULL,
  "to_gameweek" integer NOT NULL,
  "cutoff_at" timestamp with time zone NOT NULL,
  "code_version" text NOT NULL,
  "config" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "config_hash" text NOT NULL,
  "status" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mi_model_run_inputs" (
  "run_id" text NOT NULL,
  "batch_id" text NOT NULL,
  "role" text NOT NULL,
  CONSTRAINT "mi_model_run_inputs_run_id_batch_id_role_pk" PRIMARY KEY("run_id","batch_id","role")
);
--> statement-breakpoint
CREATE TABLE "mi_player_fixture_forecasts" (
  "run_id" text NOT NULL,
  "fixture_key" text NOT NULL,
  "registration_key" text NOT NULL,
  "expected_points" double precision NOT NULL,
  "distribution" jsonb NOT NULL,
  "components" jsonb NOT NULL,
  "market_coverage" double precision NOT NULL,
  CONSTRAINT "mi_player_fixture_forecasts_run_id_fixture_key_registration_key_pk" PRIMARY KEY("run_id","fixture_key","registration_key")
);
--> statement-breakpoint
CREATE TABLE "mi_forecast_horizons" (
  "run_id" text NOT NULL,
  "registration_key" text NOT NULL,
  "from_gameweek" integer NOT NULL,
  "horizon" integer NOT NULL,
  "expected_points" double precision NOT NULL,
  "p10" double precision NOT NULL,
  "p50" double precision NOT NULL,
  "p90" double precision NOT NULL,
  "haul_probability" double precision NOT NULL,
  "sixty_minute_probability" double precision NOT NULL,
  "market_coverage" double precision NOT NULL,
  "source_agreement" double precision NOT NULL,
  "gameweeks" jsonb NOT NULL,
  CONSTRAINT "mi_forecast_horizons_run_id_registration_key_from_gameweek_horizon_pk" PRIMARY KEY("run_id","registration_key","from_gameweek","horizon")
);
--> statement-breakpoint
CREATE TABLE "mi_player_gameweek_results" (
  "result_key" text PRIMARY KEY NOT NULL,
  "season_key" text NOT NULL,
  "registration_key" text NOT NULL,
  "gameweek" integer NOT NULL,
  "status" text NOT NULL,
  "observed_at" timestamp with time zone NOT NULL,
  "total_points" integer NOT NULL,
  "components" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mi_player_fixture_results" (
  "result_key" text PRIMARY KEY NOT NULL,
  "season_key" text NOT NULL,
  "fixture_key" text NOT NULL,
  "registration_key" text NOT NULL,
  "status" text NOT NULL,
  "observed_at" timestamp with time zone NOT NULL,
  "total_points" integer NOT NULL,
  "components" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mi_evaluation_runs" (
  "evaluation_key" text PRIMARY KEY NOT NULL,
  "season_key" text NOT NULL,
  "gameweek" integer NOT NULL,
  "cutoff_policy" text NOT NULL,
  "metrics" jsonb NOT NULL,
  "row_count" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mi_opportunity_snapshots" (
  "snapshot_key" text PRIMARY KEY NOT NULL,
  "dataset_key" text NOT NULL,
  "season_key" text NOT NULL,
  "from_gameweek" integer NOT NULL,
  "horizon" integer NOT NULL,
  "observed_at" timestamp with time zone NOT NULL,
  "payload" jsonb NOT NULL
);
--> statement-breakpoint

ALTER TABLE "mi_team_seasons" ADD CONSTRAINT "mi_team_seasons_season_key_mi_seasons_season_key_fk" FOREIGN KEY ("season_key") REFERENCES "public"."mi_seasons"("season_key") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_player_registrations" ADD CONSTRAINT "mi_player_registrations_season_key_mi_seasons_season_key_fk" FOREIGN KEY ("season_key") REFERENCES "public"."mi_seasons"("season_key") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_player_registrations" ADD CONSTRAINT "mi_player_registrations_team_season_key_mi_team_seasons_team_season_key_fk" FOREIGN KEY ("team_season_key") REFERENCES "public"."mi_team_seasons"("team_season_key") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_fixture_gameweek_assignments" ADD CONSTRAINT "mi_fixture_gameweek_assignments_fixture_key_mi_fixtures_fixture_key_fk" FOREIGN KEY ("fixture_key") REFERENCES "public"."mi_fixtures"("fixture_key") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_fixture_links" ADD CONSTRAINT "mi_fixture_links_fixture_key_mi_fixtures_fixture_key_fk" FOREIGN KEY ("fixture_key") REFERENCES "public"."mi_fixtures"("fixture_key") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_capture_attempts" ADD CONSTRAINT "mi_capture_attempts_batch_id_mi_capture_batches_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."mi_capture_batches"("batch_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_model_runs" ADD CONSTRAINT "mi_model_runs_dataset_key_mi_datasets_dataset_key_fk" FOREIGN KEY ("dataset_key") REFERENCES "public"."mi_datasets"("dataset_key") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_model_runs" ADD CONSTRAINT "mi_model_runs_season_key_mi_seasons_season_key_fk" FOREIGN KEY ("season_key") REFERENCES "public"."mi_seasons"("season_key") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_model_runs" ADD CONSTRAINT "mi_model_runs_ruleset_key_mi_rulesets_ruleset_key_fk" FOREIGN KEY ("ruleset_key") REFERENCES "public"."mi_rulesets"("ruleset_key") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_model_run_inputs" ADD CONSTRAINT "mi_model_run_inputs_run_id_mi_model_runs_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."mi_model_runs"("run_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_model_run_inputs" ADD CONSTRAINT "mi_model_run_inputs_batch_id_mi_capture_batches_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."mi_capture_batches"("batch_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_player_fixture_forecasts" ADD CONSTRAINT "mi_player_fixture_forecasts_run_id_mi_model_runs_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."mi_model_runs"("run_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_player_fixture_forecasts" ADD CONSTRAINT "mi_player_fixture_forecasts_fixture_key_mi_fixtures_fixture_key_fk" FOREIGN KEY ("fixture_key") REFERENCES "public"."mi_fixtures"("fixture_key") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_player_fixture_forecasts" ADD CONSTRAINT "mi_player_fixture_forecasts_registration_key_mi_player_registrations_registration_key_fk" FOREIGN KEY ("registration_key") REFERENCES "public"."mi_player_registrations"("registration_key") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_forecast_horizons" ADD CONSTRAINT "mi_forecast_horizons_run_id_mi_model_runs_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."mi_model_runs"("run_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_forecast_horizons" ADD CONSTRAINT "mi_forecast_horizons_registration_key_mi_player_registrations_registration_key_fk" FOREIGN KEY ("registration_key") REFERENCES "public"."mi_player_registrations"("registration_key") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_player_gameweek_results" ADD CONSTRAINT "mi_player_gameweek_results_season_key_mi_seasons_season_key_fk" FOREIGN KEY ("season_key") REFERENCES "public"."mi_seasons"("season_key") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_player_gameweek_results" ADD CONSTRAINT "mi_player_gameweek_results_registration_key_mi_player_registrations_registration_key_fk" FOREIGN KEY ("registration_key") REFERENCES "public"."mi_player_registrations"("registration_key") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_player_fixture_results" ADD CONSTRAINT "mi_player_fixture_results_season_key_mi_seasons_season_key_fk" FOREIGN KEY ("season_key") REFERENCES "public"."mi_seasons"("season_key") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_player_fixture_results" ADD CONSTRAINT "mi_player_fixture_results_fixture_key_mi_fixtures_fixture_key_fk" FOREIGN KEY ("fixture_key") REFERENCES "public"."mi_fixtures"("fixture_key") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_player_fixture_results" ADD CONSTRAINT "mi_player_fixture_results_registration_key_mi_player_registrations_registration_key_fk" FOREIGN KEY ("registration_key") REFERENCES "public"."mi_player_registrations"("registration_key") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_evaluation_runs" ADD CONSTRAINT "mi_evaluation_runs_season_key_mi_seasons_season_key_fk" FOREIGN KEY ("season_key") REFERENCES "public"."mi_seasons"("season_key") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_forecasts" ADD CONSTRAINT "mi_forecasts_run_id_mi_model_runs_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."mi_model_runs"("run_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_forecasts" ADD CONSTRAINT "mi_forecasts_registration_key_mi_player_registrations_registration_key_fk" FOREIGN KEY ("registration_key") REFERENCES "public"."mi_player_registrations"("registration_key") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

CREATE UNIQUE INDEX "mi_team_seasons_season_club_idx" ON "mi_team_seasons" USING btree ("season_key","club_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "mi_player_registrations_season_element_idx" ON "mi_player_registrations" USING btree ("season_key","fpl_element_id");
--> statement-breakpoint
CREATE INDEX "mi_player_registrations_player_idx" ON "mi_player_registrations" USING btree ("player_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "mi_capture_attempts_slot_idx" ON "mi_capture_attempts" USING btree ("source_key","scope_key","scheduled_for");
--> statement-breakpoint
CREATE INDEX "mi_model_runs_scope_idx" ON "mi_model_runs" USING btree ("season_key","cutoff_at");
--> statement-breakpoint
CREATE INDEX "mi_player_gameweek_results_scope_idx" ON "mi_player_gameweek_results" USING btree ("season_key","gameweek");
--> statement-breakpoint
CREATE INDEX "mi_player_fixture_results_fixture_idx" ON "mi_player_fixture_results" USING btree ("fixture_key");
--> statement-breakpoint
CREATE INDEX "mi_opportunity_snapshots_scope_idx" ON "mi_opportunity_snapshots" USING btree ("dataset_key","season_key","from_gameweek","horizon","observed_at");
