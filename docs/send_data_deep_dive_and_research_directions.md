# SEND Public Data Deep Dive and Research Directions

**Prepared for:** Lyceum Labs
**Date:** 11 June 2026
**Status:** Research findings — extends, and does not replace, `send_public_data_research_opportunities.md` (9 June 2026)
**Method note:** This pass focused on datasets _not_ covered in the previous document, on recent changes to collections (2023–2026), and on identifying the sharpest single empirical question to lead with, in the style of the Mollick/Fable _Verdicts, Not Evidence_ paper.

---

## 1. What this pass found (executive summary)

The previous document mapped the core DfE/LGSCO/Ofsted landscape well. This deep dive found six things that materially change the picture:

1. **The SEN2 collection became person-level in 2023** and now records, for every EHC needs assessment request and every assessment, whether the decision went to **mediation** and/or **tribunal**, plus refusal outcomes and dates. DfE now publishes (for the first time, 2025 release) **tribunal appeal numbers, appealable decisions, and appeal rates by local authority** under a new methodology. This unlocks a clean LA-level "decision → dispute" funnel that simply did not exist as published data before.
2. **The tribunal outcome asymmetry is extreme and quantified.** In 2024/25: ~25,000 appeals registered (9th consecutive record year, +18%), ~20,000 resolved, and of cases decided at hearing, **99% found for the appellant** (LA success rate 1.1% — 149 of 14,009 hearings). MoJ now also publishes a Section I (placement) decision-notice text analysis. Sector estimates put LA spend defending these appeals at £200m+ per year.
3. **NHS England publishes autism diagnostic waiting times quarterly at sub-ICB level** (age, gender, ethnicity splits). June 2025: 236,225 open referrals for suspected autism, 89.4% waiting 13+ weeks, only ~4% seen within the NICE-recommended 13 weeks. This is the health-side queue that sits _upstream_ of much school SEND friction, and it is rarely joined to education data.
4. **DWP publishes child DLA awards by local authority (Stat-Xplore, with API)**, including main disabling condition. This is an independent, medically-anchored measure of childhood disability that can be set against school-side SEN identification — a "recognition gap" instrument.
5. **DfE now collects and publishes special school capacity (SCAP survey, since 2023)** including SEN unit / resourced provision capacity and LA forecast demand for specialist places: ~160,000 special school places against forecast specialist EHCP demand of ~260,000 (2025/26) rising to ~310,000 by 2029/30; roughly two-thirds of special schools at or over capacity. This quantifies the provision shortfall directly.
6. **The high-needs deficit story now has published per-LA money attached**: Safety Valve agreements (published per LA), the DSG statutory override extension to March 2028, and the new High Needs Stability Grant (2026–27, covering 90% of eligible deficits conditional on approved local SEND reform plans). Fiscal distress is measurable LA by LA.

**Headline recommendation (section 4):** lead with a tribunal/justice-gap paper — working title **_Refused, Not Appealed: The SEND Appeals That Never Happen_** — because it has the cleanest identification, the most striking single finding, direct lineage to the _Verdicts, Not Evidence_ style, and the strongest parent-awareness payoff. Build the LA × year panel infrastructure so that the previously recommended **Parent Friction Index** becomes paper two on the same foundations.

---

## 2. New datasets not in the previous document

### 2.1 Disputes and decisions

| Dataset                                             | Publisher / level                                | What is new or under-analysed                                                                                                                                                                                                                | Access                                                                                                                                                                                                                                    |
| --------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEN2 person-level collection (published aggregates) | DfE; LA level, annual, 2023 onwards              | Refusal to assess rates (24.0% of 138,242 requests in 2023), refusal to issue, mediation flags on each decision stage, 20-week timeliness with exceptions, plus newly published **appeal rates by LA** with appealable-decisions denominator | [EHC plans release](https://explore-education-statistics.service.gov.uk/find-statistics/education-health-and-care-plans) + [methodology](https://explore-education-statistics.service.gov.uk/methodology/education-health-and-care-plans) |
| SEND Tribunal annual tables (SEND_1–SEND_11)        | MoJ/HMCTS; national + LA-linkable, academic year | Outcomes by appeal type; 99% decided for appellants (2023/24 and 2024/25); registrations vs disposals vs open caseload; **Section I decision-notice analysis** (31% parent preference, 24% LA conceded at hearing, 13% LA preference)        | [Tribunal statistics quarterly](https://www.gov.uk/government/collections/tribunals-statistics)                                                                                                                                           |
| Mediation cases (within SEN2)                       | DfE; LA level                                    | Mediation volumes by stage and how often mediation is followed by tribunal — the "forced detour" before appeal                                                                                                                               | EHC plans release supporting tables                                                                                                                                                                                                       |

### 2.2 Health-side queues (upstream of school friction)

| Dataset                                      | Publisher / level                                        | What is under-analysed                                                                                                                                                                                | Access                                                                                                                  |
| -------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Autism waiting time statistics               | NHS England; sub-ICB + provider, quarterly, 2019 onwards | Open referrals, waits 13+ weeks, first-contact rates, age/gender/ethnicity splits. Caveat: community paediatrics (CSDS) not yet identifiable, so child counts understate true demand — must be stated | [NHS Digital autism statistics](https://digital.nhs.uk/data-and-information/publications/statistical/autism-statistics) |
| CYP mental health (MHSDS-derived) indicators | NHS England / OHID Fingertips; ICB/LA                    | CAMHS referral and access context for SEMH-need areas                                                                                                                                                 | Fingertips API                                                                                                          |
| DLA for children                             | DWP Stat-Xplore; LA (also ward/constituency), quarterly  | Child disability benefit caseload by **main disabling condition** (incl. autism, ADHD, learning difficulties) — an education-independent disability prevalence proxy                                  | [Stat-Xplore](https://stat-xplore.dwp.gov.uk/) (has an open API with guest access)                                      |

### 2.3 Provision capacity and money

| Dataset                                                                 | Publisher / level                                                     | What is under-analysed                                                                                                                                             | Access                                                                                                         |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| School capacity (SCAP): special schools, SEN units, resourced provision | DfE; LA level, annual since 2023 (official statistics in development) | Special place counts vs **LA forecast demand for specialist provision** to 2029/30+; share of special schools at/over capacity; SEN unit/RP capacity in mainstream | [School capacity release](https://explore-education-statistics.service.gov.uk/find-statistics/school-capacity) |
| Safety Valve agreements / DSG very high deficit intervention            | DfE; per-LA published agreements                                      | Which LAs are in structured deficit-recovery, payment schedules, conditions                                                                                        | GOV.UK "Dedicated schools grant: very high deficit intervention"                                               |
| High Needs Stability Grant + DSG deficit explanatory note               | DfE; per-LA allocations from 2026–27                                  | Eligible high-needs deficit per LA (the 90% relief base is itself a published deficit measure); statutory override timeline to March 2028                          | GOV.UK explanatory note + allocations                                                                          |
| s251 / LA and school expenditure (already in prior doc)                 | DfE; LA                                                               | Now joinable to deficits, Safety Valve status, and capacity shortfall                                                                                              | EES                                                                                                            |

### 2.4 Outcomes and trajectories

| Dataset                                                   | Publisher / level                                                                   | What is under-analysed                                                                                                                                                                                    | Access                                                                                                                                                                                    |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| KS4 performance by SEN                                    | DfE; national/regional/LA (+LAD, constituency), school level via performance tables | Attainment 8 / Progress 8 by SEN provision; **new crosstabs SEN × ethnicity × disadvantage × sex** (2024/25 release)                                                                                      | [KS4 performance](https://explore-education-statistics.service.gov.uk/find-statistics/key-stage-4-performance)                                                                            |
| KS4 + 16–18 destination measures by SEN                   | DfE; national/LA + institution level                                                | Sustained destinations after year 11 by SEN status, incl. special schools and AP; SEN support pupils have the _worst_ sustained-destination rates                                                         | [KS4 destinations](https://explore-education-statistics.service.gov.uk/find-statistics/key-stage-4-destination-measures)                                                                  |
| Outcomes for children in need / looked after              | DfE; LA level                                                                       | SEN prevalence inside social-care cohorts (~50% of CIN, ~58% of CLA-12-months have SEN; CIN 2.7× more likely to have EHC plan) — the SEND/social-care overlap is quantifiable by LA                       | [Outcomes for CIN/CLA](https://explore-education-statistics.service.gov.uk/find-statistics/outcomes-for-children-in-need-including-children-looked-after-by-local-authorities-in-england) |
| Elective home education (now richer than prior doc noted) | DfE; LA, termly                                                                     | EHE now includes **primary reason** ("mental health" is the top known reason at 16%) and **SEN breakdowns** (7% of EHE children have an EHC plan vs 5% of school population; 16% SEN support vs 14%)      | [EHE release](https://explore-education-statistics.service.gov.uk/find-statistics/elective-home-education)                                                                                |
| Ofqual access arrangements (revised series, Nov 2025)     | Ofqual; national only                                                               | 25% extra time approvals for 16.6–25.5% of the 2024/25 exam cohort; revised 2015/16→ series after the old stats were withdrawn. National-level only, so context/trend material rather than panel variable | GOV.UK access arrangements statistics                                                                                                                                                     |

### 2.5 Comparative (cross-nation natural experiments)

| Dataset                     | What it offers                                                                                                                                                                                                                                                          | Access                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Wales schools census (ALN)  | After the ALN Act rollout (2022→), identified ALN/SEN **fell ~32–40%** (9.5% of pupils in Jan 2025 vs ~22% pre-reform) while England rose to 20.8%. A Senedd committee attributes the fall to resource pressure, not need reduction. A striking policy-divergence study | [StatsWales schools census](https://www.gov.wales/schools-census-results-january-2025-html) |
| Scotland pupil census (ASN) | ~31–37% identified with ASN under a deliberately broader definition — useful for the "identification is a policy choice" argument                                                                                                                                       | gov.scot pupil census                                                                       |

### 2.6 Checked and ruled out / limited

- **Ofsted Parent View school-level data**: school-level CSVs exist (10+ submissions), but the SEND question (Q7, "the school gives my SEND child the support they need to succeed") is published **national-level only** to prevent identification. Usable for national trend only.
- **National Pupil Database / ONS SRS linked data**: pupil-level gold standard but requires accredited access and a long approval pipeline. Explicitly out of scope for v1; flag as "future work" in papers.
- **SENCO-level workforce data**: School Workforce Census published tables don't reliably isolate SENCO time; prior doc's survey-augmented design remains the only route.
- **DfE's own meta-inventory**: ["SEND: analysis and summary of data sources"](https://www.gov.uk/government/publications/send-analysis-and-summary-of-data-sources) (updated annually) is a useful completeness check against this list.

---

## 3. New research opportunities (ranked)

### Opportunity A — _Refused, Not Appealed: The SEND Appeals That Never Happen_ (recommended lead paper)

**The empirical hook.** Tribunals decide ~99% of heard SEND appeals in families' favour, and LAs concede a further large share before/at hearing. If appeals are near-certain to succeed, then _every refusal that is never appealed_ is, in expectation, an unmet legal entitlement. The interesting population is therefore not the 25,000 families who appeal — it is the much larger group who are refused and go silent.

**Research questions.**

1. What share of appealable SEND decisions (refusal to assess, refusal to issue, content disputes) are never appealed, and how does this vary by LA?
2. Is the appeal-conditional-on-refusal rate lower in more deprived areas (a "justice gap" gradient), conditional on refusal rates, SEN prevalence, and school-phase mix?
3. Do LAs with high refusal rates + low appeal rates show _worse_ downstream signals (SEN absence gaps, EHE-for-mental-health, LGSCO findings) — consistent with deterred families rather than satisfied ones?
4. (Descriptive) What is the implied lower-bound count of "lost entitlements" per year nationally if unappealed refusals were upheld at the observed tribunal rate?

**Data.** SEN2 person-level published aggregates (refusals, mediation, timeliness, by LA); DfE's new appealable-decisions/appeal-rate-by-LA tables; MoJ SEND annual tables (outcomes, types); IMD 2019 (+2025 update if released); SEN/absence/exclusion/EHE releases for downstream outcomes; DLA child as a need control.

**Why it is the strongest lead.**

- _Identification clarity_: one sharp behavioural asymmetry (near-certain win rates vs low appeal take-up) rather than a composite index. Composites invite "garbage-in" critiques; this design has a single load-bearing fact that is already officially published.
- _Direct lineage to the Mollick exemplar_: it is literally about how people respond to verdicts; the preregistration can mirror the PREREGISTRATION.md structure (locked hypotheses, priors, diagnostics for the leading confound, deviations appendix).
- _Pre-registerable confound diagnostics_: the leading alternative is that low-appeal areas have _justified_ refusals. Diagnostics: (i) tribunal outcomes do not vary much by LA (verdict quality is flat), (ii) negative-control outcomes, (iii) DLA-anchored need controls, (iv) LGSCO upheld-rates as corroboration.
- _Awareness payoff_: the headline ("families in the poorest areas are the least likely to challenge refusals they would almost certainly win") is precisely Lyceum's mission framing — friction falls on those least resourced to fight it — without blaming any individual school or family.
- _Timing_: SEND White Paper expected 2026; tribunal reform is on the policy agenda. The paper lands into an active debate.

**Risks / honesty requirements.** Appeal rates by LA are official-statistics-in-development (new methodology — use both old and new); refusal-to-appeal funnels are aggregate (no individual linkage — say so); 99% is "majority of appeal won" not "every point won"; deterrence vs satisfaction cannot be fully separated without survey data — frame as bounding analysis, pre-register the interpretation rules.

### Opportunity B — _No Room: Special School Capacity, Forecast Demand, and Where the System Overflows_

SCAP capacity + LA forecast specialist demand vs EHCP growth, independent-placement spend (s251), transport spend, and distance proxies (GIAS school locations — already in the product database). Quantifies the provision shortfall LA by LA; pairs naturally with the DSG deficit/Safety Valve data (deficits as the fiscal shadow of capacity shortfall). Strong maps; "official statistics in development" caveats required. Could be the second confirmatory paper or a high-impact descriptive brief alongside paper one.

### Opportunity C — _Two Systems, One Child: The Recognition Gap Between Health and School_

DLA child caseload (medical recognition) vs SEN support/EHCP rates (educational recognition) by LA, with autism waiting lists by sub-ICB as the queue connecting them. Where do many children hold DLA but few hold EHC plans (or vice versa)? Geography crosswalk LA↔ICB is the main technical lift. Novel join; strong descriptive value; causal claims must stay modest.

### Opportunity D — _Exit Through the Back Door_ (strengthens prior doc's Opportunity 4)

The EHE release's new **reason** field (mental health as top known reason) plus SEN breakdowns turns the system-exit story from inference into measurement. Join EHE-for-mental-health rates with severe-absence (EBSA proxy), SEMH need rates, CAMHS/autism waits, and friction measures. Ethical framing from the prior doc carries over (EHE is not inherently negative).

### Opportunity E — _What Counts as Need? England, Wales, and Scotland Diverge_

Wales's ALN reform cut identified need ~32–40% while England's rose; Scotland identifies ~31%+ under a broader definition. A short comparative paper arguing identification is a policy artefact, not epidemiology. Lower effort, high think-piece value, useful brand credibility internationally; weaker fit with parent-facing mission than A–D.

---

## 4. Recommended programme

1. **Paper 1 (confirmatory, preregistered): _Refused, Not Appealed_** — Opportunity A. Single sharp question, LA × year panel, preregistration mirroring `PREREGISTRATION.md`, deviations appendix, held-out-style robustness (e.g., freeze specs on 2023+2024 data, replicate on the 2025 release when published; leave-one-region-out).
2. **Paper 2: the SEND Parent Friction Index** (prior doc's Opportunity 1) — built on the _same_ LA × year panel, now with the new components available (refusal rates, mediation rates, capacity shortfall, deficit status). The index becomes more defensible because Paper 1 validated its sharpest component.
3. **Ongoing public asset: the interactive LA explorer** — maps and per-LA profiles for the panel (friction components, capacity, waits, outcomes), refreshed as releases land. This is the compounding brand asset; each paper adds layers.
4. **Later: SENDCaseBench** (prior doc's Opportunity 7) once the LGSCO scraping/classification pipeline exists.

**Why lead with A rather than the Friction Index:** the index is the right _programme_ but a risky _first paper_ — composite indices are where critics aim first. A single-mechanism paper with an official, already-published outcome asymmetry establishes methodological credibility cheaply; the index then inherits that credibility.

---

## 5. Data access and engineering notes

- **EES API**: most DfE datasets above are downloadable as CSV via the Explore Education Statistics API with stable dataset IDs (already noted in prior doc). New additions here (school capacity, EHE, KS4, CIN outcomes) are all on EES.
- **Stat-Xplore API**: DWP data (DLA child) has a JSON API; guest access works for the required tables.
- **NHS autism statistics**: ZIP/CSV downloads per quarter; sub-ICB geography requires an ICB↔LA best-fit crosswalk (ONS publishes lookup files).
- **MoJ tribunal tables**: ODS supporting tables per quarterly bulletin; annual SEND tables are the stable series.
- **Geography**: one LA crosswalk (handling 2019–2023 LGR changes: Northamptonshire, Cumbria, Somerset, North Yorkshire) is the single most reused asset; build once, version it.
- **No restricted-access data needed for Papers 1–2.** Everything is open data under OGL. NPD/SRS linkage is future work.

---

## 6. Source list (new items only)

- DfE, EHC plans methodology (appeal rates by LA, person-level SEN2): https://explore-education-statistics.service.gov.uk/methodology/education-health-and-care-plans
- DfE, SEN2 person-level technical specification: https://www.gov.uk/government/publications/special-educational-needs-person-level-survey-technical-specification
- MoJ, Tribunal statistics quarterly (SEND annual tables incl. SEND_11 Section I analysis): https://www.gov.uk/government/statistics/tribunals-statistics-quarterly-july-to-september-2025/tribunal-statistics-quarterly-july-to-september-2025
- Special Needs Jungle analysis of 2024/25 tribunal outcomes (sector corroboration, £200m+ estimate): https://www.specialneedsjungle.com/las-win-none-25k-send-appeals-over-200m-shocking-announcement/
- NHS England, Autism waiting time statistics: https://digital.nhs.uk/data-and-information/publications/statistical/autism-statistics
- DWP Stat-Xplore (DLA cases in payment, Client Type = Children): https://stat-xplore.dwp.gov.uk/
- DfE, School capacity (incl. special schools, SEN units, forecast specialist demand): https://explore-education-statistics.service.gov.uk/find-statistics/school-capacity/2024-25
- Schools Week, "Two-thirds of special schools over capacity": https://schoolsweek.co.uk/two-thirds-of-special-schools-full-or-over-capacity-new-data-shows/
- DfE, High needs funding 2026–27 operational guide (High Needs Stability Grant): https://www.gov.uk/government/publications/high-needs-funding-arrangements-2026-to-2027/high-needs-funding-2026-to-2027-operational-guide
- DfE, Explanatory note on DSG deficits: https://www.gov.uk/government/publications/explanatory-note-on-the-governments-approach-to-dedicated-schools-grant-deficits/explanatory-note-on-the-governments-approach-dedicated-schools-grant-deficits
- DfE, KS4 performance (SEN breakdowns): https://explore-education-statistics.service.gov.uk/find-statistics/key-stage-4-performance/2024-25
- DfE, KS4 destination measures (SEN breakdowns): https://explore-education-statistics.service.gov.uk/find-statistics/key-stage-4-destination-measures/2023-24
- DfE, Outcomes for children in need / looked after: https://explore-education-statistics.service.gov.uk/find-statistics/outcomes-for-children-in-need-including-children-looked-after-by-local-authorities-in-england
- DfE, Elective home education (reason + SEN breakdowns): https://explore-education-statistics.service.gov.uk/find-statistics/elective-home-education/2025-26-autumn-term
- Ofqual, Access arrangements 2024/25 (revised series): https://www.gov.uk/government/statistics/access-arrangements-for-gcse-as-and-a-level-2024-to-2025-academic-year/access-arrangements-for-gcse-as-and-a-level-2024-to-2025-academic-year
- Ofsted Parent View management information (Q7 SEND national-only caveat): https://www.gov.uk/government/statistical-data-sets/ofsted-parent-view-management-information
- Welsh Government, Schools' census January 2025 (ALN): https://www.gov.wales/schools-census-results-january-2025-html
- Senedd Children, Young People and Education Committee, ALN reform interim report: https://senedd.wales/media/c2sjtv5b/cr-ld16588-e.pdf
- DfE, SEND: analysis and summary of data sources: https://www.gov.uk/government/publications/send-analysis-and-summary-of-data-sources
