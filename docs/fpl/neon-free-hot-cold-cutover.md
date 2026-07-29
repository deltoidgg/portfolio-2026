# FPL Neon Free hot/cold cutover runbook

- **Target production cutover:** 2026-08-14 17:30 UTC
- **First 2026/27 deadline:** 2026-08-21 17:30 UTC
- **Production season:** `epl:2026-27`
- **Production data hostname:** `data.fpl.wasimarif.com`

This runbook covers the platform work that cannot be performed from the repository, the
rehearsal, the production migration, validation, rollback, and final cleanup. The old Neon
project remains read-only throughout the rollback window. Never resume collector writes to it.

## What the repository now enforces

- `.github/workflows/fpl-collector.yml` performs a calendar gate before Vite+, package
  installation, runtime secrets, or Neon. Its secret-bearing worker starts only when work is due.
- `.github/workflows/fpl-rehearsal.yml` is manual and fixed to the `next` artifact channel.
- `.github/workflows/fpl-cutover.yml` is manual, protected, and uses enumerated operations with
  fixed next/production database targets.
- `pipeline:tick` stores raw responses in private R2 before compact Neon mutations, loads forecast
  state once, calculates shared fixture masses once, and publishes the manifest pointer last.
- The app can transition with `VITE_MI_DATA_SOURCE=neon|r2`; R2 mode has a shared validated bundle
  cache, client-side H1/H3/H5 switching, lazy replay, and a same-season stale fallback.
- `/archive/2025-26/gw34` is static and makes no Neon request.
- `db:budget` warns at 75 MiB and fails at 100 MiB. The pipeline runs retention before refusing
  storage-increasing work at the ceiling.
- Legacy exporter/importer tasks verify object hashes and byte counts. Compact backfill requires a
  fresh database with the `compact-v1` marker and refuses any database containing legacy heavy
  rows.

## 0. Values to record

Create a private operator note and record:

```text
CUTOVER_AT=2026-08-14T17:30:00.000Z
LEGACY_PROJECT=<old Neon project name>
NEW_PROJECT=portfolio-fpl-compact-prod
NEW_PRODUCTION_BRANCH=production
NEW_REHEARSAL_BRANCH=development
PRIVATE_BUCKET=fpl-market-intelligence-raw
PUBLIC_BUCKET=fpl-market-intelligence-public
PUBLIC_HOST=data.fpl.wasimarif.com
FEATURE_BRANCH=feat/fpl-neon-free-hot-cold
```

Use exactly the same `CUTOVER_AT` when exporting, dry-running, applying, and validating an export.
It determines:

```text
legacy/v1/manifests/{CUTOVER_AT}.json
legacy/v1/backfill/{CUTOVER_AT}/compact-state.json.gz
legacy/v1/backups/{CUTOVER_AT}/neondb.dump
```

The GitHub cutover workflow accepts this timestamp through its optional `at` input. It is
effectively required for every operation that consumes a specific export.

## 1. Immediate containment

1. In GitHub Actions, disable **FPL production collector**.
2. In the existing configuration, set `MI_COLLECTION_ENABLED=false`.
3. Confirm no old collector, result, forecast, or evaluation workflow is still scheduled.
4. Do not delete, truncate, vacuum, or modify the old Neon database.
5. In the old Neon console, check remaining public transfer. Allow roughly two database-sized
   reads: one approximately 514 MB custom dump plus the streamed artifact export.
6. If transfer is insufficient, wait for the monthly reset. Do not upgrade without separate
   approval.

## 2. Cloudflare R2

### Buckets and credentials

1. Keep `fpl-market-intelligence-raw` private.
2. Create a Standard bucket named `fpl-market-intelligence-public`.
3. Attach `data.fpl.wasimarif.com` as the public bucket custom domain.
4. Keep the public `r2.dev` URL disabled.
5. Create one Object Read & Write token scoped only to the private bucket.
6. Create a separate Object Read & Write token scoped only to the public bucket.
7. Do not create lifecycle rules. Raw captures, full forecasts, public bundles, evaluations,
   manifests, and backups are intentionally retained indefinitely.

### CORS

Apply this policy to the public bucket. Add the exact Vercel preview origin during rehearsal.

```json
[
  {
    "AllowedOrigins": [
      "https://fpl.wasimarif.com",
      "http://localhost:3000",
      "http://localhost:5173"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["If-None-Match"],
    "ExposeHeaders": [
      "ETag",
      "Content-Encoding",
      "Content-Length",
      "Cache-Control",
      "CF-Cache-Status"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

### Cache

1. Create a Cache Everything rule for hostname `data.fpl.wasimarif.com` where the path begins
   `/serving/` or `/control/`.
2. Respect origin cache headers.
3. Enable Smart Tiered Cache.
4. Purge the hostname cache after enabling CORS and cache rules.
5. For later promotions, purge only:

   ```text
   https://data.fpl.wasimarif.com/serving/v1/production/epl-2026-27/current.json
   ```

Immutable objects are written with a one-year immutable cache lifetime. `current.json` is written
with a 60-second cache lifetime and five-minute stale-while-revalidate window.

### Collection calendar

Upload `.github/fpl-season-calendar.json` to:

```text
control/v1/epl-2026-27/calendar.json
```

Set `Content-Type: application/json` and a short cache lifetime. The gate validates this object and
falls back to the checked-in copy. If both copies are invalid, it permits only one conservative
hourly FPL/odds run and reports an unhealthy gate.

## 3. Create the compact Neon project

1. Create a Free project named `portfolio-fpl-compact-prod`.
2. Select PostgreSQL 18, AWS Europe (London), `eu-west-2`, and database `neondb`.
3. Rename or use the root branch as `production`.
4. Create a temporary child branch named `development` with a seven-day expiry.
5. Configure 0.25–1 CU autoscaling and five-minute suspend.
6. From the Connect dialog, record direct owner URLs for both branches:

   ```text
   NEXT_DATABASE_MIGRATION_URL=<development direct owner URL>
   PRODUCTION_DATABASE_MIGRATION_URL=<production direct owner URL>
   ```

7. Generate a strong password for `fpl_collector` and record it as
   `COLLECTOR_ROLE_PASSWORD`.
8. Do not put either owner URL in Vercel or a scheduled runtime environment.

The migration is fresh-project-only. It refuses to add `compact-v1` if the legacy heavy tables
contain rows. Runtime grants cover only the compact allow-list and explicitly remove schema
creation from `fpl_collector`.

## 4. Configure GitHub environments

Create:

- `fpl-next`: manual rehearsal, allowed from `feat/fpl-neon-free-hot-cold` and `main`.
- `fpl-production`: scheduled production, restricted to `main`, no required reviewer.
- `fpl-cutover`: manual only, restricted to `main`, required reviewer, no self-approval where
  available.

For `fpl-next` and `fpl-production`, add:

```text
Secrets
DATABASE_URL=<pooled fpl_collector URL for the target branch>
THE_ODDS_API_KEY
CLOUDFLARE_ACCOUNT_ID
R2_PRIVATE_ACCESS_KEY_ID
R2_PRIVATE_SECRET_ACCESS_KEY
R2_PUBLIC_ACCESS_KEY_ID
R2_PUBLIC_SECRET_ACCESS_KEY

Variables
MI_COLLECTION_ENABLED=false
MI_ARTIFACT_CHANNEL=next|production
MI_SEASON_KEY=epl:2026-27
MI_SEASON=2026/27
MI_SEASON_STARTS_AT=2026-08-21T00:00:00.000Z
MI_SEASON_ENDS_AT=2027-05-30T23:59:59.000Z
MI_RULESET_KEY=fpl:2026-27:official-v1
MI_ODDS_MARKETS=h2h,totals
R2_PRIVATE_BUCKET=fpl-market-intelligence-raw
R2_PUBLIC_BUCKET=fpl-market-intelligence-public
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
```

For `fpl-cutover`, add:

```text
Secrets
LEGACY_DATABASE_DIRECT_URL
NEXT_DATABASE_MIGRATION_URL
PRODUCTION_DATABASE_MIGRATION_URL
COLLECTOR_ROLE_PASSWORD
CLOUDFLARE_ACCOUNT_ID
R2_PRIVATE_ACCESS_KEY_ID
R2_PRIVATE_SECRET_ACCESS_KEY
R2_PUBLIC_ACCESS_KEY_ID
R2_PUBLIC_SECRET_ACCESS_KEY

Variables
MI_SEASON_KEY=epl:2026-27
R2_PRIVATE_BUCKET=fpl-market-intelligence-raw
R2_PUBLIC_BUCKET=fpl-market-intelligence-public
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
```

Only add `MI_ROLLBACK_RECORD_KEY` to `fpl-cutover` after a promotion prints the exact record key.
Only add `MI_CONFIRM_CLEANUP_LEGACY=drop-empty-legacy-tables` after the rollback window and a
separate cleanup confirmation.

If protected environments are unavailable, keep only pooled runtime credentials at repository
scope. Run migration/export/backfill/grant/cleanup commands locally with direct URLs; never expose
owner URLs to the scheduled workflow.

## 5. Configure Vercel rehearsal

Set Preview variables:

```text
VITE_MI_DATA_SOURCE=r2
VITE_MI_PUBLIC_ARTIFACT_BASE_URL=https://data.fpl.wasimarif.com/serving/v1/next
```

Keep Production temporarily on:

```text
VITE_MI_DATA_SOURCE=neon
```

Redeploy after every variable change. Existing deployments do not receive changed Vercel
variables.

## 6. Rehearsal

Use one fixed rehearsal timestamp. In **FPL protected cutover**, dispatch:

1. `legacy-backup` with `at=CUTOVER_AT`.
2. `legacy-export` with the same `at`.
3. `next-db-migrate`.
4. `next-db-grant-runtime`.
5. `next-compact-dry-run` with the same `at`.
6. Review its dynamic counts and fingerprint.
7. `next-compact-apply` with the same `at`.
8. Repeat `next-compact-apply`; it must report `alreadyApplied=true`.
9. `next-compact-validate` with the same `at`.

Backup must report a PostgreSQL 18 custom dump, a successful `pg_restore --list`, and matching
source/restored relation counts. Export must report zero missing or corrupt objects. Validation
must report `ok=true`, no Polymarket heads, no legacy heavy rows, and at most 50 MiB immediately
after cutover.

Then:

1. Set `MI_COLLECTION_ENABLED=true` in `fpl-next`.
2. Manually run **FPL next-channel rehearsal** in `force-collect` mode.
3. Run it in `verify` mode.
4. Run one no-work `auto` gate time and confirm the worker job is skipped.
5. Compare replayed compact H1/H3/H5 values with legacy outputs. Player sets must match and scalar
   values must be exact or within 0.01.
6. Deploy a Vercel preview.
7. Test `/`, `/squad`, and `/opportunities` at H1/H3/H5.
8. Confirm horizon switching makes no additional bundle request.
9. Start replay and confirm the replay object is loaded only then.
10. Confirm source health is present.
11. Confirm stale navigation retains a validated same-season bundle and shows a stale banner.
12. Confirm a first load with no valid bundle enters the route error boundary and never shows demo
    data.
13. Confirm `/archive/2025-26/gw34` works with Neon unavailable.
14. Test phone and desktop layouts.
15. Set `MI_COLLECTION_ENABLED=false` in `fpl-next`.
16. Delete the Neon `development` branch after rehearsal evidence is saved.

## 7. Production cutover

Perform this sequence on `main` by 2026-08-14 17:30 UTC:

1. Confirm the old collector remains disabled.
2. Dispatch `production-db-migrate`.
3. Dispatch `production-db-grant-runtime`.
4. Take a final `legacy-backup` with the production `CUTOVER_AT`.
5. Run `legacy-export` with the same timestamp.
6. Run `production-compact-dry-run` with the same timestamp.
7. Run `production-compact-apply` with the same timestamp.
8. Rerun `production-compact-apply` and require `alreadyApplied=true`.
9. Run `production-compact-validate` with the same timestamp.
10. Set `MI_COLLECTION_ENABLED=true` in `fpl-production`.
11. Manually run **FPL production collector** in `force-collect` mode.
12. Run it in `verify` mode.
13. Verify the production `current.json`, bundle, and replay through both the S3 endpoint and the
    custom domain:
    - schemas validate;
    - compressed and uncompressed hashes and byte counts match;
    - gzip, CORS, ETag, and cache headers are present;
    - H1/H3/H5 contain identical registration sets;
    - official prices are present;
    - public bundle is at most 6 MiB uncompressed and 1.5 MiB gzip.

14. If production already has a direct publication, optionally promote the rehearsed pointer with
    `artifact-promote`. Record the printed rollback key and add it to the protected
    `MI_ROLLBACK_RECORD_KEY` secret.
15. Purge only production `current.json`.
16. Change Vercel Production to:

    ```text
    VITE_MI_DATA_SOURCE=r2
    VITE_MI_PUBLIC_ARTIFACT_BASE_URL=https://data.fpl.wasimarif.com/serving/v1/production
    ```

17. Redeploy production.
18. Repeat the full route, horizon, replay, stale/error, mobile, and static archive smoke suite.
19. Confirm Vercel produces zero Neon traffic.
20. Remove `DATABASE_URL`, `MARKET_INTELLIGENCE_MODE`, and
    `MARKET_INTELLIGENCE_DEMO_FALLBACK` from Vercel, then redeploy.
21. Remove the transitional Neon reader and `VITE_MI_DATA_SOURCE` switch from the application in a
    follow-up code cleanup after rollback confidence is established.
22. Delete any old repository-level `DATABASE_URL` only after the environment-scoped production
    configuration is verified.
23. Re-enable the 15-minute schedule and observe:
    - one due worker cycle;
    - one no-work gate with no worker;
    - no migration step;
    - no Polymarket call;
    - one pooled Neon connection per due worker.

## 8. Operational acceptance

Run `db:budget` after cutover and after a representative gameweek.

```bash
vp run market-intelligence#db:budget
```

Required:

```text
Immediately after cutover       <= 50 MiB
Representative gameweek        <= 100 MiB
Preferred season end           70-100 MiB
Trailing monthly compute       <= 70 CU-hours
Monthly Neon public transfer   <= 4 GB; warn at 3 GB
Current teams                  20
Season fixtures                380
Duplicate FPL element IDs      0
Current player rows            official registration count
Current prior rows             <= official registration count
Public bundle gzip             <= 1.5 MiB
Public bundle uncompressed     <= 6 MiB
```

An unchanged material capture must create no model/publication row. A health-only update may
replace `current.json` but must not create a new immutable bundle. Price/news display changes may
publish a new public bundle while reusing the complete private forecast run.

## 9. Rollback

### Bad artifact

1. Set `MI_COLLECTION_ENABLED=false`.
2. Disable the production collector schedule.
3. Put the promotion's exact rollback record key in the protected
   `MI_ROLLBACK_RECORD_KEY` secret.
4. Dispatch `artifact-rollback`.
5. Purge production `current.json`.
6. Verify all routes.

Rollback refuses to run if the production pointer moved after the recorded promotion.

### Bad app

Use Vercel instant rollback to the preceding deployment. The previous immutable production
artifact remains available.

### Damaged compact database

Keep serving the last valid immutable public artifact. Create another fresh PostgreSQL 18 Neon
project, apply the same migration, and rebuild from the verified private dump/export manifest.
Do not resume writes to the capped legacy project.

## 10. Close the rollback window

Keep the old Neon project read-only until seven days after the first gameweek is final and every
operational gate has passed.

After separate explicit confirmation:

1. Delete the old Neon project manually.
2. Remove `LEGACY_DATABASE_DIRECT_URL`.
3. Set protected `MI_CONFIRM_CLEANUP_LEGACY=drop-empty-legacy-tables`.
4. Dispatch `production-db-cleanup-legacy`.
5. Remove the confirmation secret immediately.
6. Confirm the task dropped only the guarded zero-row compatibility tables.
7. Remove the old transition task entry points and app Neon reader in a follow-up code cleanup.

The old project deletion is not recoverable from Neon. Recovery after deletion is through the
verified private PostgreSQL dump and R2 export manifest.
