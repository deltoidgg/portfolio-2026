# Research data landscape: datasets, experiments, and the chosen programme

**Prepared for:** Wasim Arif
**Date:** 12 June 2026
**Status:** Direction decided — this document records the dataset/experiment landscape that informed it, and the programme we are executing.

This document extends the two earlier research docs:

- [personal_frontend_ai_research_findings.md](./personal_frontend_ai_research_findings.md) — frontend/AI research directions (PatternLock Bench, Mockpit Provenance Bench, etc.)
- [software_engineering_research_opportunities.md](./software_engineering_research_opportunities.md) — broader software-engineering directions (Typed Agent Bench, ecosystem data)

Those docs catalogued the _experiment-led_ opportunities. This document answers the follow-up questions: **what public datasets exist that let us explore data in novel ways**, **where the open gaps are as of mid-2026**, and **which combination of observational data + built experiments forms the strongest first research programme** — modelled on the pre-registration discipline of [docs/PREREGISTRATION.md](./PREREGISTRATION.md) (the Mollick "Verdicts, Not Evidence" workflow: lock hypotheses → confirmatory tests → held-out replication → paper site).

---

## 1. Executive summary

The strongest novel opportunity sits exactly at the intersection of your brand (design systems, accessibility, AI agents):

> **Paper #1 — "Do design systems deliver accessibility at scale?"**
> An observational study using the GSA Site Scanning dataset (~26,000 US federal websites with _both_ graded US Web Design System adoption signals _and_ axe-core accessibility violations, bulk-downloadable daily, zero cost), triangulated with HTTP Archive BigQuery (UI-framework detection × Lighthouse accessibility, millions of pages), and replicated out-of-sample with **our own scan of UK public-sector websites** (Playwright + axe-core + `govuk-frontend` detection) — testing GDS's published but never-quantified claim that the GOV.UK Design System "gets you to WCAG 2.2 faster".

> **Paper #2 — PatternLock Bench** (from the earlier doc, unchanged in spirit)
> A controlled benchmark measuring whether AI coding agents stay inside a product's design system, and which interventions (AGENTS.md, docs, Storybook MCP, lint, visual/a11y feedback) work. The mid-2026 landscape check below confirms this niche is **still open**: existing evals test static HTML generation or JS bug-fixing, not design-system adherence inside real product codebases.

The two papers form one coherent programme:

> **Observational claim:** design systems correlate with measurably better accessibility on real production sites.
> **Experimental claim:** design systems (made machine-readable) are the most effective guardrail for AI-generated UI.
> **Brand:** _design systems are the quality infrastructure of the AI era — and I can prove it with data._

---

## 2. Novel public datasets (verified June 2026)

### 2.1 GSA Site Scanning — the headline find

**What it is:** The US General Services Administration scans ~26,000 public federal `.gov`/`.mil` websites **daily**, generating 1.5M+ fields about health, compliance, and best practice. Crucially for us, every scan includes both:

- **US Web Design System (USWDS) adoption signals** — graded, not binary: `uswds_count` (an additive "how USWDS-y is this site" score built from detected components), `uswds_semantic_version`, favicon/font/banner/class-prefix detections (`.usa-` classes), USWDS strings in HTML and CSS.
- **Accessibility violations** — counts of axe-core-detected violations, selected in coordination with the US Access Board and GSA's Government-wide IT Accessibility Program (`accessibility_violations`, plus `accessibility_scan_status`).

Plus rich covariates for controls: agency/bureau owner, Digital Analytics Program participation (`dap_detected` — a digital-maturity proxy), CMS, third-party services, HTTPS/HSTS hygiene, redirects, 404 handling, search presence, mobile viewport.

**Access:**

- Bulk CSV/JSON exported daily (documented at the [Site Scanning API docs](https://open.gsa.gov/api/site-scanning-api/)), e.g. `https://api.gsa.gov/technology/site-scanning/data/site-scanning-latest.csv`
- REST API: `https://api.gsa.gov/technology/site-scanning/v1/websites`
- [Data dictionary](https://github.com/GSA/site-scanning-documentation/blob/main/data/Site_Scanning_Data_Dictionary.csv), [snapshots repo](https://github.com/GSA/site-scanning-snapshots) (historical one-off snapshots → enables longitudinal analysis), [analysis repo](https://github.com/GSA/site-scanning-analysis)

**Why it's novel:** No published study links the USWDS adoption gradient to accessibility outcomes, despite both living in the same row of the same public CSV. The dataset has the structure of a natural dose–response design: adoption is graded (0 → ~25+ components), versioned, and observed across thousands of sites within the same legal/regulatory regime (Section 508 applies to all of them, which _removes_ a major confound present in commercial-web data).

**Caveats to pre-register:** automated axe-core checks cover only a subset of WCAG; agencies self-select into USWDS (digital-maturity confound — control with DAP participation, HTTPS hygiene, agency fixed effects); home-page-centric scans; shared infrastructure within agencies (cluster standard errors by agency).

### 2.2 HTTP Archive (BigQuery) — scale and the commercial web

**What it is:** Monthly crawls of millions of pages with Wappalyzer-based technology detection (`technologies` tables — React, Vue, Bootstrap, MUI, Tailwind, etc., ~15GB, cheap to query) and Lighthouse audits including the accessibility category and individual audits (button-name, color-contrast, image-alt, label, link-name).

**Access:** public BigQuery project `httparchive` ([getting started](https://har.fyi/guides/getting-started/)); pre-aggregated [Tech Report](https://httparchive.org/reports/techreport/) (median Lighthouse accessibility score by detected technology — free, no BigQuery needed); [accessibility report for top-1M](https://httparchive.org/reports/accessibility?lens=top1m); the annual [Web Almanac accessibility chapter](https://almanac.httparchive.org/en/2025/accessibility) for methodology precedent.

**How we use it:** the commercial-web counterpart to the federal data — do sites detected with component libraries / design systems score better on Lighthouse accessibility than framework-matched sites without them? **Cost control:** the raw `lighthouse` tables are multi-TB; stay within BigQuery's 1TB/month free tier by querying the small `technologies` tables, the pre-aggregated tech-report tables, and one carefully scoped extract with clustered columns.

### 2.3 The UK gap — data we create (held-out replication)

**The claim to test:** GDS published ["Get to WCAG 2.2 faster with the GOV.UK Design System"](https://accessibility.blog.gov.uk/2024/01/11/get-to-wcag-2-2-faster-with-the-gov-uk-design-system/) (1,200+ services estimated to use it). The Cabinet Office/GDS runs statutory [accessibility monitoring](https://www.gov.uk/guidance/public-sector-website-and-mobile-application-accessibility-monitoring) of public-sector sites and publishes [summary reports](https://www.gov.uk/government/publications/accessibility-monitoring-of-public-sector-websites-and-mobile-apps-from-2022-to-2024/accessibility-monitoring-of-public-sector-websites-and-mobile-apps-from-2022-to-2024) — **but no raw per-site dataset**. Third-party snapshots exist (e.g. Acquia's 48-council benchmark) but nothing linking design-system adoption to outcomes.

**The opportunity:** replicate the GSA methodology on UK public-sector domains with our own scanner — Playwright + axe-core + `govuk-frontend` detection heuristics (the `.govuk-` class prefix, `govuk-frontend` asset paths and version strings, GOV.UK fonts/crown logo markers — direct analogues of GSA's `.usa-` detection recipe). Public domain lists exist for UK councils and `gov.uk` subdomains. This produces:

1. a **novel open dataset** (UK public-sector design-system adoption × accessibility) that GDS itself doesn't publish;
2. the **held-out replication sample** for Paper #1, in the exact Mollick pattern (frozen specification from US discovery data, applied once to UK data);
3. UK-specific credibility aligned with your location and the public-interest angle.

### 2.4 WebAIM Million — context, not raw data

The [2026 report](https://webaim.org/projects/million/) (8th year): 95.9% of top-1M home pages have detectable WCAG 2 A/AA failures (up from 94.8% — first reversal after six years of improvement); 56.1 errors/page average; ARIA attributes up 6× since 2019 and _correlated with more errors_; 96% of errors come from the same six categories. **No bulk raw download** (per-domain lookup only) — so we use it for motivation/trend framing and benchmark our own scanner's findings against its aggregates.

### 2.5 Devographics raw survey data (State of JS / CSS / HTML)

Raw, per-respondent survey data is accessible via the public GraphQL API (`https://api.devographics.com/graphql`) including **freeform accessibility responses** (State of HTML: `accessibility_pain_points`, `accessibility_techniques`, `accessibility_screenreaders`, `accessibility_tools`), with the full raw dataset available on request (maintainers grant access via Discord). Novel use: text-mine practitioner accessibility pain points and cross-tabulate with framework/design-system usage — a good secondary analysis or blog-scale piece. ([example queries](https://github.com/Devographics/surveys/issues/230))

### 2.6 Agent/benchmark datasets relevant to Paper #2

| Dataset                                                                                | What it offers                                                                                                                                                | Relevance                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [SWE-bench Multimodal](https://huggingface.co/datasets/SWE-bench/SWE-bench_Multimodal) | 617 JS issue-fix tasks from 17 visual libraries, 90%+ with images; private test split via `sb-cli`; top systems resolve only ~36% vs ~75% on Python SWE-bench | Proves frontend/visual is the open frontier; reusable task-construction methodology; _not_ design-system adherence                                                                                      |
| [microsoft/a11y-llm-eval](https://github.com/microsoft/a11y-llm-eval)                  | Prompt suite → static HTML → axe-core + hand-written per-component assertions via Playwright; pass@k, token/cost tracking                                     | Direct methodological precedent. Key published numbers: ~10% average accessible-by-default across models (best: GPT 5.2 at 41%); instruction files add +18pp (minimal), +37pp (basic), +48pp (detailed) |
| [A11YN / RealUIReq-300](https://arxiv.org/pdf/2510.13914)                              | RL alignment using severity-weighted axe-core penalties as reward; 60% lower inaccessibility rate                                                             | Shows a11y-as-reward works at the _model_ level; nobody has done it at the _agent/codebase_ level                                                                                                       |
| METR RCT data, SWE-PRBench, GH Archive, npm downloads, MCP registry                    | (Catalogued in the earlier docs)                                                                                                                              | Secondary/contextual                                                                                                                                                                                    |

### 2.7 Datasets considered and parked

- **Rico / WebUI / Design2Code / WebSight** — screenshot↔UI corpora; useful if we later do visual-fidelity scoring research, not needed for Papers #1–2.
- **GitHub Innovation Graph, Libraries.io/ecosyste.ms, OpenSSF Scorecard** — ecosystem panels; useful for an adoption-trends explorer later.
- **Chatbot/WebDev Arena votes** — preference data is third-party and contamination-prone; parked.

---

## 3. Gap analysis (mid-2026): is the niche still open?

Checked June 2026:

- **Design-system adherence benchmarks:** the discourse has arrived — Brad Frost's "agentic design systems" framing (coverage + validation loops), Storybook building "evals" for design-system usage against test prompts, and a wave of agent _skills_ for design-drift auditing (e.g. `design-fidelity-auditor`, `ds-architect`, SEEK's `design-review`). But there is **no controlled, multi-condition, published benchmark** measuring agent adherence inside real product codebases. The tools that exist are _interventions we can evaluate_, not competition — they strengthen Paper #2 (more conditions to compare, more communities who care).
- **Accessibility × LLM evals:** static HTML generation only (a11y-llm-eval; the Springer 11-component study). Nothing tests whether agents _preserve_ accessibility while modifying real codebases, or whether design-system components carry accessibility through agent edits — exactly our framing.
- **End-to-end agent benchmarks:** ProjDevBench etc. evaluate architecture/correctness of generated projects; none touch design systems or accessibility.
- **Observational design-system × a11y studies:** none found on GSA data; HTTP Archive Almanac chapters describe a11y in aggregate but never condition on design-system adoption; GDS publishes claims without data.

**Conclusion: both niches are open, and the observational one is essentially free to execute.**

---

## 4. The chosen programme

### Paper #1 — _Do design systems deliver accessibility at scale?_ (observational, first)

- **Discovery sample:** GSA Site Scanning snapshot (frozen on a recorded date). Exposure: `uswds_count` dose + semantic version. Outcome: axe-core violation counts. Controls: agency fixed effects, DAP participation, CMS, page weight/complexity, security-hygiene index (digital-maturity proxy). Clustered SEs by agency.
- **Triangulation:** HTTP Archive — UI-library detection × Lighthouse accessibility on the commercial web (different population, different tooling → robustness, not identity).
- **Held-out replication:** frozen specification applied once to our own UK public-sector scan (govuk-frontend × axe-core).
- **Pre-registered before estimation** in the Mollick template: hypotheses, exact models, diagnostics for the self-selection confound, analyst priors, deviations appendix. See [docs/research/paper-01-design-systems-a11y/PREREGISTRATION.md](./research/paper-01-design-systems-a11y/PREREGISTRATION.md).
- **Honest framing:** associations from observational data, with the dose–response gradient, version effects, within-agency contrasts, and cross-population replication as the evidence package — _not_ causal claims.

### Paper #2 — _PatternLock Bench_ (experimental, second)

As specified in [personal_frontend_ai_research_findings.md](./personal_frontend_ai_research_findings.md) §4, sharpened by the landscape check: conditions should now include the 2026 intervention ecosystem (Storybook MCP/evals, design-audit agent skills, a11y instruction files at the three published intensity levels). The reference design system will be `packages/ui` from this monorepo — dogfooded across the portfolio and research apps first, then frozen as the benchmark fixture.

### Why this order

1. Paper #1 needs no API budget, no human reviewers, and produces a publishable, replication-backed result fastest.
2. It builds the exact infrastructure Paper #2 needs (ETL → Parquet artifacts → explorer UI → paper site).
3. Narrative: the observational result motivates the benchmark ("design systems predict accessibility in the human-built web; do they constrain the machine-built web?").

---

## 5. Infrastructure (decided; implemented in this repo)

- **Monorepo additions:** `apps/research` (TanStack Start, papers + interactive explorers, own subdomain), `packages/ui` (shared design tokens/components — later the PatternLock fixture), `packages/datasets` (Zod schemas + typed loaders for data artifacts), `tools/etl` (ingest → DuckDB → Parquet/JSON artifacts), `tools/scanner` (phase 2, UK scan).
- **Data layer:** static **data-artifacts pattern** — versioned Parquet (analysis-grade) + JSON summaries (figure-grade) committed to `data/`; raw downloads gitignored. The research app queries Parquet **client-side via DuckDB-WASM** (free-form exploration) and imports JSON summaries at build time (paper figures). No database until user-generated or live-run data demands one (Convex is the earmarked option).
- **Reproducibility:** frozen artifact + frozen spec = the pre-registration boundary. Every figure on the paper site traces to a committed artifact and a committed transform script.

## 6. Roadmap

| Phase   | Deliverable                                                                                                                                                                |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 (now) | This doc; `packages/ui`; `apps/research` shell (papers + explorer routes); GSA ETL + first artifact; USWDS×a11y explorer; portfolio research index; pre-registration draft |
| 2       | HTTP Archive extract; UK scanner + dataset release; freeze prereg; run confirmatory analysis; Paper #1 site (abstract, figures, methods, downloads — Verdicts-style)       |
| 3       | PatternLock Bench harness (Paper #2), reusing the artifact pipeline for run logs and the leaderboard explorer                                                              |
