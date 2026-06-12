# Pre-Registration: Was It a Test? Experimental Intent and Entrepreneurs' Responses to Market Signals

**Date locked:** 2026-06-04
**Author of record:** Ethan Mollick (analysis executed by Claude, Anthropic)
**Data:** Kickstarter creator survey (fielded 2015) merged with Kickstarter administrative data (master file `Answered Data.dta`), N = 9,322 projects (8,781 funded, 523 failed, 18 canceled).

## Disclosure of prior data contact

Before locking this document, the analyst examined: (a) variable names, labels, and the survey instrument; (b) univariate distributions and missingness patterns, including missingness split by funded/failed status (used solely to assess feasibility/power); (c) the survey codebook and prior cleaning scripts. **No bivariate or multivariate relationship between any independent and dependent variable below has been examined.** Prior published work from this dataset's archival components (Mollick 2014; the _Gender, Hubris_ paper) and a work-in-progress on crowd composition (the "embeddedness" paper) inform general expectations but did not test these hypotheses.

## 1. Research question

Crowdfunding campaigns are, among other things, demand experiments. But founders launch them with different questions in mind: 39% report launching partly "to see if there was demand for the project" (demand-testers); others launched to fund a project they were committed to regardless, to build community, or for fun. **Do founders who framed the campaign as a demand test respond more elastically — in beliefs and in venture commitment — to the strength of the demand signal the market returned?**

Theory: entrepreneurship-as-experimentation (Kerr, Nanda & Rhodes-Kropf 2014; Camuffo et al. 2020; McGrath 1999 real options) implies signals are only used by those who treat the venture as a hypothesis. Identity and passion perspectives (Cardon et al. 2009; Akerlof & Kranton 2000; escalation: Staw 1976) imply expressively motivated founders persist independent of signals. The contribution is evidence on _intent-contingent learning_: the same objective signal produces different belief and commitment responses depending on the question the founder was asking.

## 2. Variables

### Moderator (focal)

- `tester` = 1 if `why_demand == 1` ("To see if there was demand for the project," check-all-that-apply), 0 if the respondent checked ≥1 other `why_*` item but not this one. Respondents checking no `why_*` item are excluded (universe rule follows the dataset's established recipe).

### Signal strength

- `signal` = ln(pledged_in_usd / goal_in_usd), winsorized at the 1st/99th percentile **within the relevant estimation sample** (funded-only, failed-only, or pooled). Centered at 0 = exactly 100% funded.
- Robustness: `lsurplus` = log10(pledged − goal + 1) per the house recipe (funded side).

### Dependent variables — beliefs

- `belief` = `skill_3` ("If I launched another campaign of similar size, I would succeed in raising funds," 1–5), z-scored in the estimation sample. Asked of funded and failed creators.

### Dependent variables — venture commitment (funded side)

1. `ft_ever` = 1 if `fulltime_self` or `fulltime_co` ∈ {1, 2} (ever worked on the project as sole full-time job), 0 if ∈ {3, 4}.
2. `newco` = 1 if `formal_org == 3` (formal organization established for the project), 0 otherwise (formal_org 1, 2, 4).
3. `anyemp` = 1 if parsed `people_now_employ` > 0 OR parsed `people_mid_employ` > 0, 0 if both parse to 0; missing if both blank. Parsing follows the house recipe (blank → missing; non-numeric junk → 0).
4. `commit_index` = inverse-covariance-weighted mean (Anderson 2008) of the z-scores of (1)–(3), computed on the estimation sample. **This index is the primary commitment outcome; components are secondary.**

### Dependent variables — persistence/abandonment (failed side, secondary)

- `abandoned` = 1 if both `next_continue` ≤ 2 and `next_developing` ≤ 2 (disagreement with continuing/developing the idea); 0 if either ≥ 4; 0.5 treated as missing (middle responses on both). Simpler robustness: continuous persistence = mean z of (`next_continue`, `next_developing`).
- `learned_wrong` = z of `nolaunch_wrong` ("What I learned from the first project convinced me that I was wrong about the demand for my project"; recoded to its observed scale by subtracting the sample minimum).
- `discouraged` = z of `next_disc`.

### Exploratory outcomes (labeled exploratory in the paper)

- `revenue_mid` (house midpoints) transformed asinh; `earn change` = earning_after_mid − earning_before_mid; follow-on external funding = any of `post_loan/co/angel/vc/other_fund == 1`.

### Controls (all models)

Category × launch-year fixed effects (recat per house recipe × projectyear); ln(goal*in_usd); female; age band; education band (0/1/2); team project indicator (answered `_co` branch); prior employment status dummies (entrepreneur/self-employed/freelancer vs employed/student/not employed); serial creator (launched_rank > 1); platform experience (asinh creator_backed_projects); has_video; physical product; US-based; promotion battery (`adv_paid`, `adv_press`, `adv_consult`, `adv_event`, `adv_promote`, checkbox → 0/1 under the same universe rule as why*\*).

### Sample restrictions

- Funded-side models: `finished_state == "successful"`, goal_in_usd ≥ $1,000 and pledged_in_usd ≥ $1,000 (house recipe), creator-branch respondent (nonmissing `fulltime_self` or `fulltime_co`), nonmissing tester.
- Failed-side models: `finished_state == "failed"`, goal_in_usd ≥ $1,000, nonmissing tester. (No pledge floor — pledged is mechanically low for failures.)
- Pooled belief model: union of the two samples.
- Canceled projects excluded everywhere.

## 3. Confirmatory hypotheses and exact tests

All models OLS/LPM with HC1 robust standard errors clustered by `creator_id`. Interactions use centered `signal`. The coefficient of interest is **β₃ on `tester × signal`**.

- **H1 (belief updating, funded side):** In `belief = β₀ + β₁ tester + β₂ signal + β₃ tester×signal + controls`, β₃ > 0. One-sided p < .05.
- **H2 (commitment elasticity, funded side):** Same specification with `commit_index` as DV: β₃ > 0. One-sided p < .05. Components (ft_ever, newco, anyemp) reported with Westfall–Young maxT familywise correction (5,000 permutations of tester within category×year cells).
- **H3 (motive specificity):** Re-estimate H2's model replacing tester with each placebo motive — `why_aware` (awareness), `why_connect` (community), `why_whee` (fun) — one at a time, then jointly with tester. Prediction: β₃(tester) exceeds β₃ of each expressive motive (why_connect, why_whee) in the joint model; formal test = difference in interaction coefficients (Wald, two-sided p < .05 for at least the pooled contrast of tester vs. the average of the two expressive interactions). `why_aware` is an instrumental-but-non-informational placebo: we predict its interaction is smaller than tester's and not robustly positive.
- **H4 (failed side, secondary):** (a) `learned_wrong`: tester main effect > 0. (b) `abandoned`: among failures, β(tester) > 0 and β(tester × signal) < 0 — testers abandon more, especially when the signal was weaker. One-sided p < .05; N≈400–500, so we pre-commit to interpreting magnitudes and CIs, not just significance.
- **H5 (asymmetric updating, pooled, secondary):** Piecewise-linear signal (separate slopes above/below 0, i.e., funded vs shortfall region) on `belief`, full interaction with tester: prediction = tester amplifies the positive-region slope more than the negative-region slope (good-news asymmetry). Two-sided test of the triple difference; exploratory if power is inadequate (we will report achieved power).

### What counts as support

The paper's core claim stands if H1 AND H2 hold (β₃ > 0, one-sided .05) AND H3's contrast vs expressive motives holds. H4–H5 enrich but do not gate the claim. Null results will be reported as nulls; if β₃ ≤ 0 we will write the paper around the null/contrary finding.

## 4. Pre-registered diagnostics for the leading confound

The motive is reported retrospectively (post-outcome). The leading alternative explanation is **rationalization**: outcome-dependent motive reporting. We pre-commit to these diagnostics:

1. **Reporting gradient:** Regress `tester` on `signal` + controls within the funded sample. A near-zero conditional gradient (|β| < 0.02 per log-unit, i.e., < 2pp per e-fold of overfunding) indicates motive reporting is not strongly signal-dependent where the H1/H2 interactions live. We report this regardless of result.
2. **Placebo-motive pattern (H3):** Rationalization that inflates "strategic-sounding" motives after success should also inflate `why_aware` and `why_funding` interactions; an information mechanism predicts specificity to `why_demand`.
3. **Oster (2019) bounds** on β₃ (δ = 1, Rmax = 1.3·R²) for H1 and H2.
4. **CEM robustness:** Coarsened exact matching of testers to non-testers on recat, projectyear, goal quartile, female, serial creator; re-estimate H1–H2 within the matched sample.
5. **Permutation inference:** 5,000 permutations of tester within category×year cells for H1–H2 β₃.

## 5. Analyst's priors (point predictions, locked before estimation)

- H1: β₃ ≈ +0.05 SD of belief per log-unit of signal (90% interval: 0.00 to +0.12). P(direction correct) = .70.
- H2 (index): β₃ ≈ +0.03–0.06 SD per log-unit (90% interval: −0.01 to +0.12). P(direction correct) = .65. Among components, expect ft_ever to carry the most signal; newco weakest (formation decisions are lumpy and may pre-date the campaign).
- H3: expressive-motive interactions ≈ 0 (90% interval: −0.04 to +0.04); contrast holds with P = .60.
- H4a: tester → learned_wrong ≈ +0.25 SD (P direction = .75). H4b interaction: P direction = .55 (low power).
- H5 asymmetry: P(good-news asymmetry pattern) = .55 — genuinely uncertain.
- Biggest risk to the design: tester reporting itself responds to signal (diagnostic 1 fails), in which case the paper pivots to bounding analyses and the failed-side tests, and says so plainly.

## 6. Deviations

Any deviation from this plan will be documented in a "Deviations from pre-registration" appendix in the paper, with reasons.
