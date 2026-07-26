ALTER TABLE "mi_opportunity_snapshots"
ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE INDEX "mi_opportunity_snapshots_latest_idx"
ON "mi_opportunity_snapshots" USING btree (
  "dataset_key",
  "season_key",
  "horizon",
  "observed_at",
  "created_at"
);
