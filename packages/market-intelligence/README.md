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

- Neon stores canonical rows, season/registration identities, reconciliation links, capture attempts, immutable model-run provenance, compact forecast distributions, results, evaluations, and UI read models.
- Cloudflare R2 stores gzip-compressed, SHA-256-addressed raw source responses. Neon retains the object key, hash, byte counts, media type, and capture metadata rather than duplicating large payloads.

The additive migrations create tables for:

- sources and immutable capture batches;
- datasets, season manifests, rulesets, team seasons, and player registrations;
- stable fixtures plus effective-dated gameweek/kick-off assignments and provider links;
- idempotent capture attempts, R2 snapshot references, and point-in-time observations;
- canonical entities and effective-dated source aliases;
- model runs, exact input-batch provenance, fixture PMFs, multi-gameweek horizons, and Opportunity Map snapshots;
- provisional/final results and latest-predeadline evaluation runs;
- timeline annotations for market moves, availability, and team news.

The in-memory adapter implements the same store interface for deterministic tests and the bundled demo replay. The React app chooses Neon whenever `DATABASE_URL` is present and `MARKET_INTELLIGENCE_MODE` is not `demo`.

## Local setup

Copy the root `.env.example` to `.env.local`, replace `DATABASE_URL` with a Neon connection string, and then run:

```bash
vp run market-intelligence#db:migrate
vp run market-intelligence#db:backfill
vp run market-intelligence#season:sync
vp run market-intelligence#db:seed
vp run fpl#dev
```

The backfill isolates old synthetic records under `demo-2025-26-gw34-v1`. Season sync parses all 380 fixtures from the official Premier League article, validates the 20-club/380-match invariants, and imports changed kick-off assignments without rewriting history. The seed is idempotent and writes both the archived eight-snapshot replay and the explicit 2026/27 prelaunch scenario.

Live capture commands are:

```bash
vp run market-intelligence#capture:fpl
vp run market-intelligence#capture:odds
vp run market-intelligence#capture:deadline
vp run market-intelligence#collector:tick
vp run market-intelligence#forecast:auto
vp run market-intelligence#capture:results
vp run market-intelligence#forecast:baseline
vp run market-intelligence#forecast:v2
vp run market-intelligence#evaluate
```

FPL capture uses bootstrap, fixtures, event-live, and element-summary JSON endpoints. Odds capture uses The Odds API and strips the API key from the persisted endpoint. A read-only Polymarket Gamma adapter captures football markets without pretending unmatched event titles are EPL fixtures. Every adapter validates upstream data at its boundary.

`collector:tick` is the unattended capture path used by `.github/workflows/fpl-collector.yml`. The workflow wakes every five minutes, while the application-level policy decides whether a source is actually due: odds and prediction markets tighten from 30 to 5 minutes inside 48 hours of a deadline; FPL tightens from 60 to 15 minutes; the official schedule is refreshed daily (six-hourly near a deadline). The unique source/scope/slot claim makes reruns and overlapping Actions safe. One failed source does not roll back successful captures.

`forecast:auto` selects the latest current-season batch for each source, derives de-vigged match goal rates, shrinks early player samples toward position priors, runs the 1/3/5-gameweek market-xP model, and persists an immutable `live` Opportunity Map snapshot. It is safe to call after every collector wake: the run identity is derived from exact input batches and code version. Before the guarded new-season FPL player list appears, it reports a skip and exits successfully. The app automatically prefers the newest live snapshot and otherwise serves the explicit pre-launch scenario.

`capture:deadline` is the complete production path: it captures FPL and bookmaker snapshots at one observed time, de-vigs each bookmaker's 1X2 prices, resolves unambiguous player props, builds minutes and historical-rate priors, creates explainable player distributions, then persists evidence and forecasts before projecting the Neon-backed room. If player props are unavailable, de-vigged team-win consensus still informs clean-sheet probability while goal and assist rates fall back explicitly to FPL per-90 evidence.

The lower-level baseline command remains available for the archived room. `forecast:v2` reads a caller-supplied file from `MI_MARKET_XP_INPUT` and runs the same season-aware TypeScript model directly. It scores complete fixture outcomes through a versioned FPL ruleset, retains exact discrete fixture PMFs, convolves blanks and doubles into 1/3/5-week horizons, rejects input batches captured or published after the cut-off, and persists the result as one immutable model run. Reusing a run ID with different inputs or code fails.

`capture:results` stores provisional or final gameweek scoring components from FPL live data. `evaluate` joins only final results to the latest horizon-one forecast at or before the recorded deadline and writes MAE, RMSE, interval coverage, and haul-probability Brier score.

## Deployment boundaries

Vercel is read-only: configure `DATABASE_URL` there so server functions can query compact Neon read models. Do not put R2 credentials or betting-provider keys in Vercel unless a server read path genuinely needs them.

GitHub Actions owns collection, automated forecasting, and live-result capture. Configure these repository secrets:

- `DATABASE_URL`
- `THE_ODDS_API_KEY`
- `CLOUDFLARE_ACCOUNT_ID`
- `R2_BUCKET`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

The workflow can also be run manually. A local `collector:tick` needs the same values in the root `.env.local`.

## Adding a source

Implement `MarketSourceAdapter<Request>` under `src/sources`, validate upstream payloads at the boundary with Zod, and map them to a `CaptureBatch`. Keep provider IDs in stable keys, preserve observed and published times separately, omit credentials from snapshots, reconcile through `FixtureReconciler`, and add a parser-fixture test. The storage and UI layers should not require a provider-specific change.

## Validation

```bash
(cd packages/market-intelligence && vp check && vp test)
(cd apps/fpl && vp check && vp test && vp build)
```
