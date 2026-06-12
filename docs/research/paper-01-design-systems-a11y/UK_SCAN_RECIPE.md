# UK Public-Sector Scan Recipe (binding pre-commitment)

**Status:** FROZEN upon commit. This document fixes the UK data-collection protocol for Paper #1
(H4, held-out replication) **before any UK page is scanned**, as required by
[PREREGISTRATION.md](./PREREGISTRATION.md) §6. Any later change is a deviation and must be logged
in the paper's Deviations appendix.

The recipe mirrors the GSA Site Scanning methodology wherever a direct analogue exists, so that
the frozen US specification transfers with minimal translation. Where GSA's implementation details
matter, they were read from the public source of
[GSA/site-scanning-engine](https://github.com/GSA/site-scanning-engine) (retrieved 2026-06-12):
`libs/core-scanner/src/scans/uswds.ts` (adoption scoring) and
`libs/core-scanner/src/pages/accessibility/results-aggregator.ts` (axe-core category mapping).

## 1. Population and domain sources

One row per **registered domain**; the scanned page is the domain root (homepage), mirroring
GSA's Initial URL scan. Four sources, snapshotted into `data/inputs/uk-domains/` with retrieval
dates (committed to git):

| id                    | Source                                                                                                                                                                                                                           | Retrieval  | org classification             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------ |
| `govuk-register`      | Cabinet Office "List of .gov.uk domain names" (31 March 2026 edition), via GOV.UK publishing                                                                                                                                     | 2026-06-12 | see §2                         |
| `govuk-register-2023` | Same publication, 30 March 2023 edition — the most recent edition that includes the "Registered for" organisation column (dropped from later editions); used **only** to attach registrant names to domains in the 2026 universe | 2026-06-12 | classification aid             |
| `mysociety-councils`  | mySociety `uk_local_authority_names_and_codes` (`data/uk_local_authorities.csv`), current authorities only (`current-authority = True`)                                                                                          | 2026-06-12 | classification aid for `local` |
| `nhs-trusts`          | Wikidata SPARQL: entities `instance of` NHS trust / NHS foundation trust with `official website` (P856)                                                                                                                          | 2026-06-12 | `nhs`                          |
| `devolved-curated`    | Hand-curated list (~12 entries): gov.scot, mygov.scot, gov.wales, llyw.cymru, nidirect.gov.uk, senedd.wales, parliament.scot, niassembly.gov.uk, and the principal devolved-government service portals                           | 2026-06-12 | `devolved`                     |

Scan universe = union of unique hostnames across sources. The .gov.uk register includes
email-only and redirect-only registrations; these are not filtered ex ante — scan statuses and
the dedupe rule (§6) handle them, mirroring GSA's approach of scanning the full register and
flagging non-live entries.

## 2. Organisation typology (pre-declared classification order)

`org_type` is assigned by the first matching rule. The registrant name for a .gov.uk domain is
taken from the 2023 register edition (`govuk-register-2023`); domains registered after March 2023
have no registrant name and rely on the hostname-based clauses.

1. **local** — domain's registrant (register "Registered for" field) or hostname matches a
   current principal authority in `mysociety-councils` (name match after normalisation, or the
   authority's `gov-uk-slug`).
2. **parish** — registrant name contains "parish council", "town council", "community council",
   or "parish meeting", or hostname ends in `-pc.gov.uk` / `-tc.gov.uk` or contains
   `parishcouncil` / `towncouncil` / `communitycouncil` / `parish-council` / `town-council`.
3. **nhs** — source is `nhs-trusts`, or registrant name contains "NHS".
4. **devolved** — source is `devolved-curated`, or hostname ends `.gov.scot`, `.gov.wales`,
   `.llyw.cymru`.
5. **central** — everything else (departments, ALBs, NDPBs, and other national bodies on the
   register).

H4's "organisation-type fixed effects" = these five levels. Sites whose final URL after redirects
leaves the public-sector universe entirely (§6) are excluded as non-live.

## 3. Page-load procedure

- Browser: Playwright Chromium, headless, viewport 1366×768, default Chromium user agent plus
  identifying header `X-Research-Scan: wasimarif.com research; contact wasim.arif@live.co.uk`.
- Politeness: robots.txt fetched first; if `/` is disallowed for `*`, the site is recorded as
  `blocked_robots` and not loaded. Concurrency ≤ 12 sites in parallel, at most one page load per
  host. No retries against hosts that refuse connections.
- Navigation: `https://<domain>/`, redirects followed, `load` event with 30 s timeout, then a
  fixed 3 s settle delay. One retry (with `domcontentloaded`, 15 s) for `timeout` and
  `connection_reset` only.
- No interaction with the page: no clicks, no scrolling, no cookie-banner dismissal — the page is
  scanned as landed (same as GSA).
- Scan statuses (GSA-style): `completed`, `dns_resolution_error`, `timeout`,
  `connection_refused`, `connection_reset`, `ssl_error`, `invalid_response` (final HTTP status
  not 2xx), `blocked_robots`, `blocked_waf` (200/403 challenge pages detected by title patterns:
  "Just a moment", "Attention Required", "Access denied"), `other_error`.
- Analysis sample = `completed` only (the analogue of GSA `live = true`, primary set).

## 4. Outcome: axe-core violations, GSA category mapping

- Engine: axe-core via `@axe-core/playwright`, **default ruleset** (`AxeBuilder.analyze()`), as
  GSA runs `AxePuppeteer.analyze()` with no rule restriction. The axe-core version used is
  recorded in every output row and in the artifact metadata.
- Counting: for each violation rule, the number of **violating nodes**; category count = sum of
  node counts over the rules mapped to that category — exactly GSA's `aggregateResults` logic.
- Category mapping (verbatim from GSA `results-aggregator.ts`, 15 categories):

| Category          | axe-core rule ids                                                                                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| aria              | aria-allowed-attr, aria-deprecated-role, aria-hidden-body, aria-hidden-focus, aria-prohibited-attr, aria-required-attr, aria-required-children, aria-required-parent, aria-roles, aria-tooltip-name, aria-valid-attr-value, aria-valid-attr |
| auto-updating     | meta-refresh                                                                                                                                                                                                                                |
| contrast          | color-contrast                                                                                                                                                                                                                              |
| flash             | blink, marquee                                                                                                                                                                                                                              |
| form-names        | aria-input-field-name, input-field-name, select-name                                                                                                                                                                                        |
| frames-iframes    | frame-title                                                                                                                                                                                                                                 |
| images            | area-alt, image-alt, input-image-alt, object-alt, role-img-alt, svg-img-alt                                                                                                                                                                 |
| keyboard-access   | frame-focusable-content, scrollable-region-focusable                                                                                                                                                                                        |
| language          | html-lang-valid, valid-lang, html-has-lang                                                                                                                                                                                                  |
| link-purpose      | link-name                                                                                                                                                                                                                                   |
| lists             | definition-list, dlitem, list, listitem                                                                                                                                                                                                     |
| other             | audio-caption, autocomplete-valid, avoid-inline-spacing, form-field-multiple-labels, label, label-title-only, link-in-text-block, video-caption                                                                                             |
| page-titled       | document-title                                                                                                                                                                                                                              |
| tables            | td-headers-attr, th-has-data-cells                                                                                                                                                                                                          |
| user-control-name | aria-command-name, aria-meter-name, aria-progressbar-name, aria-toggle-field-name, button-name                                                                                                                                              |

- `violations_total` = sum over the 15 categories. Rules outside the mapping are recorded in the
  raw JSONL (auditable) but excluded from totals, matching GSA.
- Outcome coding follows the US artifact: a completed scan with no mapped violations = 0.

## 5. Exposure: govuk-frontend detection score (`govuk_count`)

Identical structure to GSA's `uswds_count` (sum of eight components; same caps, same weights,
same sqrt scaling), with USWDS-specific signals translated to their govuk-frontend analogues:

| #   | Component              | GSA analogue          | Definition                                                                                             | Points   |
| --- | ---------------------- | --------------------- | ------------------------------------------------------------------------------------------------------ | -------- |
| 1   | `govuk_classes`        | `usaClasses`          | `round(sqrt(count of DOM elements with class^="govuk-"))` × 5                                          | scaled   |
| 2   | `govuk_string`         | `uswdsString`         | occurrences of `/govuk-frontend/g` in the served HTML text                                             | count    |
| 3   | `govuk_inline_css`     | `uswdsInlineCss`      | occurrences of `/\.govuk-/g` in the served HTML text                                                   | count    |
| 4   | `govuk_crown_assets`   | `uswdsUsFlag`         | any of `/govuk-crest\|govuk-icon-\|govuk-mask-icon\|govuk-apple-touch\|govuk-opengraph-image/` in HTML | 20 or 0  |
| 5   | `govuk_crown_in_css`   | `uswdsUsFlagInCss`    | same filename patterns in any fetched CSS body                                                         | 20 or 0  |
| 6   | `govuk_string_in_css`  | `uswdsStringInCss`    | `/govuk-frontend/i` in any fetched CSS body                                                            | 20 or 0  |
| 7   | `govuk_transport_font` | `uswdsPublicSansFont` | `/GDS.?Transport/i` in any fetched CSS body                                                            | 40 or 0  |
| 8   | `govuk_version_points` | `uswdsVersion`        | 100 if a semantic version is detected (§5.1)                                                           | 100 or 0 |

CSS bodies = response bodies of network requests with `text/css` content type or `.css` URL
(GSA's `getCSSRequests`), captured during the page load.

### 5.1 Version detection (first match wins, unique values collapsed as GSA does)

1. CSS custom property `--govuk-frontend-version:\s*"?([0-9][0-9.]*)"?` (emitted by
   govuk-frontend ≥ 5.0) in any CSS body.
2. Asset filename `govuk-frontend-([0-9][0-9.]*)(?:\.min)?\.(?:css|js)` in any document
   resource URL (the GOV.UK-recommended hosted filename).
3. `window.GOVUKFrontend.version` (string) evaluated in-page after load.

`govuk_version_major` = first integer component.

### 5.2 Recorded separately, NOT in the score (mirrors GSA's banner columns)

- `govuk_phase_banner` — presence of `.govuk-phase-banner`.
- `govuk_cookie_banner` — presence of `.govuk-cookie-banner`.
- `govuk_classes_unique` — sorted unique block-level `govuk-*` class names (no `__`/`--`),
  GSA's `usaClassesUsed` analogue, kept for audit.

### 5.3 Adoption bands

Because the score construction is identical to GSA's, the **same band boundaries** as
`USWDS_BANDS` apply and are pre-committed for the UK: none (0), trace (1–24), partial (25–49),
likely (50–99), definite (100+). "Strong adoption" = score ≥ 50. These mirror the frozen US
definition in `packages/datasets`.

## 6. Dedupe and liveness (pre-declared)

- A row enters the analysis sample iff status = `completed`.
- If several scanned domains resolve (after redirects) to the same final hostname, keep the row
  whose **initial domain is alphabetically first**; the rest are marked `duplicate_of` and
  excluded.
- A site whose final hostname is outside the union of: any source hostname, `*.gov.uk`,
  `*.service.gov.uk`, `*.nhs.uk`, `*.gov.scot`, `*.gov.wales`, `*.llyw.cymru`, `*.police.uk`,
  remains in the sample (org_type from its initial domain) — public bodies legitimately host on
  non-gov TLDs; the initial-domain registrant determines classification.

## 7. Covariates (H4 controls and placebos)

Captured during the same page load: final URL + redirect count; HTTP status; `https_enforced`
(http→https redirect observed when probing `http://` variant of the initial domain);
`hsts` (Strict-Transport-Security header present); `third_party_service_count` (count of distinct
registrable domains, other than the final page's, contacted during load); `viewport_meta_tag`;
`main_element_present`; `language` (html lang attribute); CMS hint (`generator` meta tag);
best-effort `largest_contentful_paint` and `cumulative_layout_shift` via PerformanceObserver
(buffered) read after the settle delay.

## 8. Calibration set (detector validation only)

Before the full scan, the detector runs against a fixed 24-site calibration list (committed at
`data/inputs/uk-domains/calibration.csv`): 12 expected govuk-frontend adopters (GOV.UK itself and
well-known `service.gov.uk` services) and 12 expected non-adopters (NHS.UK properties — which use
the separate NHS.UK frontend — devolved portals with their own design systems, and Parliament).
Pass criterion: ≥ 10/12 adopters score ≥ 50 and ≥ 10/12 non-adopters score < 50 on
`govuk_count`. Calibration sites are **excluded from the analysis sample** regardless of result.
Calibration may fix detector _bugs_; it must not move weights, thresholds, or bands — any such
change would be a logged deviation.

## 9. Outputs

- Raw: one JSONL line per scanned domain (full axe rule-level results, all detection components,
  redirect chain, headers) → `data/raw/uk-scan/scan-<date>.jsonl` (gitignored; retained locally
  and hashed in DATA_FREEZE.md).
- Processed (via `tools/etl`): `data/processed/govuk_a11y.parquet` — one row per analysis-sample
  site with the same column structure as the US artifact (`govuk_count`,
  `govuk_semantic_version`, `govuk_version_major`, `violations_total`, the 11 `viol_*` category
  columns used in the US artifact, controls) — plus `data/summaries/govuk-a11y.json`.
- `DATA_FREEZE.md` records: scan window, scanner git commit, axe-core and Playwright versions,
  raw JSONL SHA-256, artifact SHA-256, row counts by status and org_type. Tag:
  `paper-01-uk-data`.

## 10. Ethics and load

Public homepages only; one page load per site plus one robots.txt and one `http://` probe;
identifying contact header; robots.txt honoured; no authentication, no forms, no personal data
collected; raw HTML is not redistributed (only derived measures and aggregate artifacts are
published).
