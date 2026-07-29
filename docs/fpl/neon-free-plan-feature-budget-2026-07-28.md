# FPL product feature budget for Neon Free

- **Checked:** 28 July 2026
- **Scope:** the FPL application, collector, forecast pipeline, and their effect on Neon Free database storage, compute, public network transfer, and branch limits
- **Evidence:** repository source, a read-only audit of the live Neon database, and first-party Neon documentation
- **Not in scope:** changing production data or code. No database writes were made during this investigation.

## Decision

The product can fit on Neon Free, but **the earlier 2–5 GB hot/cold proposal is not close enough**: it is still **4–10 times** the Free plan's 0.5 GB project cap.

Fitting safely requires a stricter boundary:

1. **Neon is a compact operational index and current-state store**, not the historical evidence archive.
2. **R2 holds every raw capture and complete forecast artifact**, including exact PMFs, full model requests, deadline artifacts, and replay history.
3. **The public app reads a CDN-cached serving artifact**, not a multi-megabyte JSON value from Neon on every page load.
4. **Neon retains current player/market state, compact priors, capture heads and hashes, final results, evaluation inputs, and a small rolling operational ledger.**
5. **The collector opens Neon only when work is due, loads compact model inputs once for all horizons, and forecasts only after a material input change.**

With those changes, all three visible surfaces—Squad Lab, Opportunity Map, and the archive—can be retained with an expected **70–100 MB season-end footprint**, or 14–20% of Free. Enforce **100 MB as the operating ceiling**. A contingency product without live snapshot replay history should land around **50–70 MB**, but the measured design does not require removing the 1/3/5-GW selector.

My recommended option is the first design, plus two no-regret feature cuts:

- remove **Polymarket collection** until it is reconciled to EPL fixtures and can affect a forecast;
- remove **provisional FPL-live observation history from Neon**, retaining final results and the raw R2 payloads.

Do not remove Squad Lab, Opportunity Map, evaluation, or bookmaker consensus to save space. They are either the product's main value or inexpensive once the storage model is corrected.

## Evidence quality and important limitations

The live database was audited before the 2026/27 season began. It contains 563 current player registrations and is useful for measuring row and artifact size, but it does not yet contain normal in-season price movement, results, doubles, or postponements. Projections therefore use explicit ranges and reserve headroom rather than pretending to be exact.

The app includes Vercel Analytics page-view instrumentation, but no engagement data was available to this investigation ([app root](../../apps/fpl/src/routes/__root.tsx#L1-L10), [analytics component](../../apps/fpl/src/routes/__root.tsx#L118-L130)). There is no repository evidence of PostHog or custom feature events. Feature-value rankings below are consequently based on product role, default navigation, code dependencies, and resource cost—not measured user engagement. Before removing a visible interaction such as the five-gameweek view, add an explicit feature event and measure it; page views alone cannot establish that interaction's value.

Database sizes below are decimal MB unless stated otherwise. Relation sizes are exact PostgreSQL `pg_total_relation_size` measurements. Per-source shares inside the shared observations table are estimates allocated in proportion to measured tuple bytes; they are labelled as estimates.

## The actual Free-plan envelope

Neon Free currently provides a continuous **0.5 GB database-storage cap per project**, **100 CU-hours/project/month**, **5 GB/month public network transfer**, and **10 branches/project**. A Free compute must suspend after five minutes of inactivity. Project storage is the sum of branch logical sizes, not 0.5 GB for every branch. Reaching the storage cap prevents storage-increasing operations, while compute and transfer allowances reset monthly. See [Neon plans](https://neon.com/docs/introduction/plans), [usage calculations](https://neon.com/docs/introduction/usage-calculations), and [network transfer](https://neon.com/docs/introduction/network-transfer). The checked plan facts are also recorded in [the repository's Neon plan note](./neon-free-launch-plan-facts-2026-07-28.md).

A design that merely projects to 490 MB is not viable. It leaves no room for index growth, PostgreSQL page allocation, migration rewrites, a failed retention job, or a traffic spike. The operational targets should be:

| Meter            |    Hard Free limit |               Recommended steady-state target | Reason                                                                                                |
| ---------------- | -----------------: | --------------------------------------------: | ----------------------------------------------------------------------------------------------------- |
| Database storage |     500 MB/project | **≤100 MB**, alert at 75 MB, reject at 100 MB | Leave enough room for a failed retention job, migration rewrite, index growth, and recovery           |
| Compute          | 100 CU-hours/month |                              **≤70 CU-hours** | Leave room for website reads, retries, autoscaling above 0.25 CU, and unusually dense fixture periods |
| Public transfer  |         5 GB/month |                      **≤4 GB**, alert at 3 GB | Leave at least 1 GB for retries and diagnostics; public payload delivery belongs on R2/CDN            |
| Branches         |         10/project |                       **1 persistent branch** | Child-branch changes count toward the same project storage cap                                        |

## Current live footprint

The database is **513,736,704 bytes (513.7 MB / 490.0 MiB)** and has already passed the nominal 500 MB Free limit ([DB audit Q1](#q1-database-and-relation-size)).

| Storage area                              | Current relation size | Share of database | What it represents                                                                          |
| ----------------------------------------- | --------------------: | ----------------: | ------------------------------------------------------------------------------------------- |
| `mi_observations`                         |          **290.9 MB** |         **56.6%** | FPL player metrics, element-summary history, odds, and Polymarket observations              |
| `mi_player_fixture_forecasts`             |          **155.8 MB** |         **30.3%** | Exact per-player, per-fixture PMFs and components                                           |
| `mi_forecast_horizons`                    |           **33.4 MB** |          **6.5%** | Per-player 1/3/5-GW aggregate distributions                                                 |
| `mi_opportunity_snapshots`                |           **13.0 MB** |          **2.5%** | Full UI payloads, including repeated player trails                                          |
| `mi_model_runs`                           |            **5.9 MB** |          **1.1%** | Full forecast requests inside JSON config                                                   |
| Every other application and system object |           **14.7 MB** |          **2.9%** | Dimensions, aliases, fixtures, ledgers, raw references, demo archive, and database overhead |

Observations and forecast artifacts account for **97.1%** of the database. Removing a small UI route or one dimension table cannot solve this.

### Source contribution inside observations

The observations table has three secondary indexes in addition to its primary key ([schema](../../packages/market-intelligence/src/neon/schema.ts#L146-L176)). That is why 180.7 MB of measured tuple content occupies 290.9 MB as a relation.

| Source capability           | Rows now | Measured tuple content | Approx. fully-loaded relation share | Exact repeated states | Interpretation                                                              |
| --------------------------- | -------: | ---------------------: | ----------------------------------: | --------------------: | --------------------------------------------------------------------------- |
| Current FPL player state    |  209,378 |                77.7 MB |                       **~125.1 MB** |             **93.2%** | Whole player metric sets are appended even when values do not change        |
| FPL element-summary/history |  244,792 |                73.7 MB |                       **~118.6 MB** |             **66.6%** | Three daily captures repeat historical seasons and all 38 upcoming fixtures |
| Polymarket                  |   37,036 |                18.9 MB |                        **~30.5 MB** |             **46.4%** | Global soccer markets are stored without EPL reconciliation                 |
| The Odds API                |   23,825 |                10.3 MB |                        **~16.6 MB** |             **89.4%** | Unchanged bookmaker quotes are repeatedly appended                          |
| Old Smarkets demo rows      |        8 |             negligible |                          negligible |                    0% | Not material                                                                |

Source counts and distinct-state calculations are from [DB audit Q2](#q2-observation-source-cost-and-repetition).

The current FPL adapter emits roughly 25 numeric metrics per player, repeating player name, team, position, registration key, and element ID in every narrow metric row ([FPL observation construction](../../packages/market-intelligence/src/sources/fpl.ts#L240-L342)). Several persisted metrics are not consumed by either the model or UI, including `form`, `price_change_event_fall`, and `price_change_start_fall`. Other values such as `net_transfers_event` and `start_price` can be derived from fields already present.

Across the live table, unused form/price-pressure/transfer rows account for **100,988 FPL observations (48.2% of FPL rows)** and approximately **57.5 MiB of fully-loaded relation pressure**. Those fields remain recoverable from the R2 raw capture; keeping them as a Neon time series buys no implemented product behavior.

The element-summary adapter stores:

- every completed-fixture field;
- all 38 upcoming fixtures for every player;
- every field from up to several historical seasons;
- the same semantic rows again on every daily capture.

See [element-summary expansion](../../packages/market-intelligence/src/sources/fpl-element-summary.ts#L71-L159). In the live database, `upcoming_fixture` alone contributes **63,802 rows and 21.5 MB of tuple content**. The automated model ignores those rows. For historical priors it reads only the last three seasons and uses `minutes`, expected or actual goals, and expected or actual assists ([historical prior reducer](../../packages/market-intelligence/src/auto-forecast.ts#L342-L402)).

Only about **10,055 semantic rows** from the five consumed historical metrics are useful to the current model, approximately **4.6 MiB including relational overhead**. Removing unused current/upcoming rows and deduplicating those priors saves more than **108 MiB** while retaining the model's implemented historical signal.

There is also a hidden capture-ledger multiplier. Every FPL batch carries the whole season fixture list, and `scopedCaptures` writes one scope row for every distinct gameweek in the batch ([scope expansion](../../packages/market-intelligence/src/neon/store.ts#L36-L49), [scope insert](../../packages/market-intelligence/src/neon/store.ts#L198-L201)). That is typically **36–38 scope rows per FPL capture**. At the current post-GW1 policy's roughly 101 daily capture slots, the present row footprint projects to about **1.28 MB/day or ~360 MB over the season** for `mi_capture_scopes` alone. A capture should have one season/current-GW operational scope; the 380 canonical fixtures must not fan out the ledger on every refresh.

### Forecast multiplication

Each automated forecast wake runs separate 1-, 3-, and 5-week model jobs ([forecast loop](../../packages/market-intelligence/src/neon/forecast-auto.ts#L10-L47)). Each job persists:

- the full request in `mi_model_runs.config`;
- exact fixture PMFs and components;
- a player horizon row;
- a complete UI snapshot.

See [forecast persistence](../../packages/market-intelligence/src/neon/persistence.ts#L42-L127).

The database currently contains **54 model runs: 18 refresh-equivalents for each of three horizons**. Together they occupy 208.1 MB, or about **11.6 MB of relation storage per three-horizon refresh**.

The five-week run is the largest optional product slice:

| Horizon | Exact fixture rows | Logical exact-forecast bytes | Share of exact-forecast content |
| ------- | -----------------: | ---------------------------: | ------------------------------: |
| 1 GW    |             10,084 |                      14.6 MB |                           11.1% |
| 3 GW    |             30,252 |                      43.7 MB |                           33.3% |
| 5 GW    |             50,420 |                      72.9 MB |                       **55.6%** |

These are measured values from [DB audit Q3](#q3-forecast-artifact-cost-by-horizon). The public app does not query `mi_player_fixture_forecasts`; it reads the snapshot JSON. Exact PMFs are valuable evidence, but they do not need to be in Neon's hot relational tier.

A **cleanup-only** implementation of the earlier suggestions would reduce today's database to roughly **180 MB**, or 36% of Free. That sounds comfortable but is not durable: a shared five-week fixture set plus relational 1/3/5 horizon products still adds about **6.8–7.5 MB per publication**. With no retention, only about **43–47 further publications** fit before 500 MB. At the observed delivery rate that is measured in days, not a season. The deciding change is therefore **bounded retention/current-state replacement**, not a one-time deduplication.

## Limits that storage optimization alone would still miss

### Compute: the five-minute workflow can exceed Free by design

The GitHub workflow wakes every five minutes and, on every wake, applies migrations, opens the collector, runs all horizons, verifies snapshots, checks results, and evaluates ([workflow](../../.github/workflows/fpl-collector.yml#L1-L9), [workflow steps](../../.github/workflows/fpl-collector.yml#L45-L73)).

At the minimum 0.25 CU size, a compute kept active continuously for a 744-hour billing month consumes:

```text
0.25 CU × 744 hours = 186 CU-hours/month
```

That is already 86% above the 100 CU-hour Free allowance before autoscaling. Five-minute wakes are at the same boundary as mandatory five-minute scale-to-zero, so relying on suspension between them is unsafe.

A gated policy can fit. A conservative 31-day model with 23 normal days at hourly wakes and eight close-to-deadline days at 15-minute wakes produces 1,320 isolated wakes. Including Neon's five-minute idle tail at 0.25 CU, estimated compute is:

```text
CU-hours = wakes × (5 minutes × 0.25 CU + query minutes × query CU) / 60
```

| Active database work per wake | Estimated monthly CU-hours |
| ----------------------------- | -------------------------: |
| 2 minutes at 0.5 CU           |                   **49.5** |
| 3 minutes at 0.5 CU           |                   **60.5** |
| 3 minutes at 1 CU             |                   **93.5** |

The workflow should therefore target no more than about **2 CU-minutes of active work per wake**, hourly collection outside close windows, and 15-minute publication inside them. Five-minute raw odds capture can remain an R2-only activity if it is valuable, but it should not force a Neon forecast and publication every five minutes.

This only works if the workflow performs a clock/schedule gate **before opening Neon** and if FPL is returned to hourly collection outside deadline windows. The current policy uses 15-minute FPL collection for the entire season after GW1, tightening to five minutes during the price-change window ([collection policy](../../packages/market-intelligence/src/collection-policy.ts#L33-L53)).

### Public transfer: the forecast job can consume 5 GB even at one wake per day

For every horizon, the repository independently reads:

- the latest full observation batch for every source;
- up to 12 complete prior UI snapshots to reconstruct trails.

See [automated forecast reads](../../packages/market-intelligence/src/neon/automated-forecast.ts#L66-L142) and [trail reconstruction](../../packages/market-intelligence/src/neon/automated-forecast.ts#L236-L270).

The latest source batches are **51.519 MB as application JSON**. Loading them once per horizon costs **154.56 MB**. The 12 prior snapshots for each horizon add **59.85 MB**, support queries add about **1.44 MB**, and the three-snapshot verification step adds **5.269 MB**. One workflow invocation therefore materialises approximately **221.12 MB of application JSON** from Neon ([DB audit Q4](#q4-current-query-payload-pressure)).

At that rate, the 5 GB Free allowance holds only about **22.6 workflow invocations**. The observed Actions delivery rate of roughly 11 invocations/day would project to about **75.4 GB over 31 days**. PostgreSQL wire billing need not match application JSON byte-for-byte, but no plausible protocol difference makes this fit.

There is a second, even larger transfer bug waiting for the first final gameweek. The evaluation query selects the entire `modelRuns` row—including its large `config` JSON—for every joined player horizon, although the mapper uses only scalar run fields ([evaluation query](../../packages/market-intelligence/src/neon/persistence.ts#L297-L341)). In the live database, 10,084 joined horizon rows repeat an average 770,765-byte config for **7,772,397,965 bytes (7.77 GB) in one evaluation call**. That single call exceeds the entire monthly Free transfer allowance. The query must:

- project only `run_id`, `season_key`, and `cutoff_at` plus the required horizon scalars;
- select the one latest run at or before the deadline in SQL;
- execute once when a new gameweek becomes final, not on every collector wake.

The public read path adds more. Current live snapshot payloads are:

| Horizon | Uncompressed JSON returned by the database | Trail points embedded |
| ------- | -----------------------------------------: | --------------------: |
| 1 GW    |                                    1.43 MB |                 6,736 |
| 3 GW    |                                    1.76 MB |                 6,736 |
| 5 GW    |                                    2.08 MB |                 6,736 |

The three latest values use only about **0.97 MB of compressed PostgreSQL storage together**, so keeping a single current copy is not a storage problem. Delivery is: ignoring all collector traffic, 5 GB corresponds to only about 3,503 H1, 2,844 H3, or 2,399 H5 cache misses—or 948 complete three-horizon cache-miss sets—in a month.

The server functions query that payload for both Squad Lab and Opportunity Map and advertise only short browser-cache windows ([server reads](../../apps/fpl/src/lib/market-intelligence.server.ts#L39-L98), [cache headers](../../apps/fpl/src/lib/market-intelligence.functions.ts#L6-L17)). Public artifacts should instead be written once to R2 or deployment storage and delivered through a CDN. Cloudflare's current Standard R2 free tier includes 10 GB-month storage, one million Class A operations, ten million Class B operations, and free Internet egress; excess Standard storage is $0.015/GB-month ([official R2 pricing](https://developers.cloudflare.com/r2/pricing/)). Illustratively, retaining 50 GB for a full month would cost about **$0.60/month for storage beyond the 10 GB free tier**, before operation rounding. This workload is much better matched to R2 than to Neon's 5 GB database-transfer allowance.

### In-season storage: FPL-live is a larger future risk than the current database

The result command captures FPL's entire `event/{gameweek}/live` response every ten minutes until finalisation ([result cadence](../../packages/market-intelligence/src/neon/results.ts#L35-L80)). The source turns every numeric stat for every player into a separate Neon observation before the same data is reduced into upserted result rows ([live source](../../packages/market-intelligence/src/sources/fpl-live.ts#L44-L99), [result extraction](../../packages/market-intelligence/src/sources/fpl-live.ts#L103-L159)).

With 563 registrations and up to 15 numeric stat fields, one capture can append **8,445 observation rows**. At the live database's current average total-relation cost of about 565 bytes per observation, that is approximately:

- **4.8 MB per ten-minute capture**;
- **1.37 GB over a 48-hour gameweek window**;
- **2.06 GB over a 72-hour gameweek window**.

A simulation against the current 2026/27 fixture assignments counts approximately **6,162 ten-minute live slots** over the season. At 8,445 rows/slot and the measured 565 bytes/row, the implemented path projects to roughly **29.4 GB** of FPL-live observation relations alone.

The current public app does not display provisional live scores. Evaluation consumes only final results ([evaluation filter](../../packages/market-intelligence/src/evaluation.ts#L83-L103)). Keeping final `mi_player_gameweek_results` while omitting the intermediate `mi_observations` rows preserves the implemented product value and removes this failure mode.

## Feature-by-feature Neon impact

### Visible product features

| Feature                                                                      | Actual data dependency                                                                                                                                                                                                                                | Storage impact                                                                                                         | Compute / transfer impact                                              | Free-plan decision                                                                                                                    |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Squad & Transfer Lab**                                                     | Loads the latest Opportunity Map; the user's squad is kept in browser `localStorage` ([Squad loader](../../apps/fpl/src/routes/squad.tsx#L21-L31), [local persistence](../../apps/fpl/src/components/squad-lab.tsx#L241-L278))                        | **No incremental Neon writes** beyond the shared serving snapshot                                                      | One 1.4–2.1 MB snapshot read per uncached load today                   | **Keep.** Publish the shared snapshot to CDN/R2. Removing this page would not save its underlying data while Opportunity Map remains. |
| **Opportunity Map: ranking, filters, comparison, value and ownership views** | Loads the same Opportunity Map snapshot as Squad Lab ([route loader](../../apps/fpl/src/routes/opportunities.tsx#L48-L58))                                                                                                                            | No incremental storage beyond the shared snapshot                                                                      | Same full-payload read                                                 | **Keep.** It is a core surface; solve delivery, not the feature.                                                                      |
| **Snapshot replay rail / player trails**                                     | Every current snapshot embeds up to 12 prior trail points per player; UI exposes play/pause replay ([trail UI](../../apps/fpl/src/components/opportunity-map.tsx#L615-L629), [playback](../../apps/fpl/src/components/opportunity-map.tsx#L718-L725)) | Part of 13.0 MB current snapshot relation; about 0.56 MB of each latest decomposed payload is trail JSON               | Forces ~59.9 MB of prior-snapshot reads per forecast action            | **Move to an on-demand R2 replay artifact.** If implementation time is constrained, this is the first visible feature to defer.       |
| **1/3/5-GW horizon selector**                                                | Three independent model runs and snapshots; 3 GW is the default route and product lens ([default route](../../apps/fpl/src/routes/index.tsx#L3-L6), [controls](../../apps/fpl/src/components/opportunity-map.tsx#L799-L808))                          | 5-GW exact rows are 55.6% of exact-forecast content; all three duplicate player and fixture context                    | Three full input loads and three outputs today                         | **Preserve 1 + 3 first.** Consolidate into one shared artifact. Five GW is the best optional cut if further margin is required.       |
| **Price and ownership radar**                                                | Uses current FPL price and ownership from the serving snapshot; does not query historical observations                                                                                                                                                | The present append-only FPL source is ~125 MB allocated, but the visible feature needs only one current row per player | Frequent FPL collection; current payload repeats extra transfer fields | **Keep the visible radar; replace history with current-state upserts.** No need to retain every transfer counter in Neon.             |
| **Player news and availability**                                             | Current news and play-probability inputs                                                                                                                                                                                                              | Small in a wide current-state table                                                                                    | FPL cadence drives freshness                                           | **Keep.** Persist only changes/current values; raw history stays in R2.                                                               |
| **Bookmaker-informed projections, coverage, and agreement**                  | The model uses reconciled `h2h` and `totals` quotes to estimate team goal rates ([fixture estimate](../../packages/market-intelligence/src/auto-forecast.ts#L250-L323))                                                                               | Odds observations are ~16.6 MB allocated after only 25 batches                                                         | Can be frequent near deadlines; current quote batch is under 1 MB JSON | **Keep.** This is the project's differentiator. Upsert current quotes and retain deadline checkpoints only.                           |
| **Archived Deadline Intelligence Room**                                      | Uses 40 seeded forecast rows plus fixtures, sources, and annotations ([archive route](../../apps/fpl/src/routes/archive.2025-26.gw34.tsx#L11-L24))                                                                                                    | `mi_forecasts` is only 0.21 MB; related seeded data remains below 1 MB                                                 | One database read per uncached archive load                            | **Keep, but serve as a bundled/static artifact.** Removing the route barely changes storage.                                          |
| **Squad persistence**                                                        | Browser `localStorage`; no user account or Neon write                                                                                                                                                                                                 | Zero                                                                                                                   | Zero Neon write load                                                   | **Keep.** It is already Free-plan friendly.                                                                                           |

### Data and research capabilities

| Capability                                                           | Current / future pressure                                                                                                                                                                                                                                                            | Product value                                                                                                                                                                                                                                                                              | Free-plan decision                                                                                                                                                                        |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Current FPL metric history**                                       | ~125 MB allocated now; would grow rapidly at 15-minute cadence                                                                                                                                                                                                                       | Model needs current values; UI needs current price, ownership, news, and availability                                                                                                                                                                                                      | **Replace with one wide current-state row per registration.** Put raw captures in R2 and retain only selected deadline/daily changes if a user-facing trend actually needs them.          |
| **Full element-summary history**                                     | ~118.6 MB allocated after three captures; daily repeat                                                                                                                                                                                                                               | Historical goal/assist priors are useful pre-season and early season                                                                                                                                                                                                                       | **Keep only a compact prior per player.** The model uses five source metrics at most; capture past-season history once or when the player pool changes, not daily.                        |
| **Upcoming fixtures from every element summary**                     | 21.5 MB tuple content now; 21,394 semantic rows repeated each day                                                                                                                                                                                                                    | No current model or UI consumer; the canonical season schedule already owns fixtures                                                                                                                                                                                                       | **Remove from Neon immediately.** Preserve raw payloads in R2.                                                                                                                            |
| **Polymarket research source and source-health badge**               | ~30.5 MB allocated now and frequent continued growth                                                                                                                                                                                                                                 | Explicitly reports zero coverage and does not influence forecasts ([source health](../../packages/market-intelligence/src/auto-forecast.ts#L423-L458)); adapter labels all captures unmatched ([adapter metadata](../../packages/market-intelligence/src/sources/polymarket.ts#L109-L145)) | **Remove collection and the health badge until EPL reconciliation exists.** This is the clearest low-value feature cut.                                                                   |
| **Exact per-fixture PMFs**                                           | 155.8 MB now                                                                                                                                                                                                                                                                         | Valuable reproducibility and future research; not queried by the public app                                                                                                                                                                                                                | **Write complete run artifact to R2; keep hash, object key, model version, cutoff, and evaluation columns in Neon.**                                                                      |
| **Full immutable model request in JSONB**                            | 5.9 MB now; repeats player, fixture, and configuration context                                                                                                                                                                                                                       | Auditability                                                                                                                                                                                                                                                                               | **Archive request beside the PMF in R2; retain hash and compact provenance in Neon.**                                                                                                     |
| **All historical horizon rows and UI snapshots**                     | 46.4 MB after 18 refresh-equivalents                                                                                                                                                                                                                                                 | Current UI needs only latest; evaluation needs latest pre-deadline horizon-one facts                                                                                                                                                                                                       | **Upsert current serving state; retain a compact 1-GW evaluation checkpoint at each deadline; archive everything else to R2.**                                                            |
| **Capture attempts, batches, scopes, and raw references**            | Small now, but one row/reference per frequent capture grows; scope fanout alone projects to ~360 MB/season                                                                                                                                                                           | Operational health and provenance                                                                                                                                                                                                                                                          | **Keep current heads, failures, and a 7–14 day rolling ledger; collapse each capture to one operational scope; write an append-only R2 manifest and keep 38 deadline checkpoint hashes.** |
| **Raw source evidence**                                              | Neon references are only 0.34 MB now; payloads are content-addressed and gzip-compressed in R2 ([R2 writer](../../packages/market-intelligence/src/neon/r2-snapshot-store.ts#L33-L78), [payload removal before Neon](../../packages/market-intelligence/src/collector.ts#L183-L203)) | Highest-fidelity replay source                                                                                                                                                                                                                                                             | **Keep.** This architecture is already correct. Remove remaining legacy inline demo payloads only if convenient.                                                                          |
| **Stable entities, registrations, fixtures, assignments, and rules** | Roughly 4–5 MB today                                                                                                                                                                                                                                                                 | Required for correctness, postponements, player identity, and evaluation                                                                                                                                                                                                                   | **Keep.** These are compact deep-domain assets.                                                                                                                                           |
| **Effective-dated aliases**                                          | 2.1 MB after a short pre-season period because the FPL adapter creates a new `effectiveFrom` on every capture ([alias generation](../../packages/market-intelligence/src/sources/fpl.ts#L432-L460))                                                                                  | Required only when a mapping changes                                                                                                                                                                                                                                                       | **Upsert stable mappings and create a new version only on change.**                                                                                                                       |
| **Provisional FPL-live observation timeline**                        | Projected 1.37–2.06 GB per 48–72 hour GW window                                                                                                                                                                                                                                      | No current public consumer; final evaluation does not require it                                                                                                                                                                                                                           | **Do not store in Neon.** If live replay is wanted later, retain raw R2 objects or a narrow current result table.                                                                         |
| **Final results and evaluation**                                     | About 21,394 player-GW result rows over 38 GWs plus 38 metric rows; low storage, but the current join would return 7.77 GB by repeating run config                                                                                                                                   | Measures whether the model works; high research value                                                                                                                                                                                                                                      | **Keep.** Project scalar fields, select one predeadline run in SQL, and trigger once when results become final.                                                                           |
| **Migrations and full snapshot verification on every wake**          | Repeated database opens and three multi-MB verification reads                                                                                                                                                                                                                        | Deployment safety, not a five-minute product feature                                                                                                                                                                                                                                       | **Run migrations at deployment. Verify the artifact produced in the same run or its compact manifest, not by downloading three snapshots again.**                                         |

### Planned experiments

The product brief also proposes Transfer Multiverse, Cross-Market Tension, Captaincy Regret, Player Role Fingerprint, Squad Correlation, and a replay-fed Match-State Lattice ([experiment backlog](./fpl-market-intelligence-app-experiments.md#L245-L250)). None is implemented in the current FPL routes, so each has **zero current Neon benefit or usage evidence**. They must not be used to justify retaining 155.8 MB of PMFs in Neon “for later.”

| Planned experiment             | Likely artifact                                      | Free-compatible implementation                                                                                                                            |
| ------------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Transfer Multiverse**        | Paired simulated squad futures and regret summaries  | Run on demand from an immutable R2 forecast artifact; cache the selected scenario result in R2. Keep only an object hash/status in Neon.                  |
| **Cross-Market Tension Graph** | Quote/residual matrix at a chosen cutoff             | Derive a compact deadline artifact from raw R2 quotes. Do not retain every market tick as Neon observations.                                              |
| **Captaincy Regret Board**     | Pairwise win/regret matrix for a small candidate set | Generate from the selected run's R2 distributions. The UI needs a compact matrix, not all player-fixture PMFs in Postgres.                                |
| **Player Role Fingerprint**    | Future event-location/action data                    | Defer until a real source exists. Store raw/event-columnar data in object storage; keep only compact current features in Neon if a live UI requires them. |
| **Squad Correlation Map**      | Per-run player correlation matrix                    | Produce one compressed artifact per material run in R2 and lazy-load it.                                                                                  |
| **Match-State Lattice**        | Dense score/time probability cube                    | Treat as a static/replay artifact in R2 and lazy-load it; never model it as narrow relational observations.                                               |

The implementation note already says the Transfer Multiverse should reuse forecast distributions and evaluation history rather than create another ingestion stack ([follow-on guidance](./fpl-opportunity-map-implementation.md#L187)). On Free, “reuse” should mean **reuse the immutable R2 artifact**, not keep every distribution hot in Neon. Defer these experiments until current surfaces have observed usage or a concrete research question; only Vercel Analytics instrumentation, not connected PostHog/product-event evidence, was available here.

## Optimisation plan, ranked

### P0 — required before the first gameweek

1. **Stop writing FPL-live observations to Neon.**
   - Derive/upsert provisional or final result rows directly.
   - If only evaluation matters, capture once after finalisation.
   - Preserve raw event payloads in R2.
   - This prevents a projected 1.37+ GB addition during a single gameweek window.

2. **Move complete forecast artifacts to R2.**
   - Store one immutable object containing request, exact fixture PMFs, all horizon summaries, and source hashes.
   - Neon keeps `run_id`, model/code/ruleset versions, cutoff, object key, hash, status, and compact 1-GW evaluation facts.
   - This removes the current 155.8 MB PMF relation and 5.9 MB full-request relation from the hot database without losing evidence.

3. **Create current-state tables instead of append-only observation rows.**
   - `player_state_current`: one row per registration with only model/UI inputs.
   - `market_quote_current`: one row per fixture/bookmaker/market/outcome.
   - `source_head`: latest batch, attempt status, hash, and object key.
   - Raw R2 objects remain the exact history.
   - If trends are required, store deliberately sampled change events, not complete narrow metric sets.

4. **Collapse capture scopes.**
   - Store one season/current-gameweek operational scope for a capture.
   - Do not create 36–38 scope rows merely because the FPL payload carries the canonical season fixture list.

5. **Replace element-summary observations with compact priors.**
   - One player prior can contain weighted minutes, goals/90, assists/90, source seasons, and source object hash.
   - Fetch historical summaries at season initialisation and when registrations change, not daily.
   - Do not store `upcoming_fixture` rows; use the canonical 380-fixture schedule.

6. **Load model input once and produce all selected horizons in one run.**
   - Do not load 51.5 MB of source-shaped observations three times.
   - Do not load 12 full prior snapshots to derive trails.
   - Compute compact trail/replay artifacts asynchronously in R2.

7. **Fix evaluation before the first final gameweek.**
   - Project scalar run fields instead of repeating the full config for every player.
   - Select one latest predeadline run in SQL.
   - Evaluate once per newly final gameweek.

8. **Publish the app's current serving artifact to R2/CDN.**
   - One five-week player artifact can carry gameweek details plus compact 1/3/5 horizon summaries.
   - Squad Lab and Opportunity Map can share it.
   - This removes ordinary visitor traffic from Neon's 5 GB allowance.

### P1 — required for sustained Free operation

9. **Gate the workflow before opening Neon.**
   - Use the checked-in season schedule/current clock to decide whether any source is due.
   - Target hourly FPL collection outside 48 hours and 15 minutes inside 48 hours; keep five-minute bookmaker capture only where it adds decision value.
   - Forecast only when a source hash used by the model changes.

10. **Make result capture and evaluation event-driven.**

- Provisional result upserts, if retained, can run after fixture windows rather than continuously.
- Evaluation runs once when a new gameweek becomes final.

11. **Use rolling retention for operational rows.**

- 7–14 days for successful attempts/batches/references.
- Longer retention only for failures, deadline checkpoints, results, and hashes.
- Archive the full ledger manifest to R2.

12. **Version aliases and assignments only when they change.**

13. **Use one production database branch.**
    - Delete unused database branches after verification; Free storage is project-wide.

### P2 — optional visible cuts if the measured budget still exceeds target

1. **Defer the snapshot replay rail.** It is the largest current read amplifier relative to visible value.
2. **Remove the 5-GW selector.** It accounts for 55.6% of exact forecast content and is less decision-proximate than the 1-GW captaincy and default 3-GW transfer lenses.
3. **Remove price-pressure copy/fields until a calibrated price-change model exists.** The current model reports pressure as locked or unavailable and the UI does not expose the transfer counters themselves.
4. **Keep the Deadline Room as a static case study.** Removing it entirely has negligible database benefit.

## Scenario budgets

### Shared assumptions

All Free-compatible scenarios assume:

- one persistent Neon branch;
- 563 registrations and 38 gameweeks;
- all raw captures and full forecast artifacts in R2;
- no exact PMFs or full replay payload history in Neon;
- a 7–14 day rolling operational ledger plus 38 deadline hashes;
- current player and quote state updated in place;
- final result rows and compact latest-predeadline 1-GW evaluation facts retained for the season;
- public serving artifacts delivered by R2/CDN;
- the forecast repository loads no more than about 2–3 MB of compact feature-vector/object input once per material refresh;
- FPL collection hourly outside final 48-hour windows and publication no more often than every 15 minutes inside them;
- no PostHog-based feature-value assumption.

The ranges include indexes and a deliberate maintenance reserve. They are design budgets to validate after one normal gameweek, not promises from an unobserved season.

| Scenario                                    | Visible product                                                                                        |                                Season-end Neon storage |                                  Free cap used |                                Monthly compute |                                                       Monthly Neon transfer | Assessment                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -----------------------------------------------------: | ---------------------------------------------: | ---------------------------------------------: | --------------------------------------------------------------------------: | ------------------------------------------------------------------ |
| **Current architecture**                    | Everything                                                                                             | Already 513.7 MB; earlier observed projection 86–93 GB |                                  Already >100% |      Up to 186+ CU-hours at continuous 0.25 CU | Current forecast read path alone can exceed 5 GB at roughly daily execution | **Cannot use Free**                                                |
| **One-time cleanup only**                   | Everything                                                                                             |      ~180 MB immediately, then +6.8–7.5 MB/publication | 36% initially; only ~43–47 publications remain |                       Still schedule-dependent |                                                    Current read bugs remain | **Looks small briefly; not season-safe**                           |
| **Earlier optimisation set**                | Everything; richer hot history                                                                         |                                             **2–5 GB** |                                 **400–1,000%** | Potentially under 100 only with cadence gating |                           Still risky unless compact inputs are loaded once | **Better paid design, not Free**                                   |
| **Feature-complete hot/cold — recommended** | Squad, Opportunity Map, **1/3/5 GW**, replay on demand from R2, static archive, odds, evaluation       |                                          **70–100 MB** |                                     **14–20%** |                     **~50–61 CU-hours target** |                                                               **~2.6–4 GB** | **Best option. No major visible cut is required.**                 |
| **Core hot/cold contingency**               | Squad, Opportunity Map, 1/3/5 current views, no replay history, static archive, odds, final evaluation |                                           **50–70 MB** |                                     **10–14%** |                            **~35–55 CU-hours** |                                                                 **<2.5 GB** | More margin if replay proves operationally costly                  |
| **FPL-only minimum**                        | Current FPL, 3-GW model, Squad/Map; no bookmaker consensus or replay                                   |                                           **25–40 MB** |                                       **5–8%** |                            **~20–40 CU-hours** |                                                                 **<0.5 GB** | Fits easily, but removes the product's market-informed distinction |

### A concrete 80 MB operating budget

This is a useful midpoint target for the feature-complete hot/cold scenario:

| Allocation                                                            |     Budget |
| --------------------------------------------------------------------- | ---------: |
| PostgreSQL/system objects, dimensions, fixtures, registrations, rules |      20 MB |
| Current player, quote, source-health, and forecast index/state        |       8 MB |
| Compact historical priors                                             |       3 MB |
| 14-day capture/attempt/reference ledger plus deadline manifests       |       8 MB |
| Final results and evaluation checkpoint facts                         |      15 MB |
| Current serving-object metadata and provenance                        |       4 MB |
| Index, bloat, and maintenance reserve                                 |      22 MB |
| **Expected midpoint**                                                 |  **80 MB** |
| **Acceptance ceiling**                                                | **100 MB** |
| **Unused Free headroom at ceiling**                                   | **400 MB** |

If the measured database is above 100 MB after a normal gameweek, do not consume the recovery reserve by relaxing the ceiling. First shorten the operational ledger, inspect scope fanout, and confirm that no PMF, full request, replay history, or FPL-live observation leaked back into Neon. Defer replay or the five-gameweek view only as an emergency fallback; the measured hot/cold model does not require those cuts.

## Which features are actually worth cutting?

### Cut now

1. **Polymarket collection.** It uses ~30.5 MB already, grows frequently, has zero model coverage, and is explicitly unmatched.
2. **Provisional FPL-live observation history in Neon.** It can add more than the entire Free cap in a few hours and has no current visible consumer.
3. **Daily full element-summary persistence.** Keep compact priors, not the unused upcoming fixtures and 30-field historical rows.
4. **Unused FPL transfer/price-change metrics in Neon.** Preserve raw data in R2; do not create a hot time series for a UI that currently shows only news and a generic pressure status.

These are mostly data features, not customer-facing surfaces. Cutting them improves the product's reliability without weakening its present experience.

### Defer only if implementation time or headroom demands it

1. **Snapshot replay rail.**
2. **Five-gameweek horizon.**
3. **Live provisional score updates.**

These are plausible low-value candidates, but the ranking is provisional because engagement data was not available.

### Do not cut for Neon reasons

1. **Squad Lab.** User state is local and it shares the same forecast artifact.
2. **Opportunity Map.** It shares the same artifact and is a core product surface.
3. **Bookmaker consensus.** Its normalized current state is small and it makes the work distinct from an ordinary FPL projection.
4. **Final results and evaluation.** They are compact and answer whether the model works.
5. **The archived Deadline Room.** Its database footprint is tiny; make it static instead.
6. **Entity resolution, season schedule, rules, and registration identity.** They prevent incorrect joins and are already compact.

## Recovery and cleanup path

The current database cannot be transformed safely in place at the cap with a large `DELETE` plus ordinary `VACUUM`. PostgreSQL deletes create dead tuples; normal `VACUUM` makes space reusable but does not shrink relation files. `VACUUM FULL` rewrites tables, locks them, and needs temporary headroom that may be unavailable at the Free cap. Neon documents this in its [storage optimisation FAQ](https://neon.com/docs/introduction/cost-optimization#storage-faqs).

The safest no-recurring-cost recovery is:

1. pause the collection workflow;
2. export the existing complete forecast requests, PMFs, and snapshots to R2—the raw source payloads are already there;
3. deploy the compact schema and write paths;
4. create a fresh Free project, migrate only dimensions, current state, final/demo results, compact evaluation checkpoints, and R2 manifests;
5. point the collector at the new project;
6. verify a full capture/forecast/result cycle and the 1/3/5 serving artifact;
7. retain the old project read-only until the exports are verified, then remove it.

A temporary Launch upgrade is the alternative if keeping the same project identity is important, but rebuilding into a fresh Free project avoids relying on a table rewrite with almost no free storage. Neon Free permits up to 100 projects according to [Neon plans](https://neon.com/docs/introduction/plans).

## Recommended decision gate

Use Neon Free if the team is willing to make the P0/P1 architecture changes before GW1. After one representative gameweek, continue on Free only if all of these are true:

- database ≤100 MB;
- projected season-end database ≤100 MB under bounded retention;
- trailing 30-day compute ≤70 CU-hours;
- trailing 30-day public transfer ≤4 GB, with an alert at 3 GB;
- no workflow wake opens Neon when no source is due;
- a 48-hour result window creates no append-only FPL-live observations.

If any of those fail after the compact design—not before it—move to Launch. Paying for the current append-only implementation would mask avoidable growth rather than buy meaningful product capability.

## Read-only database audit appendix

These queries were run against the production database on 28 July 2026. They are included so the measurements are reproducible. They perform no writes.

### Q1: database and relation size

```sql
select pg_database_size(current_database())::bigint as bytes;

select
  c.relname as table_name,
  pg_total_relation_size(c.oid)::bigint as total_bytes,
  pg_relation_size(c.oid)::bigint as heap_bytes,
  pg_indexes_size(c.oid)::bigint as index_bytes,
  s.n_live_tup::bigint as estimated_rows
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_stat_user_tables s on s.relid = c.oid
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname like 'mi_%'
order by pg_total_relation_size(c.oid) desc;
```

Key results:

- database: `513736704` bytes;
- observations: `290881536` bytes;
- player fixture forecasts: `155811840` bytes;
- forecast horizons: `33390592` bytes;
- opportunity snapshots: `13033472` bytes;
- model runs: `5898240` bytes.

### Q2: observation source cost and repetition

```sql
select
  source_key,
  count(*)::bigint as observations,
  count(distinct batch_id)::bigint as batches,
  sum(pg_column_size(o))::bigint as tuple_bytes,
  count(distinct (
    entity_key,
    metric,
    numeric_value,
    string_value,
    unit,
    market_family,
    outcome,
    metadata
  ))::bigint as distinct_value_rows
from mi_observations o
group by source_key
order by sum(pg_column_size(o)) desc;
```

Key results:

- FPL: 209,378 rows, 77,705,710 tuple bytes, 14,289 distinct value rows;
- FPL element summary: 244,792 rows, 73,688,311 tuple bytes, 81,784 distinct value rows;
- Polymarket: 37,036 rows, 18,938,290 tuple bytes, 19,836 distinct value rows;
- Odds API: 23,825 rows, 10,328,705 tuple bytes, 2,535 distinct value rows.

The approximate source relation shares in the report allocate the observations relation's heap/index overhead in proportion to these tuple bytes.

### Q3: forecast artifact cost by horizon

```sql
with fixture_rows as (
  select run_id, count(*)::bigint as rows, sum(pg_column_size(f))::bigint as bytes
  from mi_player_fixture_forecasts f
  group by run_id
),
horizon_rows as (
  select run_id, count(*)::bigint as rows, sum(pg_column_size(h))::bigint as bytes
  from mi_forecast_horizons h
  group by run_id
),
snapshot_rows as (
  select snapshot_key, sum(pg_column_size(payload))::bigint as bytes
  from mi_opportunity_snapshots
  group by snapshot_key
)
select
  (r.to_gameweek - r.from_gameweek + 1)::int as horizon,
  count(*)::bigint as runs,
  sum(fixture_rows.rows)::bigint as fixture_forecasts,
  sum(fixture_rows.bytes)::bigint as fixture_forecast_bytes,
  sum(horizon_rows.rows)::bigint as horizon_rows,
  sum(horizon_rows.bytes)::bigint as horizon_bytes,
  sum(snapshot_rows.bytes)::bigint as snapshot_bytes,
  sum(pg_column_size(r.config))::bigint as run_config_bytes
from mi_model_runs r
left join fixture_rows using (run_id)
left join horizon_rows using (run_id)
left join snapshot_rows on snapshot_rows.snapshot_key = r.run_id
group by 1
order by 1;
```

### Q4: current query-payload pressure

```sql
with latest as (
  select distinct on (source_key)
    source_key,
    batch_id,
    captured_at
  from mi_capture_batches
  where source_key in (
    'premier-league-schedule',
    'fpl',
    'fpl-element-summary',
    'odds-api',
    'polymarket'
  )
    and metadata->>'seasonKey' = 'epl:2026-27'
  order by source_key, captured_at desc
)
select
  latest.source_key,
  count(o.*)::bigint as rows,
  coalesce(sum(pg_column_size(o)), 0)::bigint as stored_row_bytes,
  coalesce(sum(octet_length(row_to_json(o)::text)), 0)::bigint as json_row_bytes
from latest
left join mi_observations o using (batch_id)
group by latest.source_key;

select
  horizon,
  count(*)::int as snapshots,
  sum(octet_length(payload::text))::bigint as json_bytes
from (
  select
    horizon,
    payload,
    row_number() over (
      partition by horizon
      order by observed_at desc, created_at desc
    ) as sequence
  from mi_opportunity_snapshots
  where dataset_key = 'live'
    and season_key = 'epl:2026-27'
) recent
where sequence <= 12
group by horizon
order by horizon;
```

The latest observation batches total 31.7 MB by `pg_column_size` and **51.519 MB** as JSON-shaped rows. The latest 12 snapshots total 16.0 MB, 20.0 MB, and 23.9 MB of JSON for the 1-, 3-, and 5-GW horizons respectively. Adding three observation loads, those prior snapshots, support reads, and verification gives the **~221.12 MB/invocation** application-level estimate used above.

### Q5: evaluation config repetition

```sql
with horizon_counts as (
  select run_id, count(*)::bigint as player_rows
  from mi_forecast_horizons
  where horizon = 1
  group by run_id
)
select
  sum(horizon_counts.player_rows)::bigint as joined_rows,
  round(
    sum(horizon_counts.player_rows * octet_length(model_runs.config::text))::numeric
      / sum(horizon_counts.player_rows)
  )::bigint as average_config_json_bytes,
  sum(
    horizon_counts.player_rows * octet_length(model_runs.config::text)
  )::bigint as repeated_config_json_bytes
from horizon_counts
join mi_model_runs model_runs using (run_id)
where model_runs.season_key = 'epl:2026-27'
  and model_runs.from_gameweek = 1;
```

Key result: 10,084 joined rows × an average 770,765-byte config = **7,772,397,965 repeated JSON bytes** before the horizon fields themselves.
