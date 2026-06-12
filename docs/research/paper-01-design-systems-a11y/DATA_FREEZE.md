# UK data freeze — Paper 01 held-out replication sample

**Frozen: 2026-06-12.** This file pins the UK scan artifacts for the H4 replication. After this
freeze, the artifacts are immutable: the confirmatory analysis (`tools/analysis/uk_confirmatory.py`)
runs **once** against the Parquet hash below, and any re-generation would be a logged deviation.

## Collection

- Protocol: [UK_SCAN_RECIPE.md](./UK_SCAN_RECIPE.md), committed before any scanning
  (pre-registration §6; tag `paper-01-prereg`).
- Scanner: `tools/scanner` — Playwright ^1.58.2 (headless Chromium), @axe-core/playwright ^4.10.2,
  axe-core 4.11.4 at scan time.
- Scan window: **2026-06-12T16:07:13Z – 2026-06-12T18:35:40Z**, 12 concurrent workers, one
  homepage per site.
- Universe: 8,160 candidate sites (8,136 scanned + 24 pre-declared calibration sites, which are
  excluded from analysis by construction).
- Deviations in effect during collection: D1 (calibration-list repair, before the full scan) and
  D2 (www fallback for apex connection-level failures, adopted ~50 sites in; scan restarted from
  zero so all rows are same-rule). See [DEVIATIONS.md](./DEVIATIONS.md). D3 (contrast labelling)
  predates UK estimation and touches no data.

## Outcome of the scan

| Status               | Sites |
| -------------------- | ----- |
| completed            | 6,474 |
| dns_resolution_error | 714   |
| ssl_error            | 319   |
| timeout              | 214   |
| invalid_response     | 208   |
| blocked_waf          | 98    |
| other_error          | 42    |
| connection_reset     | 27    |
| connection_refused   | 21    |
| blocked_robots       | 19    |

Analysis sample after the recipe §6 dedupe (one row per final hostname, alphabetically-first
initial domain wins): **6,295 sites** — central & national 744, local authorities 326, parish &
town councils 5,041, NHS 183, devolved 1. The devolved stratum collapsed to a single completed
site (the others failed at connection level or deduplicated); it is reported descriptively and
its fixed-effect cell is dropped as a singleton by the estimator.

## Frozen artifact hashes (SHA-256)

| Artifact                                 | Hash                                                               |
| ---------------------------------------- | ------------------------------------------------------------------ |
| `data/raw/uk-scan/scan-2026-06-12.jsonl` | `1f3449caa048b50de51ee4f180ec6eb24009b2815f3fb6b07777cd4579cfc5c4` |
| `data/processed/govuk_a11y.parquet`      | `d121adc8f2471b817f56c1944535eade8172ad56c8fc550807cf46c122641e2f` |
| `data/summaries/govuk-a11y.json`         | `50d1a87c6802f1db1116b25525abf4e8738c8242e450cb4f1230860e7d62bf80` |

The raw JSONL (10.2 MB, gitignored like all `data/raw/`) retains the auditable per-rule axe node
counts and every raw govuk-frontend detection signal per site; its hash above makes the committed
Parquet verifiable against it. The Parquet and summary JSON are committed, and byte-identical
copies ship with the research app (`apps/research/public/data/govuk_a11y.parquet`,
`apps/research/src/generated/govuk-a11y.json`).

Git tag for this freeze: `paper-01-uk-data`.
