# Market intelligence

This package is the backend boundary for the FPL experiments. It preserves source payloads, normalises observations, stores versioned forecast distributions, and projects them into read models such as the Deadline Intelligence Room.

The public API deliberately stays small:

```ts
const intelligence = createMarketIntelligence({ store });
await intelligence.capture(sourceAdapter, request);
await intelligence.ingest(canonicalBatch);
const room = await intelligence.getDeadlineRoom({ competition, season, gameweek });
```

`MarketSourceAdapter` is the extension seam for APIs, page capture, scraping, file imports, and later model jobs. Every adapter emits the same `CaptureBatch`, so collection method does not leak into the serving application. A batch includes its source, capture time, immutable raw snapshots, canonical fixtures and observations, forecasts, and annotations. Batch IDs make ingestion idempotent.

Team aliases and fixture keys pass through the shared conservative EPL resolver. Known provider names collapse onto the same season/gameweek/home/away identity; an unknown alias stops capture for review instead of creating a plausible but unsafe join. Adapters also emit canonical team/player entities and effective-dated aliases. Neon upserts both in the same transaction as each capture, while the live model adds deterministic bookmaker player-name matches only when exactly one FPL player resolves.

## Storage model

Production storage uses Neon serverless Postgres through Drizzle's transactional WebSocket driver; migrations use Neon's low-latency HTTP path. The migration creates tables for:

- sources and immutable capture batches;
- gameweek capture scopes and fixtures;
- raw payload snapshots and normalised point-in-time observations;
- canonical entities and effective-dated source aliases;
- model forecasts with quantiles, component recipes, and provenance;
- timeline annotations for market moves, availability, and team news.

The in-memory adapter implements the same store interface for deterministic tests and the bundled demo replay. The React app chooses Neon whenever `DATABASE_URL` is present and `MARKET_INTELLIGENCE_MODE` is not `demo`.

## Local setup

Copy the root `.env.example` to `.env.local`, replace `DATABASE_URL` with a Neon connection string, and then run:

```bash
vp run market-intelligence#db:migrate
vp run market-intelligence#db:seed
vp run research#dev
```

The seed is idempotent and writes the complete eight-snapshot replay used by the room. Remove `MARKET_INTELLIGENCE_MODE=demo` (or set it to `neon`) to read those records from Neon.

Live capture commands are:

```bash
vp run market-intelligence#capture:fpl
vp run market-intelligence#capture:odds
vp run market-intelligence#capture:deadline
vp run market-intelligence#forecast:baseline
```

FPL capture uses the observable official JSON endpoints. Odds capture uses The Odds API and strips the API key from the persisted endpoint. Both retain the raw response alongside canonical observations. The environment variables `MI_SEASON`, `MI_GAMEWEEK`, `MI_DEADLINE_AT`, `MI_ODDS_MARKETS`, and `THE_ODDS_API_KEY` configure the jobs.

`capture:deadline` is the complete production path: it captures FPL and bookmaker snapshots at one observed time, de-vigs each bookmaker's 1X2 prices, resolves unambiguous player props, builds minutes and historical-rate priors, creates explainable player distributions, then persists evidence and forecasts before projecting the Neon-backed room. If player props are unavailable, de-vigged team-win consensus still informs clean-sheet probability while goal and assist rates fall back explicitly to FPL per-90 evidence.

The lower-level baseline forecast command reads the Zod-validated JSON file at `MI_MODEL_INPUT`; a runnable example is provided under `data/inputs/market-intelligence`. It converts market probabilities plus minutes priors into FPL scoring components, computes a discrete outcome distribution, ranks the players, and ingests the result as another idempotent capture batch. Missing scorer or assist props fall back to minutes-adjusted per-90 rates and lower the recorded evidence confidence instead of stopping the pipeline. Raw quotes, adjustment method, cross-source range, latent rates, ruleset, and coverage travel with every forecast.

## Adding a source

Implement `MarketSourceAdapter<Request>` under `src/sources`, validate upstream payloads at the boundary with Zod, and map them to a `CaptureBatch`. Keep provider IDs in stable keys, preserve observed and published times separately, omit credentials from snapshots, and add a parser-fixture test. The storage and UI layers should not require a provider-specific change.

## Validation

```bash
vp check packages/market-intelligence apps/research
vp run market-intelligence#test
vp run research#test
vp run research#build
```
