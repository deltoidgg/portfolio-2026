CREATE TABLE "mi_sources" (
	"source_key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"kind" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_captured_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mi_entities" (
	"entity_key" text PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"name" text NOT NULL,
	"team_key" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mi_fixtures" (
	"fixture_key" text PRIMARY KEY NOT NULL,
	"competition" text NOT NULL,
	"season" text NOT NULL,
	"gameweek" integer NOT NULL,
	"home_team" text NOT NULL,
	"away_team" text NOT NULL,
	"kickoff_at" timestamp with time zone NOT NULL,
	"deadline_at" timestamp with time zone NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mi_capture_batches" (
	"batch_id" text PRIMARY KEY NOT NULL,
	"source_key" text NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"fixture_count" integer NOT NULL,
	"observation_count" integer NOT NULL,
	"forecast_count" integer NOT NULL,
	"annotation_count" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mi_source_entity_aliases" (
	"source_key" text NOT NULL,
	"source_entity_key" text NOT NULL,
	"entity_key" text NOT NULL,
	"match_method" text NOT NULL,
	"confidence" double precision NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "mi_source_entity_aliases_source_key_source_entity_key_effective_from_pk" PRIMARY KEY("source_key","source_entity_key","effective_from")
);
--> statement-breakpoint
CREATE TABLE "mi_capture_scopes" (
	"batch_id" text NOT NULL,
	"competition" text NOT NULL,
	"season" text NOT NULL,
	"gameweek" integer NOT NULL,
	CONSTRAINT "mi_capture_scopes_batch_id_competition_season_gameweek_pk" PRIMARY KEY("batch_id","competition","season","gameweek")
);
--> statement-breakpoint
CREATE TABLE "mi_raw_snapshots" (
	"snapshot_key" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"source_key" text NOT NULL,
	"endpoint" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"payload" jsonb NOT NULL,
	"status_code" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mi_observations" (
	"observation_key" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"source_key" text NOT NULL,
	"fixture_key" text,
	"entity_key" text NOT NULL,
	"metric" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"published_at" timestamp with time zone,
	"numeric_value" double precision,
	"string_value" text,
	"unit" text,
	"market_family" text,
	"outcome" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mi_forecasts" (
	"forecast_key" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"model_key" text NOT NULL,
	"player_key" text NOT NULL,
	"player_name" text NOT NULL,
	"team_key" text NOT NULL,
	"position" text NOT NULL,
	"competition" text NOT NULL,
	"season" text NOT NULL,
	"gameweek" integer NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"deadline_at" timestamp with time zone NOT NULL,
	"expected_points" double precision NOT NULL,
	"p10" double precision NOT NULL,
	"p50" double precision NOT NULL,
	"p90" double precision NOT NULL,
	"rank" integer NOT NULL,
	"components" jsonb NOT NULL,
	"evidence" jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mi_annotations" (
	"annotation_key" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"source_key" text NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"detail" text NOT NULL,
	"impact" double precision NOT NULL,
	"fixture_key" text,
	"player_key" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mi_capture_batches" ADD CONSTRAINT "mi_capture_batches_source_key_mi_sources_source_key_fk" FOREIGN KEY ("source_key") REFERENCES "public"."mi_sources"("source_key") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_source_entity_aliases" ADD CONSTRAINT "mi_source_entity_aliases_source_key_mi_sources_source_key_fk" FOREIGN KEY ("source_key") REFERENCES "public"."mi_sources"("source_key") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_source_entity_aliases" ADD CONSTRAINT "mi_source_entity_aliases_entity_key_mi_entities_entity_key_fk" FOREIGN KEY ("entity_key") REFERENCES "public"."mi_entities"("entity_key") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_capture_scopes" ADD CONSTRAINT "mi_capture_scopes_batch_id_mi_capture_batches_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."mi_capture_batches"("batch_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_raw_snapshots" ADD CONSTRAINT "mi_raw_snapshots_batch_id_mi_capture_batches_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."mi_capture_batches"("batch_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_raw_snapshots" ADD CONSTRAINT "mi_raw_snapshots_source_key_mi_sources_source_key_fk" FOREIGN KEY ("source_key") REFERENCES "public"."mi_sources"("source_key") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_observations" ADD CONSTRAINT "mi_observations_batch_id_mi_capture_batches_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."mi_capture_batches"("batch_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_observations" ADD CONSTRAINT "mi_observations_source_key_mi_sources_source_key_fk" FOREIGN KEY ("source_key") REFERENCES "public"."mi_sources"("source_key") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_observations" ADD CONSTRAINT "mi_observations_fixture_key_mi_fixtures_fixture_key_fk" FOREIGN KEY ("fixture_key") REFERENCES "public"."mi_fixtures"("fixture_key") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_forecasts" ADD CONSTRAINT "mi_forecasts_batch_id_mi_capture_batches_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."mi_capture_batches"("batch_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_annotations" ADD CONSTRAINT "mi_annotations_batch_id_mi_capture_batches_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."mi_capture_batches"("batch_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_annotations" ADD CONSTRAINT "mi_annotations_source_key_mi_sources_source_key_fk" FOREIGN KEY ("source_key") REFERENCES "public"."mi_sources"("source_key") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mi_annotations" ADD CONSTRAINT "mi_annotations_fixture_key_mi_fixtures_fixture_key_fk" FOREIGN KEY ("fixture_key") REFERENCES "public"."mi_fixtures"("fixture_key") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "mi_entities_type_idx" ON "mi_entities" USING btree ("entity_type");
--> statement-breakpoint
CREATE INDEX "mi_source_entity_aliases_entity_idx" ON "mi_source_entity_aliases" USING btree ("entity_key");
--> statement-breakpoint
CREATE INDEX "mi_fixtures_scope_idx" ON "mi_fixtures" USING btree ("competition","season","gameweek");
--> statement-breakpoint
CREATE INDEX "mi_fixtures_kickoff_idx" ON "mi_fixtures" USING btree ("kickoff_at");
--> statement-breakpoint
CREATE INDEX "mi_capture_batches_source_time_idx" ON "mi_capture_batches" USING btree ("source_key","captured_at");
--> statement-breakpoint
CREATE INDEX "mi_capture_scopes_room_idx" ON "mi_capture_scopes" USING btree ("competition","season","gameweek");
--> statement-breakpoint
CREATE INDEX "mi_raw_snapshots_source_time_idx" ON "mi_raw_snapshots" USING btree ("source_key","observed_at");
--> statement-breakpoint
CREATE INDEX "mi_observations_entity_metric_time_idx" ON "mi_observations" USING btree ("entity_key","metric","observed_at");
--> statement-breakpoint
CREATE INDEX "mi_observations_fixture_time_idx" ON "mi_observations" USING btree ("fixture_key","observed_at");
--> statement-breakpoint
CREATE INDEX "mi_observations_market_idx" ON "mi_observations" USING btree ("market_family","outcome");
--> statement-breakpoint
CREATE INDEX "mi_forecasts_room_time_idx" ON "mi_forecasts" USING btree ("competition","season","gameweek","observed_at");
--> statement-breakpoint
CREATE INDEX "mi_forecasts_player_time_idx" ON "mi_forecasts" USING btree ("player_key","observed_at");
--> statement-breakpoint
CREATE INDEX "mi_annotations_time_idx" ON "mi_annotations" USING btree ("observed_at");
