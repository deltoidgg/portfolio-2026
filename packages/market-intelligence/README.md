# Market intelligence

This package is the backend boundary for the FPL experiments. It preserves source payloads, normalises observations, stores versioned forecast distributions, and projects them into the Opportunity Map and archived Deadline Intelligence Room.

The public API deliberately stays small:

```ts
const intelligence = createMarketIntelligence({ store });
await intelligence.capture(sourceAdapter, request);
await intelligence.ingest(canonicalBatch);
const room = await intelligence.getDeadlineRoom({ competition, season, gameweek });
const map = await intelligence.getOpportunityMap({
  datasetKey,
  seasonKey,
  fromGameweek,
  horizon,
});
```

`MarketSourceAdapter` is the extension seam for APIs, page capture, scraping, file imports, and later model jobs. Every adapter emits the same `CaptureBatch`, so collection method does not leak into the serving application. A batch includes its source, capture time, immutable raw snapshots, canonical fixtures and observations, forecasts, and annotations. Batch IDs make ingestion idempotent.

Team aliases and fixture keys pass through the shared conservative EPL resolver. A fixture has a stable season/home/away identity; gameweek, deadline, and kick-off are effective-dated assignments so postponements and doubles do not create a second match. Known provider IDs are retained, exact team/kick-off matches are linked, and unknown or ambiguous events are quarantined instead of guessed.

FPL element IDs are registrations, not people. Each registration is season-scoped and links to a durable person key using Opta code first, stable FPL code second, and a clearly provisional season-local identity as the fallback. This prevents element-ID reuse between seasons from merging different players.

## Storage model

Production uses two storage tiers:

- Neon is a bounded hot-state index. It stores compact dimensions, current player/prior/fixture-consensus rows, source heads, short-lived ledgers and publication headers, active-season final results, deadline checkpoint scalars, and current artifact pointers.
- Private Cloudflare R2 stores every gzip-compressed raw response, complete forecast input/output bundle, evaluation artifact, migration export, and legacy backup indefinitely.
- Public Cloudflare R2 stores sanitized combined H1/H3/H5 bundles, lazy replay artifacts, and the short-lived `current.json` pointer consumed through the CDN.

The `compact-v1` migration creates or extends:

- datasets, season manifests, rulesets, team seasons, and player registrations;
- stable fixtures plus effective-dated gameweek/kick-off assignments and provider links;
- canonical entities and effective-dated source aliases;
- one source head and bounded idempotency ledger per source/season;
- replace-in-place current FPL state, historical priors, and one odds-consensus row per fixture;
- bounded publication headers plus a permanent serving pointer independent of their expiry;
- latest eligible pre-deadline H1 checkpoint scalars, final player/gameweek results, and compact evaluations.

The old capture/observation/model/PMF/snapshot table definitions remain only for exporter
compatibility. The fresh project refuses a compact migration if those tables contain data, the
runtime never writes to them, and guarded cleanup drops them only after the rollback window.
Provider, Neon, R2, and memory adapters sit behind `CollectionRepository`,
`ForecastInputRepository`, and `ArtifactStore`.

## Local setup

Copy the root `.env.example` to `.env.local`, replace `DATABASE_URL` with a Neon connection string, and then run:

```bash
vp run market-intelligence#db:migrate
vp run market-intelligence#db:grant-runtime
vp run market-intelligence#pipeline:tick
vp run fpl#dev
```

Use a direct owner URL only for migration/grant/cutover tasks and a pooled `fpl_collector` URL for
`pipeline:tick`. The runtime role has no DDL permission. The pipeline parses the official
20-club/380-match schedule before other sources, versions aliases and assignments only on semantic
change, and writes exact provider bodies to private R2 before mutating Neon.

Primary operational commands are:

```bash
vp run market-intelligence#pipeline:tick
vp run market-intelligence#pipeline:verify
vp run market-intelligence#db:budget
vp run market-intelligence#legacy:backup
vp run market-intelligence#legacy:export-artifacts
vp run market-intelligence#compact:backfill -- --dry-run
vp run market-intelligence#compact:backfill -- --apply
vp run market-intelligence#compact:validate
vp run market-intelligence#artifact:promote -- --promote
```

The scheduled pipeline does not collect Polymarket or unused transfer/price-pressure telemetry.
Element history is requested only for registrations missing priors. It computes fixture/player PMFs
once through GW5 and derives H1/H3/H5 from the shared masses. A material hash excludes timestamps,
R2 keys, transfer telemetry, and volatile metadata. Identical material state produces no new run or
publication; source-health-only changes update only `current.json`.

FPL live is fetched only after the London 09:00 finalisation threshold, hourly for at most 24 hours.
The raw final response goes to R2 and Neon receives only final player/gameweek rows. Evaluation reads
the latest eligible pre-deadline H1 scalar checkpoint, writes the complete evaluation to R2, and
keeps compact aggregate metrics in Neon.

Legacy task entry points remain during the rollback window but are no longer used by any schedule.
The full platform and cutover procedure is in
[`docs/fpl/neon-free-hot-cold-cutover.md`](../../docs/fpl/neon-free-hot-cold-cutover.md).

## Deployment boundaries

GitHub Actions owns all writes. The 15-minute production schedule has a sparse, dependency-free
calendar gate; no-work wakes never start the environment's secret-bearing worker or open Neon. The
fixed environments are `fpl-next`, `fpl-production`, and protected `fpl-cutover`.

Vercel reads only the public custom domain after promotion:

```text
VITE_MI_DATA_SOURCE=r2
VITE_MI_PUBLIC_ARTIFACT_BASE_URL=https://data.fpl.wasimarif.com/serving/v1/production
```

R2 credentials and provider keys never enter Vercel. The temporary `neon|r2` switch exists only for
the cutover; remove the Neon reader, switch, `DATABASE_URL`, and old demo fallback variables after
production smoke tests and the agreed rollback confidence period.

The public client validates `current.json`, the immutable bundle schema, hashes, and byte counts.
Squad Lab and Opportunity Map share one bundle cache; horizon changes are client-side and replay is
lazy. A navigation failure may retain a previously validated same-season bundle with a stale
banner. A first-load failure uses the route error boundary and never silently substitutes demo
data.

The launched 2026/27 season always resolves to
`fpl:2026-27:official-v1`; an old local `MI_RULESET_KEY` containing
`provisional` is ignored so stale setup cannot silently downgrade model
provenance.

Collector commands are Vite+ tasks rather than package scripts. Task caching is
disabled at the workspace root because these commands mutate external state,
and their runtime variables are declared under `untrackedEnv` in this package's
`vite.config.ts`. This is required because Vite+ runs configured tasks in a
clean environment and otherwise removes values such as `DATABASE_URL` before
launching Node.

Historical priors bootstrap once and then only fetch newly registered players missing a compact
prior. There is no scheduled full-player history refresh.

## Adding a source

Implement `MarketSourceAdapter<Request>` under `src/sources`, validate upstream payloads at the boundary with Zod, and map them to a `CaptureBatch`. Keep provider IDs in stable keys, preserve observed and published times separately, omit credentials from snapshots, reconcile through `FixtureReconciler`, and add a parser-fixture test. The storage and UI layers should not require a provider-specific change.

## Validation

```bash
(cd packages/market-intelligence && vp check && vp test)
(cd apps/fpl && vp check && vp test && vp build)
```
