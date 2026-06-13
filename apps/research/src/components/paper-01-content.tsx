import { Link } from "@tanstack/react-router";
import { IconExternalLink } from "@tabler/icons-react";
import { DataTable, Prose, Section, Stat, type DataTableColumn } from "ui";
import type { Estimate } from "datasets";
import { uswdsSummary } from "../content/papers";
import { govukSummary, ukResults, usResults } from "datasets/artifacts";
import { BandGradient, CategoryDotPlot, ForestPlot, UsUkComparison, type GradientPoint } from "viz";

const GITHUB = "https://github.com/deltoidgg/portfolio-2026/blob/main";
const PAPER_DOCS = `${GITHUB}/docs/research/paper-01-design-systems-a11y`;

const CATEGORY_LABELS: Record<string, string> = {
  contrast: "Colour contrast",
  aria: "ARIA usage",
  images: "Image alternatives",
  "link-purpose": "Link purpose",
  "user-control-name": "Control names",
  lists: "List structure",
  "page-titled": "Page titles",
  "form-names": "Form labels",
  "frames-iframes": "Frame titles",
  "keyboard-access": "Keyboard access",
  language: "Document language",
};

function fmtIrr(estimate: Estimate): string {
  return `${estimate.irr.toFixed(2)} (95% CI ${estimate.ciLow.toFixed(2)}–${estimate.ciHigh.toFixed(2)})`;
}

function fmtP(p: number): string {
  if (p < 0.001) return "p < .001";
  return `p = ${p.toFixed(3).replace(/^0/, "")}`;
}

function pctChange(irr: number): string {
  const change = Math.round((irr - 1) * 100);
  return change <= 0 ? `${change}%` : `+${change}%`;
}

function ExternalA({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

const estimateColumns: Array<DataTableColumn<Estimate>> = [
  { id: "label", header: "Contrast", render: (row) => row.label },
  { id: "irr", header: "IRR", align: "right", render: (row) => row.irr.toFixed(3) },
  {
    id: "ci",
    header: "95% CI",
    align: "right",
    render: (row) => `${row.ciLow.toFixed(3)} – ${row.ciHigh.toFixed(3)}`,
  },
  {
    id: "p",
    header: "One-sided p",
    align: "right",
    render: (row) => (row.pOneSided < 0.001 ? "<.001" : row.pOneSided.toFixed(3)),
  },
  { id: "n", header: "N", align: "right", render: (row) => row.n.toLocaleString() },
];

function FigureCaption({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-ink-subtle mt-3 leading-relaxed">{children}</p>;
}

export function Paper01Content() {
  return (
    <>
      <IntroductionSection />
      <DataSection />
      <MethodsSection />
      <UsResultsSection />
      <DiagnosticsSection />
      <UkReplicationSection />
      <LimitationsSection />
      <DeviationsSection />
      <DownloadsSection />
    </>
  );
}

function IntroductionSection() {
  return (
    <Section title="1. Introduction">
      <Prose>
        <p>
          Design systems are the largest coordinated investment in front-end quality that
          governments and large organisations make. Their maintainers increasingly sell them on
          accessibility: components ship with semantics, focus management, labelled controls, and
          contrast decisions already made, so teams &ldquo;inherit&rdquo; conformance instead of
          re-deriving it. The US Web Design System (USWDS) is mandated guidance for federal agencies
          under 21st Century IDEA; the GOV.UK Design System tells UK service teams it helps them{" "}
          <ExternalA href="https://designnotes.blog.gov.uk/2024/02/14/get-to-wcag-2-2-faster-with-the-gov-uk-design-system/">
            &ldquo;get to WCAG 2.2 faster&rdquo;
          </ExternalA>
          . That promise is plausible, widely repeated — and has never been quantified at estate
          scale.
        </p>
        <p>
          This paper asks a narrow, answerable version of the question:{" "}
          <strong>
            is graded design-system adoption associated with fewer automatically detectable
            accessibility violations on production government websites?
          </strong>{" "}
          We estimate the association twice, in two countries, under a pre-registered protocol:
          first on ~12,000 US federal websites whose USWDS adoption and axe-core violations are
          scanned daily by GSA&rsquo;s Site Scanning programme, then — with the specification frozen
          — once on a held-out replication sample of UK public-sector websites that we scanned
          ourselves with an openly specified govuk-frontend detector and the same violation
          taxonomy.
        </p>
        <p>
          The design follows the discovery/confirmation split used in quantitative social science.
          Descriptive patterns were explored on the US snapshot; hypotheses, exact model
          specifications, decision rules, and the analyst&rsquo;s priors were then locked in a
          public <ExternalA href={`${PAPER_DOCS}/PREREGISTRATION.md`}>pre-registration</ExternalA>{" "}
          before any confirmatory estimate was computed, and before a single UK site was scanned.
          The UK scan recipe — domain sources, detection weights, band boundaries, violation mapping
          — was committed before data collection, so the replication could not be tuned to the data
          it would meet. Automated checks (axe-core) capture only a machine-detectable subset of
          accessibility; that floor is precisely what design systems claim to raise, which makes it
          the right yardstick for this question.
        </p>
      </Prose>
    </Section>
  );
}

const usBandColumns: Array<DataTableColumn<(typeof uswdsSummary.bands)[number]>> = [
  { id: "label", header: "USWDS adoption", render: (row) => row.label },
  { id: "sites", header: "Sites", align: "right", render: (row) => row.sites.toLocaleString() },
  {
    id: "mean",
    header: "Mean violations",
    align: "right",
    render: (row) => row.meanViolations.toFixed(2),
  },
  {
    id: "median",
    header: "Median",
    align: "right",
    render: (row) => row.medianViolations.toFixed(0),
  },
  {
    id: "zero",
    header: "Violation-free",
    align: "right",
    render: (row) => `${(row.zeroShare * 100).toFixed(1)}%`,
  },
];

function DataSection() {
  const govukBandRows = govukSummary.bands;
  return (
    <Section title="2. Data">
      <Prose>
        <h3>2.1 United States — GSA Site Scanning</h3>
        <p>
          The discovery sample is a frozen snapshot of the{" "}
          <ExternalA href="https://open.gsa.gov/api/site-scanning-api/">
            GSA Site Scanning programme
          </ExternalA>
          , which scans every known live federal .gov/.mil website daily. One row per live primary
          website with a completed accessibility scan and non-missing agency:{" "}
          {uswdsSummary.meta.analysedSites.toLocaleString()} sites across 100+ agencies. The
          exposure is <code>uswds_count</code>, GSA&rsquo;s graded USWDS detection score (CSS class
          prefixes, asset paths, fonts, favicon, version strings), banded as none (0), trace (1–24),
          partial (25–49), likely (50–99), definite (100+); &ldquo;strong&rdquo; adoption means a
          score ≥ 50. The outcome is <code>violations_total</code>, the sum of axe-core violations
          across GSA&rsquo;s tracked categories on the scanned page, with 11 category-level counts
          retained.
        </p>
      </Prose>
      <div className="my-6">
        <DataTable
          caption={`USWDS adoption vs detected accessibility violations, ${uswdsSummary.meta.analysedSites.toLocaleString()} live federal websites (snapshot ${uswdsSummary.meta.snapshotDate.slice(0, 10)}). Unadjusted means — the motivating gradient, not the confirmatory estimate.`}
          columns={usBandColumns}
          rows={[...uswdsSummary.bands]}
          getRowKey={(row) => row.band}
        />
      </div>
      <Prose>
        <h3>2.2 United Kingdom — a new scan, collected for this paper</h3>
        <p>
          No UK equivalent of Site Scanning publishes per-site data, so we built one. Following the
          frozen <ExternalA href={`${PAPER_DOCS}/UK_SCAN_RECIPE.md`}>UK scan recipe</ExternalA>, we
          scanned the homepage of every reachable site in a universe assembled from the official{" "}
          <code>.gov.uk</code> domains register, the mySociety local-authority register, NHS trust
          websites (via Wikidata), and a curated devolved-government list. Each site was loaded in
          headless Chromium, classified into one of five organisation types (central, local
          authority, parish &amp; town, NHS, devolved), scored with a govuk-frontend detector that
          mirrors GSA&rsquo;s <code>uswds_count</code> formula component-for-component (same
          weights, caps, and band boundaries), and audited with the same axe-core ruleset mapped to
          GSA&rsquo;s category names. Detection correctness was verified against a pre-declared
          24-site calibration set, excluded from analysis.
        </p>
        <p>
          The frozen UK artifact covers{" "}
          <strong>{govukSummary.meta.analysedSites.toLocaleString()}</strong> completed,
          deduplicated sites (of {govukSummary.meta.scannedSites.toLocaleString()} scan attempts),
          scanned {govukSummary.meta.scanWindow}.
        </p>
      </Prose>
      <div className="my-6">
        <DataTable
          caption={`govuk-frontend adoption vs detected accessibility violations, ${govukSummary.meta.analysedSites.toLocaleString()} UK public-sector websites. Unadjusted means.`}
          columns={usBandColumns as Array<DataTableColumn<(typeof govukBandRows)[number]>>}
          rows={[...govukBandRows]}
          getRowKey={(row) => row.band}
        />
      </div>
    </Section>
  );
}

function MethodsSection() {
  return (
    <Section title="3. Methods">
      <Prose>
        <p>
          All confirmatory models are Poisson quasi-maximum-likelihood (PPML) regressions of
          violation counts, with standard errors clustered at the organisation level. PPML is
          consistent for the conditional mean under overdispersion and handles the long right tail
          of violation counts without dropping the roughly one-third of sites that have zero
          violations.
        </p>
        <ul>
          <li>
            <strong>H1 (dose–response, primary, US):</strong>{" "}
            <code>violations_total ~ ln(1 + uswds_count) + controls + agency FE</code>, β &lt; 0 at
            one-sided p &lt; .05; in the banded form, IRR(strong vs none) &lt; 1 with band IRRs
            weakly monotone non-increasing from none → likely.
          </li>
          <li>
            <strong>H2 (version contrast, US):</strong> among the ~900 sites with a detected
            semantic version, v3 vs v2 within adopters, same controls and fixed effects.
          </li>
          <li>
            <strong>H3 (category specificity, US):</strong> the H1 model estimated separately per
            violation category; prediction that the mean standardized gradient is more negative for
            component-mediated categories (contrast, ARIA, form labels, control names, link purpose,
            keyboard access) than template/content-mediated ones (language, page titles, images,
            lists, frames). Tested with a 2,000-draw cluster bootstrap over agencies.
          </li>
          <li>
            <strong>H4 (held-out UK replication, gating):</strong> the frozen specification applied
            once to the UK artifact — exposure <code>govuk_count</code>, organisation-type fixed
            effects, HTTPS-hygiene and page-complexity controls, SEs clustered by registrant
            organisation. Prediction: IRR(strong vs none) &lt; 1, one-sided p &lt; .05, and the UK
            IRR within ±0.20 of the US IRR.
          </li>
        </ul>
        <p>
          Controls in the US models: Digital Analytics Program participation (maturity proxy),
          security-hygiene index (HTTPS enforcement + HSTS), viewport meta tag, asinh of the
          third-party service count, and CMS indicators. The paper&rsquo;s core claim stands only if{" "}
          <strong>H1 and H4 both hold</strong>; H2 and H3 enrich the mechanism story but do not gate
          it. Exact decision rules, priors, and six pre-registered diagnostics are in the{" "}
          <ExternalA href={`${PAPER_DOCS}/PREREGISTRATION.md`}>locked pre-registration</ExternalA>.
        </p>
      </Prose>
    </Section>
  );
}

function UsResultsSection() {
  const { h1, h2, h3, meta } = usResults;
  const bandIrrById = new Map(
    h1.bands.map((estimate) => [estimate.label.split(" ")[0] ?? "", estimate]),
  );
  const gradientPoints: GradientPoint[] = uswdsSummary.bands.map((band) => ({
    band: band.label,
    unadjustedMean: band.meanViolations,
    adjustedIrr: band.band === "none" ? 1 : (bandIrrById.get(band.band)?.irr ?? null),
  }));
  const categoryPoints = h3.categories.map((category) => ({
    category: CATEGORY_LABELS[category.category] ?? category.category,
    mechanism: category.mechanism,
    betaStd: category.betaStd,
    se: category.se,
  }));

  return (
    <Section
      title="4. Results — United States"
      description={`Confirmatory estimates from the frozen snapshot (${meta.nAnalysis.toLocaleString()} sites, ${meta.nClusters.toLocaleString()} agency clusters, ${meta.bootstrapDraws.toLocaleString()}-draw cluster bootstrap, seed ${meta.seed}).`}
    >
      <Prose>
        <h3>H1 — Dose–response</h3>
        <p>
          The continuous gradient is {h1.continuous.beta < 0 ? "negative" : "positive"}: each unit
          of ln(1 + uswds_count) is associated with an IRR of {fmtIrr(h1.continuous)} (
          {fmtP(h1.continuous.pOneSided)}, one-sided), holding agency and maturity controls fixed.
          Strong adoption (score ≥ 50) versus everything below that threshold gives IRR{" "}
          {fmtIrr(h1.strongVsNone)} — {pctChange(h1.strongVsNone.irr)} detected violations —{" "}
          {fmtP(h1.strongVsNone.pOneSided)}; the none-referenced band contrasts say the same thing
          (likely {bandIrrById.get("likely")?.irr.toFixed(2)}, definite{" "}
          {bandIrrById.get("definite")?.irr.toFixed(2)}; see appendix D3 on this
          operationalization). Band IRRs are{" "}
          {h1.monotoneNoneToLikely ? "weakly monotone non-increasing" : "not monotone"} from none to
          likely. H1 is <strong>{h1.supported ? "supported" : "not supported"}</strong> under the
          pre-registered decision rule.
        </p>
      </Prose>
      <div className="my-6">
        <ForestPlot
          title="Adjusted IRRs by adoption band (agency FE)"
          estimates={[...h1.bands, h1.strongVsNone]}
        />
        <FigureCaption>
          Figure 1 — Incidence-rate ratios vs the no-signal band, from the banded H1 PPML model with
          agency fixed effects and maturity controls. Bars are 95% CIs; the dashed line marks no
          association.
        </FigureCaption>
      </div>
      <div className="my-6">
        <BandGradient points={gradientPoints} />
        <FigureCaption>
          Figure 2 — The unadjusted dose–response gradient (top) and what survives within-agency
          adjustment (bottom). The &ldquo;none&rdquo; band is the reference (IRR 1.0).
        </FigureCaption>
      </div>
      <Prose>
        <h3>H2 — Version contrast</h3>
        <p>
          Among sites with a detected semantic version, USWDS v3 vs v2 gives IRR {fmtIrr(h2.v3VsV2)}{" "}
          ({fmtP(h2.v3VsV2.pOneSided)}, one-sided; N = {h2.v3VsV2.n.toLocaleString()}). H2 is{" "}
          <strong>{h2.supported ? "supported" : "not supported"}</strong>; as pre-registered, we
          interpret the IRR and CI rather than the p-value alone given the small contrast sample.
        </p>
        <h3>H3 — Category specificity</h3>
        <p>
          Across the 11 violation categories, the mean standardized adoption gradient is{" "}
          {h3.meanComponentBetaStd.toFixed(3)} for component-mediated categories and{" "}
          {h3.meanTemplateBetaStd.toFixed(3)} for template/content-mediated ones (difference{" "}
          {h3.diff.toFixed(3)}, one-sided {fmtP(h3.pOneSided)} from the agency-cluster bootstrap).
          H3 is <strong>{h3.supported ? "supported" : "not supported"}</strong>.
        </p>
      </Prose>
      <div className="my-6">
        <CategoryDotPlot points={categoryPoints} />
        <FigureCaption>
          Figure 3 — Standardized PPML coefficients (per SD of ln-adoption) for each violation
          category, classified before estimation as component-mediated or template/content-mediated.
          Bars are 95% CIs.
        </FigureCaption>
      </div>
      <div className="my-6">
        <DataTable
          caption="Table 2 — Headline US confirmatory estimates."
          columns={estimateColumns}
          rows={[h1.continuous, h1.strongVsNone, ...h1.bands, h2.v3VsV2]}
          getRowKey={(row) => row.label}
        />
      </div>
    </Section>
  );
}

function DiagnosticsSection() {
  const d = usResults.diagnostics;
  const negbin = d.functionalForm.negbinStrongVsNone;

  return (
    <Section
      title="5. Diagnostics & robustness"
      description="Six diagnostics, all pre-registered, probing whether the association reflects adoption rather than the kind of team that adopts."
    >
      <Prose>
        <ol>
          <li>
            <strong>Who adopts?</strong> Regressing adoption on the maturity proxies shows the
            expected self-selection:{" "}
            {d.adoptionOnMaturity.terms
              .map(
                (term) =>
                  `${term.term} ${term.coef >= 0 ? "+" : ""}${term.coef.toFixed(3)} (${fmtP(term.pTwoSided)})`,
              )
              .join("; ")}
            {d.adoptionOnMaturity.r2Within !== null
              ? ` — within-agency R² ${d.adoptionOnMaturity.r2Within.toFixed(3)}.`
              : "."}{" "}
            Adoption is not random; the remaining diagnostics ask whether that selection explains
            the H1 gradient.
          </li>
          <li>
            <strong>Placebo outcomes.</strong> The standardized accessibility gradient (
            {d.placebos.a11yBetaStd.toFixed(3)}) is{" "}
            {d.placebos.exceedsCls && d.placebos.exceedsLcp ? "larger" : "not larger"} in magnitude
            than the placebo gradients on layout shift ({d.placebos.clsBetaStd.toFixed(3)},{" "}
            {fmtP(d.placebos.pVsCls)}) and load time ({d.placebos.lcpBetaStd.toFixed(3)},{" "}
            {fmtP(d.placebos.pVsLcp)}).{" "}
            {d.placebos.exceedsCls && d.placebos.exceedsLcp
              ? `A generic good-teams confound that improves everything equally does not explain the accessibility-specific gradient${
                  Math.max(d.placebos.pVsCls, d.placebos.pVsLcp) >= 0.05
                    ? ", though one of the bootstrap comparisons is borderline and we flag it as such"
                    : ""
                }.`
              : "Comparable placebo gradients indicate a generic quality confound; per the pre-registration this weakens a causal reading."}
          </li>
          <li>
            <strong>Pooled vs within-agency.</strong> The pooled IRR (
            {d.attenuation.pooledIrr.toFixed(2)}) attenuates to {d.attenuation.feIrr.toFixed(2)}{" "}
            under agency fixed effects — {Math.round(d.attenuation.shrinkagePct)}% of the distance
            to the null.{" "}
            {d.attenuation.collapsed
              ? "By the pre-registered threshold (>75%), the association is primarily between-agency infrastructure rather than site-level adoption, and the abstract says so."
              : "Below the pre-registered 75% collapse threshold: a within-agency, site-level association survives."}
          </li>
          <li>
            <strong>Oster bounds.</strong> Moving from no controls (β ={" "}
            {d.oster.betaUncontrolled.toFixed(3)}, R² = {d.oster.r2Uncontrolled.toFixed(3)}) to the
            full specification (β = {d.oster.betaControlled.toFixed(3)}, R² ={" "}
            {d.oster.r2Controlled.toFixed(3)}) gives δ = {d.oster.delta.toFixed(2)} and a
            bias-adjusted β* = {d.oster.betaStar.toFixed(3)} at Rmax = {d.oster.rmax.toFixed(2)}.{" "}
            {d.oster.boundsExcludeZero
              ? "Unobservables would need to be implausibly stronger than the observed controls to drive the estimate to zero."
              : "The bounds include zero: selection on unobservables comparable to the observed controls could account for the estimate."}
          </li>
          <li>
            <strong>DAP subset.</strong> Within Digital Analytics Program participants — a uniformly
            &ldquo;engaged&rdquo; subsample — the continuous gradient is IRR {fmtIrr(d.dapSubset)} (
            {fmtP(d.dapSubset.pOneSided)}, N = {d.dapSubset.n.toLocaleString()}).
          </li>
          <li>
            <strong>Functional form.</strong>{" "}
            {negbin
              ? `A negative-binomial fit of the strong-vs-none contrast gives IRR ${fmtIrr(negbin)}.`
              : "The negative-binomial fit did not converge under fixed effects (reported as such)."}{" "}
            Winsorizing the outcome at the 99th percentile gives{" "}
            {fmtIrr(d.functionalForm.winsorizedContinuous)} for the continuous term. The banded and
            continuous forms{" "}
            {d.functionalForm.bandedConsistentWithContinuous ? "agree" : "disagree"} in direction
            and ordering.
          </li>
        </ol>
      </Prose>
    </Section>
  );
}

function UkReplicationSection() {
  const { h4, comparison, meta } = ukResults;
  const partialBand = h4.bands.find((band) => band.label.startsWith("partial"));

  return (
    <Section
      title="6. The held-out UK replication"
      description={`The frozen specification, applied exactly once to data that did not exist when it was locked (${meta.nAnalysis.toLocaleString()} sites, ${meta.nClusters.toLocaleString()} organisation clusters).`}
    >
      <Prose>
        <p>
          Strong govuk-frontend adoption versus everything below the strong threshold gives IRR{" "}
          {fmtIrr(h4.strongVsNone)} ({fmtP(h4.strongVsNone.pOneSided)}, one-sided), with
          organisation-type fixed effects and the pre-registered controls — the same contrast
          construction as the US headline, keeping the comparison window like-for-like. The
          continuous gradient is {fmtIrr(h4.continuous)} per unit of ln(1 + govuk_count). The
          direction prediction {h4.directionSupported ? "replicates" : "does not replicate"}.
        </p>
        <p>
          The pre-registered magnitude window asked whether the UK IRR lands within ±
          {comparison.window.toFixed(2)} of the US estimate. US: {comparison.usIrr.toFixed(2)}; UK:{" "}
          {comparison.ukIrr.toFixed(2)}; absolute difference {comparison.absDiff.toFixed(2)} —{" "}
          <strong>{comparison.withinWindow ? "within" : "outside"} the window</strong>. H4 is{" "}
          <strong>{ukResults.supported ? "supported" : "not supported"}</strong> under the locked
          decision rule
          {ukResults.supported
            ? ", so the paper's gating claim (H1 ∧ H4) stands."
            : "; per the pre-registration, the US association did not transfer in full and the paper says so plainly."}
        </p>
      </Prose>
      <div className="my-6">
        <UsUkComparison
          usIrr={comparison.usIrr}
          ukEstimate={h4.strongVsNone}
          window={comparison.window}
        />
        <FigureCaption>
          Figure 4 — Strong-adoption IRRs, US (agency FE) and UK (organisation-type FE). The shaded
          band is the pre-registered ±{comparison.window.toFixed(2)} replication window around the
          US estimate.
        </FigureCaption>
      </div>
      <div className="my-6">
        <DataTable
          caption="Table 3 — UK confirmatory estimates (H4)."
          columns={estimateColumns}
          rows={[h4.continuous, h4.strongVsNone, ...h4.bands]}
          getRowKey={(row) => row.label}
        />
      </div>
      {partialBand && partialBand.irr > 1 ? (
        <Prose>
          <p>
            One band breaks the pattern, and it is the one the pre-registration flagged as the
            riskiest: <strong>partial</strong> adoption (score 25–49) shows IRR{" "}
            {fmtIrr(partialBand)} — <em>more</em> violations than the none band. This is the
            &ldquo;council CMS noise&rdquo; stratum: platforms that embed fragments of
            govuk-frontend styling without its components land here, disproportionately local
            authorities and parish-council CMS products whose underlying templates differ from
            genuine adopters in every other way too. The dose–response claim in the UK is carried by
            the likely and definite bands — sites where detection is unambiguous — exactly as the
            structural score construction intends. We report the reversal rather than smooth it; it
            is the clearest single illustration of why band-level detection noise is listed as a
            limitation.
          </p>
        </Prose>
      ) : null}
    </Section>
  );
}

function LimitationsSection() {
  return (
    <Section title="7. Limitations">
      <Prose>
        <ul>
          <li>
            <strong>Observational throughout.</strong> No agency or council was randomized into
            adoption. The diagnostics bound, but cannot eliminate, selection: teams that adopt a
            design system differ from teams that don&rsquo;t in ways the maturity proxies only
            partly capture.
          </li>
          <li>
            <strong>Automated detection is a floor, not a ceiling.</strong> axe-core catches roughly
            a third to a half of WCAG failures and almost nothing about task completion, cognitive
            load, or assistive-technology usability. &ldquo;Fewer detected violations&rdquo; is the
            claim design systems make mechanically; it is not the same as &ldquo;accessible&rdquo;.
          </li>
          <li>
            <strong>Homepage-only sampling (UK).</strong> GSA scans primary URLs; our UK scan
            mirrors that. Homepages are disproportionately design-system shells; deep transactional
            pages may behave differently.
          </li>
          <li>
            <strong>Detection noise.</strong> <code>uswds_count</code> and <code>govuk_count</code>{" "}
            measure observable adoption signals, not true component usage; JS-heavy sites and
            councils on CMS platforms with partial govuk styling blur the bands. Measurement error
            of this kind generally attenuates gradients toward zero.
          </li>
          <li>
            <strong>Two estates, one regime each.</strong> Both samples are government estates under
            accessibility law (Section 508; PSBAR 2018). Generalisation to commercial design systems
            is conjecture until tested.
          </li>
        </ul>
      </Prose>
    </Section>
  );
}

function DeviationsSection() {
  return (
    <Section
      title="Appendix — Deviations from the pre-registration"
      description="Every departure from the locked protocol, logged before the confirmatory analyses ran. Full log in the repository."
    >
      <Prose>
        <ul>
          <li>
            <strong>D1 — Calibration-list repair (before any analysis).</strong> Eight of the 24
            pre-declared calibration entries were wrong about the world, not about the detector:
            dead hostnames, WAF-blocked sites, and two sites whose adoption status was mislabelled.
            They were replaced with verified equivalents; no detector weights, thresholds, or band
            boundaries changed. The detector then passed 12/12 known adopters and 12/12
            non-adopters.
          </li>
          <li>
            <strong>D2 — www fallback for apex connection failures (during the scan).</strong> Many
            UK estates serve only the <code>www.</code> host while the apex domain refuses
            connections. Where an apex attempt failed at connection level, the scanner retried once
            with the <code>www.</code> prefix and flagged the row (<code>used_www_fallback</code>).
            This mirrors the redirect-following behaviour GSA&rsquo;s scanner gets for free and was
            adopted before any outcome data was examined.
          </li>
          <li>
            <strong>
              D3 — Labelling of the headline contrast (after the US run, before any UK estimation).
            </strong>{" "}
            The single-number &ldquo;strong&rdquo; contrast was implemented as a binary ≥ 50 dummy,
            whose reference group is every site below 50 — not literally the none band. The
            pre-registered banded model, estimated alongside, gives the none-referenced IRRs
            directly and they bracket the dummy estimate, so nothing turns on the choice. Labels and
            prose were corrected to say &ldquo;vs below-50&rdquo;; no model, sample, or decision
            rule changed.
          </li>
        </ul>
        <p>
          <ExternalA href={`${PAPER_DOCS}/DEVIATIONS.md`}>Full deviations log</ExternalA>.
        </p>
      </Prose>
    </Section>
  );
}

function DownloadsSection() {
  const items: Array<{ label: string; href: string; note: string; external?: boolean }> = [
    {
      label: "US dataset (Parquet)",
      href: "/data/uswds_a11y.parquet",
      note: `${uswdsSummary.meta.analysedSites.toLocaleString()} federal websites, one row per site`,
    },
    {
      label: "UK dataset (Parquet)",
      href: "/data/govuk_a11y.parquet",
      note: `${govukSummary.meta.analysedSites.toLocaleString()} UK public-sector websites, collected for this paper`,
    },
    {
      label: "US confirmatory results (JSON)",
      href: `${GITHUB}/data/results/paper-01/us-confirmatory.json`,
      note: "Exact estimates behind every US figure",
      external: true,
    },
    {
      label: "UK confirmatory results (JSON)",
      href: `${GITHUB}/data/results/paper-01/uk-confirmatory.json`,
      note: "Exact estimates behind the replication section",
      external: true,
    },
    {
      label: "Pre-registration (locked)",
      href: `${PAPER_DOCS}/PREREGISTRATION.md`,
      note: "Hypotheses, exact tests, priors, freezing protocol — locked before estimation",
      external: true,
    },
    {
      label: "UK scan recipe (frozen)",
      href: `${PAPER_DOCS}/UK_SCAN_RECIPE.md`,
      note: "Domain sources, detection weights, violation mapping — committed before scanning",
      external: true,
    },
    {
      label: "Analysis code",
      href: `${GITHUB}/tools/analysis`,
      note: "Python (pyfixest) scripts that produced the results artifacts",
      external: true,
    },
  ];

  return (
    <Section
      title="Downloads & reproducibility"
      description="Every figure traces to a versioned artifact. The Parquet files are the same ones the in-browser explorers query."
    >
      <ul className="space-y-3 text-sm">
        {items.map((item) => (
          <li key={item.label}>
            <a
              href={item.href}
              {...(item.external ? { target: "_blank", rel: "noreferrer" } : {})}
              className="inline-flex items-center gap-1.5 text-accent-ink underline underline-offset-2 hover:text-accent"
            >
              {item.label}
              {item.external ? <IconExternalLink size={14} aria-hidden="true" /> : null}
            </a>{" "}
            <span className="text-ink-muted">— {item.note}</span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-ink-muted mt-6">
        Explore both datasets interactively:{" "}
        <Link
          to="/explore/$dataset"
          params={{ dataset: "uswds-a11y" }}
          className="text-accent-ink underline underline-offset-2 hover:text-accent"
        >
          US explorer
        </Link>{" "}
        ·{" "}
        <Link
          to="/explore/$dataset"
          params={{ dataset: "govuk-a11y" }}
          className="text-accent-ink underline underline-offset-2 hover:text-accent"
        >
          UK explorer
        </Link>
        . Queries run in your browser with DuckDB-WASM; nothing is logged.
      </p>
    </Section>
  );
}

/** Headline stats for the paper header, computed from the frozen artifacts. */
export function Paper01Stats() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-y border-edge py-6 mb-12">
      <Stat
        value={uswdsSummary.meta.analysedSites.toLocaleString()}
        label="US federal websites analysed"
      />
      <Stat
        value={govukSummary.meta.analysedSites.toLocaleString()}
        label="UK public-sector websites scanned"
      />
      <Stat
        value={pctChange(usResults.h1.strongVsNone.irr)}
        label="US violations under strong adoption (adjusted)"
      />
      <Stat
        value={pctChange(ukResults.h4.strongVsNone.irr)}
        label="UK replication, same contrast (adjusted)"
      />
    </div>
  );
}
