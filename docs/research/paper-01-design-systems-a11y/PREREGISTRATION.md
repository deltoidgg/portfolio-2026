# Pre-Registration: Do Design Systems Deliver Accessibility at Scale? Design-System Adoption and Automatically Detectable Accessibility Violations on Government Websites

**Status:** LOCKED. Confirmatory estimation may begin. Locked at the commit tagged `paper-01-prereg`, which pins this document, the frozen US artifact, the ETL transform, the UK scan recipe, and the scanner implementation together.
**Date locked:** 2026-06-12
**Author of record:** Wasim Arif (analysis executed with AI assistance; this document follows a transparent pre-registration structure informed by Mollick 2026)
**Discovery data:** GSA Site Scanning daily snapshot, frozen 2026-06-10 (downloaded 2026-06-12), processed to `data/processed/uswds_a11y.parquet` (SHA-256 `f7090ce7e272fb4935a4fabb06c848c0c1c49faf5df01cc185a1082f79c19260`), N = 12,252 live federal websites with a completed accessibility scan.
**Held-out replication data:** UK public-sector scan to be collected by `tools/scanner` (Playwright + axe-core + govuk-frontend detection) under the binding protocol in [UK_SCAN_RECIPE.md](./UK_SCAN_RECIPE.md), committed together with this lock and **before any scanning**. Domain-list snapshots are frozen under `data/inputs/uk-domains/`. **No UK analysis data has been collected at lock time.**

## Disclosure of prior data contact

Before drafting this document, the analyst examined: (a) the snapshot's column list, types, and the official data dictionary; (b) univariate distributions of `uswds_count`, `uswds_semantic_version`, violation totals, and scan-status/filter fields (used to fix sample restrictions and band boundaries); (c) **unadjusted band-level descriptives** — mean/median violations and zero-violation shares by USWDS adoption band, by major version, and by agency — which are published as "preliminary descriptives" on the paper page and in `data/summaries/uswds-a11y.json`; (d) per-category violation prevalence counts (not cross-tabulated with adoption).

**This is more prior contact than a clean pre-registration:** the unadjusted US dose–response gradient has been seen. Accordingly, the confirmatory value of this study rests on what has _not_ been examined, and we commit to that boundary explicitly. As of this lock, no one has examined: any _adjusted_ or _within-agency_ relationship between adoption and violations; any category-level outcome conditional on adoption; any version contrast conditional on controls; any placebo-outcome gradient; and **any UK analysis data** (none has been collected). The headline claim is gated on the adjusted models and the held-out UK replication, not on the already-seen unadjusted gradient.

One further disclosure: immediately before this lock, the scanner was smoke-tested end-to-end against exactly two UK pages — www.gov.uk and design-system.service.gov.uk — to verify that it runs (both scored "definite" adoption and returned zero mapped violations). Both sites are members of the pre-declared calibration set, which is excluded from the analysis sample by the recipe regardless of this test. No other UK page has been loaded by the scanner.

## 1. Research question

Design systems bundle accessibility decisions — semantics, names, focus management, contrast — into reusable components, so adopting one should mechanically remove a class of recurring accessibility defects. Government web estates are the cleanest place to test this: thousands of independently operated sites, one legal accessibility regime (Section 508 in the US; PSBAR/WCAG 2.2 in the UK), and a single sanctioned design system per estate (USWDS; GOV.UK Design System). **Is graded adoption of the sanctioned design system associated with fewer automatically detectable accessibility violations, within agency, conditional on digital-maturity controls — and does the relationship replicate in a second country's estate under a specification frozen before that data exists?**

Theory: design systems operate as _defaults infrastructure_ (Thaler & Sunstein-style choice architecture applied to engineering): they convert per-team accessibility effort into platform effort. The competing account is _selection_: digitally mature teams both adopt design systems and build accessible sites, with the design system contributing nothing causally. This study cannot deliver a causal estimate, but it can (i) quantify the adoption–accessibility association at estate scale for the first time, (ii) stress it against the selection account with within-agency contrasts, maturity controls, placebo outcomes, and category-specificity predictions, and (iii) test whether the frozen specification transfers across countries.

## 2. Variables

All variable definitions refer to columns of the frozen Parquet artifact; the transform is `tools/etl/src/gsa.ts` (committed alongside this document).

### Exposure (focal)

- `uswds_count` — GSA's additive USWDS detection score. Primary continuous form: `ln(1 + uswds_count)`.
- Adoption bands (fixed in `packages/datasets`, `USWDS_BANDS`): none (0), trace (1–24), partial (25–49), likely (50–99), definite (100+). `strong` = likely ∪ definite (uswds_count ≥ 50).
- `uswds_version_major` — "2" or "3" where a semantic version string was detected (N ≈ 921), else null.

### Outcomes

- **Primary:** `violations_total` — sum of axe-core violations across GSA's 15 tracked categories. A null payload on a completed scan is coded 0 (verified: nulls coincide exactly with zero-violation sites; no empty-object payloads occur in the snapshot).
- **Secondary:** `zero_violations` = 1{violations_total = 0}; and the 11 per-category counts retained in the artifact (`viol_contrast`, `viol_aria`, `viol_images`, `viol_link_purpose`, `viol_user_control_name`, `viol_lists`, `viol_form_names`, `viol_page_titled`, `viol_frames_iframes`, `viol_keyboard_access`, `viol_language`).

### Category mechanism classification (locked here, before any category × adoption cross-tabulation)

- **Component-mediated** (a design system's components/tokens directly determine these): `contrast`, `aria`, `form-names`, `user-control-name`, `link-purpose`, `keyboard-access`.
- **Template/content-mediated** (set at page/template or content level, weakly component-coupled): `language`, `page-titled`, `images`, `lists`, `frames-iframes`.

### Controls (all confirmatory models)

- Agency fixed effects (`agency`; 100+ levels). Branch retained only as a descriptive split (it is collinear with agency).
- Digital Analytics Program participation (`dap`, 0/1) — the maturity proxy.
- Security-hygiene index: `https_enforced` + `hsts` (0–2) — second maturity proxy.
- `viewport_meta_tag` (0/1) — mobile-era template proxy.
- `asinh(third_party_service_count)` — page complexity proxy.
- CMS: indicator for the 10 most frequent `cms` values, "other", and "none detected".

### Placebo outcomes (for the selection diagnostic, not hypotheses)

- `cumulative_layout_shift`, `largest_contentful_paint` — performance metrics scanned by the same programme on the same pages. USWDS adoption has no comparable mechanical channel to page-load performance; a generic "good teams" confound predicts gradients here too.

### Sample restrictions (already applied in the frozen artifact)

Live websites; primary set only (`filter = false`); `accessibility_scan_status = 'completed'`; non-missing agency. Version-contrast models (H2) additionally restrict to non-null `uswds_version_major`. No further row deletions are permitted; missing control values enter as explicit "missing" indicator categories.

## 3. Confirmatory hypotheses and exact tests

Count outcomes use Poisson quasi-maximum-likelihood (PPML) with agency fixed effects; binary outcomes use linear probability models with agency fixed effects. All standard errors clustered by `agency`. Coefficients on exposures are reported as incidence-rate ratios (IRR = exp(β)) for count models.

- **H1 (dose–response, primary):** In `violations_total ~ ln(1 + uswds_count) + controls + agency FE`, β < 0; one-sided p < .05. Equivalent banded form (bands replacing the continuous term): IRR(strong vs none) < 1, and band IRRs weakly monotone non-increasing from none → likely (definite may plateau; monotonicity is evaluated none → likely).
- **H2 (version effect):** Among version-detected sites, `violations_total ~ 1{major = 3} + ln(1 + uswds_count) + controls + agency FE`: β(v3) < 0, one-sided p < .05. Low power is anticipated (N ≈ 921, ~460/major); we pre-commit to interpreting the IRR and CI, not only the p-value.
- **H3 (category specificity):** Estimate the H1 model separately for each of the 11 category counts. Prediction: the mean standardized adoption coefficient is more negative for component-mediated than template/content-mediated categories. Formal test: stack the category-level estimates (seemingly-unrelated/cluster-bootstrap over agencies, 2,000 draws) and test the difference of group means, one-sided p < .05.
- **H4 (held-out UK replication, gating):** Apply the frozen specification to the UK scan: exposure = `govuk_count`, the govuk-frontend detection score defined component-by-component in [UK_SCAN_RECIPE.md](./UK_SCAN_RECIPE.md) §5 as a structural mirror of GSA's `uswds_count` (same weights, caps, sqrt scaling, and the same band boundaries: none 0 / trace 1–24 / partial 25–49 / likely 50–99 / definite 100+; "strong" = score ≥ 50); outcome = axe-core violations on the scanned homepage, mapped to GSA's categories by the recipe's verbatim rule table; controls = organisation-type fixed effects (central & national bodies / local authority / parish & town / NHS / devolved, recipe §2), HTTPS hygiene (https_enforced + hsts), and `asinh(third_party_service_count)`; SEs clustered by registrant organisation (registrant name where known, else the site's own hostname — the UK analogue of clustering by agency). Prediction: IRR(strong vs none) < 1, one-sided p < .05, and the UK IRR falls within ±0.20 of the US IRR for the same contrast.

### What counts as support

The paper's core claim — _design-system adoption predicts measurably better automated-accessibility outcomes at estate scale, robustly to maturity controls, and the pattern replicates across countries_ — stands if **H1 AND H4** hold. H2 and H3 enrich the mechanism story but do not gate the claim. If H1 holds and H4 fails, the paper becomes "a US-estate association that did not transfer", and says so plainly. Nulls are reported as nulls.

## 4. Pre-registered diagnostics for the leading confound (self-selection on digital maturity)

1. **Adoption-on-maturity gradient:** regress `1{uswds_count ≥ 50}` on `dap`, hygiene index, CMS, and agency FE. Reported regardless of result; quantifies how strongly adoption tracks observable maturity.
2. **Placebo outcomes:** estimate the H1 specification with `cumulative_layout_shift` and `ln(largest_contentful_paint)` as outcomes (OLS, same controls/FE). Support for the mechanism requires the standardized accessibility gradient to exceed both placebo gradients (comparison of standardized coefficients; cluster bootstrap, 2,000 draws). Similar-sized placebo gradients indicate a generic quality confound and will be reported as such.
3. **Pooled vs within-agency attenuation:** report H1 with and without agency FE. Collapse under FE (|IRR − 1| shrinking by > 75%) reclassifies the association as between-agency infrastructure rather than site-level adoption, and the abstract will say so.
4. **Oster (2019) bounds** on the H1 coefficient (δ = 1, Rmax = 1.3·R², on the log-linear OLS analogue).
5. **DAP-subset robustness:** re-estimate H1 within `dap = 1` sites only (uniformly "engaged" subsample).
6. **Functional form:** banded vs continuous exposure; negative-binomial robustness for overdispersion; winsorizing `violations_total` at the 99th percentile.

## 5. Analyst's priors (final, stated at lock)

Stated honestly given the already-seen unadjusted gradient (−60% mean violations, strong vs none):

- H1: adjusted IRR(strong vs none) ≈ 0.75 (90% interval: 0.55 to 0.95) — expecting roughly half the unadjusted gap to survive agency FE + maturity controls. P(direction correct) = .80.
- H2: IRR(v3 vs v2) ≈ 0.85 (90% interval: 0.65 to 1.10). P(direction correct) = .65.
- H3: P(component-mediated gradient steeper) = .60 — genuinely uncertain; `contrast` is component-mediated but also the highest-volume category with many content-driven instances.
- H4: P(UK direction replicates) = .70; P(magnitude within ±0.20 of US IRR) = .45 — different scanner, different page sampling, different estate composition.
- Biggest risks: (i) placebo gradients comparable to the accessibility gradient (diagnostic 2), pivoting the paper to "maturity, not design systems"; (ii) `uswds_count` mismeasuring adoption on JS-heavy sites; (iii) UK detection recipe noisier than GSA's, attenuating H4.

## 6. Freezing protocol

Executed at this lock (2026-06-12): (1) this file's status is LOCKED with date and artifact hashes — `data/processed/uswds_a11y.parquet` SHA-256 `f7090ce7e272fb4935a4fabb06c848c0c1c49faf5df01cc185a1082f79c19260`, `data/summaries/uswds-a11y.json` SHA-256 `dd80b7c5fcda8d36cbbd4f3995d480f6d64241bc55c57f28d1e65b6c7b86faee` (re-verified at lock); (2) the Parquet artifact and the ETL script (`tools/etl/src/gsa.ts`) are pinned by the git tag `paper-01-prereg` on the lock commit; (3) the UK scanner recipe ([UK_SCAN_RECIPE.md](./UK_SCAN_RECIPE.md): domain sources and frozen snapshots, homepage sampling rule, govuk-frontend detection weights and bands, axe-to-GSA category mapping, statuses, politeness policy) and the scanner implementation (`tools/scanner`) are committed in the same lock commit, **before** the first scan; (4) confirmatory estimation starts only after this lock, and UK estimation only after the UK artifact freeze (`DATA_FREEZE.md`, tag `paper-01-uk-data`). The interactive explorer on the research site is exploratory tooling and remains available; it exposes only unadjusted descriptives.

## 7. Deviations

Any deviation from this plan will be documented in a "Deviations from pre-registration" appendix in the paper, with reasons.
