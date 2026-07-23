import { govukSummary, ukResults, usResults, uswdsSummary } from "datasets/artifacts";
import { PLOT_STYLE, PlotBox, plotWidth, UsUkComparison } from "viz";
import { Callout } from "./callout";
import { Figure } from "./figure";
import { LinkCard } from "./link-card";
import { PostProse } from "./post-prose";
import { StatRow } from "./stat-row";

const PAPER_URL = "https://research.wasimarif.com/papers/design-systems-accessibility";
const US_EXPLORER_URL = "https://research.wasimarif.com/explore/uswds-a11y";
const UK_EXPLORER_URL = "https://research.wasimarif.com/explore/govuk-a11y";
const PREREG_URL =
  "https://github.com/deltoidgg/portfolio-2026/blob/main/docs/research/paper-01-design-systems-a11y/PREREGISTRATION.md";

const FRIENDLY_BANDS: Record<string, string> = {
  none: "No design system",
  trace: "A few traces",
  partial: "Partial adoption",
  likely: "Likely adopter",
  definite: "Definite adopter",
};

const usStrong = usResults.h1.strongVsNone;
const ukStrong = ukResults.h4.strongVsNone;
const comparison = ukResults.comparison;
const usDrop = Math.round((1 - usStrong.irr) * 100);
const ukDrop = Math.round((1 - ukStrong.irr) * 100);
const totalSites = uswdsSummary.meta.analysedSites + govukSummary.meta.analysedSites;

function usBand(id: string) {
  return uswdsSummary.bands.find((band) => band.band === id);
}

/** Average violations by USWDS adoption band, with blog-friendly labels. */
function AdoptionBandChart() {
  const rows = uswdsSummary.bands.map((band) => ({
    label: FRIENDLY_BANDS[band.band] ?? band.label,
    mean: band.meanViolations,
    sites: band.sites,
  }));
  const ariaLabel = `Average detected accessibility violations by USWDS adoption band: ${rows
    .map((row) => `${row.label} ${row.mean.toFixed(1)}`)
    .join("; ")}`;

  return (
    <PlotBox
      label={ariaLabel}
      render={(Plot, node) => {
        node.replaceChildren(
          Plot.plot({
            width: plotWidth(node),
            height: 250,
            marginLeft: 128,
            marginRight: 36,
            style: PLOT_STYLE,
            x: { label: "Average detected violations per homepage", grid: true },
            y: { domain: rows.map((row) => row.label), label: null },
            marks: [
              Plot.barX(rows, { y: "label", x: "mean", fill: "var(--ui-accent)", rx: 2 }),
              Plot.text(rows, {
                y: "label",
                x: "mean",
                text: (row: (typeof rows)[number]) => row.mean.toFixed(1),
                textAnchor: "start",
                dx: 6,
                fill: "var(--ui-ink-muted)",
              }),
              Plot.ruleX([0]),
            ],
          }),
        );
      }}
    />
  );
}

export function DesignSystemsAccessibilityPost() {
  const noneBand = usBand("none");
  const likelyBand = usBand("likely");
  const v3 = usResults.h2.v3VsV2;
  const ukPartial = ukResults.h4.bands.find((band) => band.label.startsWith("partial"));
  const placebos = usResults.diagnostics.placebos;
  const attenuation = usResults.diagnostics.attenuation;

  return (
    <>
      <PostProse>
        <p>
          Pick a design system and you get accessibility for free. I have heard some version of that
          line in pitch decks, conference talks, and README files for years. The components ship
          with sensible semantics, the contrast decisions are already made, and focus management is
          somebody else's solved problem. It sounds plausible. As far as I could find, nobody had
          checked it against real production websites at any serious scale.
        </p>
        <p>
          So I checked. {uswdsSummary.meta.analysedSites.toLocaleString()} US federal websites, then{" "}
          {govukSummary.meta.scannedSites.toLocaleString()} UK public sector sites I scanned myself.
          This post is the plain English version of what I found. The full treatment, with the
          pre-registration and every regression table, lives on my research site, and I will point
          you there at the end.
        </p>

        <h2 id="what-i-measured">What I measured</h2>
        <p>
          The US government runs a programme called GSA Site Scanning. It visits every known live
          federal website daily and records, among other things, two values I care about: a graded
          score for how much of the{" "}
          <a href="https://designsystem.digital.gov/">US Web Design System</a> (USWDS) each page
          uses, detected from CSS classes, asset paths, fonts, and version strings, and the number
          of accessibility violations that axe-core finds on the page.
        </p>
        <p>
          Axe-core is the engine behind Lighthouse's accessibility audit, so a violation here means
          the machine-checkable kind: missing form labels, broken contrast, bad ARIA, images without
          alt text. No scanner can tell you whether your focus order makes sense to an actual
          person. Keep that in mind for everything below. This is the floor of accessibility, not
          the ceiling.
        </p>
        <p>
          I froze a snapshot from June 2026, kept every live primary site with a completed
          accessibility scan, and grouped sites into five adoption bands, from no USWDS signal at
          all to definitely built on it.
        </p>
      </PostProse>

      <Figure
        caption={`Average axe-core violations per homepage by USWDS adoption band, across ${uswdsSummary.meta.analysedSites.toLocaleString()} live US federal websites. Raw averages, before any adjustment.`}
      >
        <AdoptionBandChart />
      </Figure>

      <PostProse>
        <p>
          The raw gradient is hard to miss. Sites with no design system signal average{" "}
          {noneBand ? noneBand.meanViolations.toFixed(1) : "6.3"} detected violations on the
          homepage; likely adopters average{" "}
          {likelyBand ? likelyBand.meanViolations.toFixed(1) : "2.4"}. Another way to see it: about
          a quarter of no-signal homepages scan completely clean, and that share climbs to roughly
          half once a site is a likely or definite adopter.
        </p>

        <h2 id="the-result">About half, once you compare like with like</h2>
        <p>
          Raw averages are where the sceptic in you should speak up, because agencies differ in
          everything: budgets, team size, how modern the stack is. So the headline number comes from
          a model that only compares sites within the same agency, and adjusts for general digital
          maturity signals like proper HTTPS, sitemaps, and modern hosting.
        </p>
        <p>
          After all of that, strong adopters still show about half the violations of non-adopters.
          The precise version: an incidence-rate ratio of {usStrong.irr.toFixed(2)}, with a 95%
          confidence interval from {usStrong.ciLow.toFixed(2)} to {usStrong.ciHigh.toFixed(2)}. The
          effect is also graded. A few traces of USWDS buy a little, partial adoption buys more, and
          the big step arrives at heavy adoption. That is the shape you would hope to see if the
          components themselves are doing the work.
        </p>
      </PostProse>

      <StatRow
        stats={[
          {
            value: `${usDrop}%`,
            label: `fewer detected violations under strong adoption, US federal sites (adjusted)`,
          },
          {
            value: `${ukDrop}%`,
            label: `fewer in the UK replication, same model, held-out data (adjusted)`,
          },
          {
            value: totalSites.toLocaleString(),
            label: "government websites analysed across the two countries",
          },
        ]}
      />

      <PostProse>
        <h2 id="better-teams">Could it just be better teams?</h2>
        <p>
          Nobody assigned design systems to agencies at random. The teams that adopt one might be
          the same teams that care about accessibility in the first place. Observational data cannot
          fully rule that out, and the paper says so plainly. But I pre-registered three checks
          designed to break the result, and it survived all three.
        </p>
        <ul>
          <li>
            <strong>The within-agency estimate barely moved.</strong> If team quality explained
            everything, the association should collapse once you stop comparing across agencies and
            only compare each agency's sites with each other. It shrank by about{" "}
            {Math.round(attenuation.shrinkagePct)}% and then held.
          </li>
          <li>
            <strong>Placebo outcomes stayed flat.</strong> Teams that are simply better at
            engineering should also be visibly better at performance. They are not. The adoption
            gradient on accessibility is steep ({placebos.a11yBetaStd.toFixed(2)} standard
            deviations), while the same model pointed at layout shift and load speed finds roughly
            nothing ({placebos.clsBetaStd > 0 ? "+" : ""}
            {placebos.clsBetaStd.toFixed(2)} and {placebos.lcpBetaStd.toFixed(2)}).
          </li>
          <li>
            <strong>Selection bounds.</strong> There is a standard method, Oster's, that asks how
            strong an unobserved team-quality effect would need to be to wipe the result out. The
            answer is: stronger than everything I did control for, combined. Even then the estimate
            stays clearly negative.
          </li>
        </ul>
      </PostProse>

      <Callout title="Honest label">
        This is still a correlation. The claim is not that adopting USWDS causes exactly half the
        violations to disappear. The claim is that the association is real at estate scale, that the
        obvious confounders do not explain it, and that it points the same way every way I could
        slice it.
      </Callout>

      <PostProse>
        <h2 id="replication">Then I tested it on a country the model had never seen</h2>
        <p>
          Find a pattern in one dataset and you should worry you have quietly tuned your analysis to
          it. So before touching any UK data, I wrote the entire UK analysis down: the detector, the
          model, the hypotheses, and a pass-or-fail rule saying the UK estimate had to land within
          0.20 of the US one. I locked all of it in a public pre-registration. Only then did I scan{" "}
          {govukSummary.meta.scannedSites.toLocaleString()} UK public sector websites, central
          government, local councils, parish councils, and the NHS, in one afternoon. The detector
          looks for <a href="https://design-system.service.gov.uk/">govuk-frontend</a>, the design
          system behind GOV.UK, scored as a component-for-component mirror of how GSA scores USWDS.
        </p>
        <p>
          One shot, no peeking. {govukSummary.meta.analysedSites.toLocaleString()} sites survived
          deduplication and quality filters, and the UK answer came back: {ukDrop}% fewer violations
          for strong adopters, an incidence-rate ratio of {ukStrong.irr.toFixed(2)} against the US
          value of {comparison.usIrr.toFixed(2)}. It landed {comparison.absDiff.toFixed(2)} away,
          well inside the window I had committed to.
        </p>
      </PostProse>

      <Figure
        caption={`The US estimate with the pre-registered window of ±${comparison.window.toFixed(2)} (shaded), and the held-out UK estimate with its 95% confidence interval. Values below 1 mean fewer violations than the no-adoption baseline.`}
      >
        <UsUkComparison
          usIrr={comparison.usIrr}
          ukEstimate={ukStrong}
          window={comparison.window}
          usLabel="United States"
          ukLabel="United Kingdom"
        />
      </Figure>

      <PostProse>
        <h2 id="what-failed">What did not go my way</h2>
        <p>Three predictions missed, and they are the most useful part of the study.</p>
        <ul>
          <li>
            <strong>USWDS v3 is not measurably better than v2.</strong> I expected the newer major
            version to show fewer violations. The point estimate goes the wrong way (
            {v3.irr.toFixed(2)}) with a confidence interval wide enough ({v3.ciLow.toFixed(2)} to{" "}
            {v3.ciHigh.toFixed(2)}) to call it a wash. On this evidence the win is adopting a system
            at all, not chasing version upgrades.
          </li>
          <li>
            <strong>The UK partial-adoption band is a mess.</strong> Sites with a medium detection
            score showed about {ukPartial ? ukPartial.irr.toFixed(1) : "4.0"} times the violations
            of non-adopters. On inspection the band holds only 39 sites, mostly CMS templates that
            sprinkle govuk-frontend class names onto markup that is not really the design system.
            The detector reads partial adoption; reality is a site wearing the costume.
          </li>
          <li>
            <strong>My mechanism prediction failed.</strong> I predicted the violation categories
            that components handle directly, contrast, ARIA, labels, would improve more than
            page-level ones like landmarks and document structure. No meaningful difference. The
            data declined to confirm my mental model of why the effect exists, which is worth
            knowing too.
          </li>
        </ul>

        <h2 id="engineering-takeaways">What I would take from it as an engineer</h2>
        <ol>
          <li>
            If you are weighing bespoke UI against a mature design system, accessibility is now a
            measurable argument rather than a bullet point of faith. Roughly half the automated
            violation count, twice, in two countries, on over{" "}
            {Math.floor(totalSites / 1000).toLocaleString()},000 production sites.
          </li>
          <li>
            Partial adoption is where the trouble hides. A handful of design system classes on a CMS
            theme can look like adoption to tooling and deliver none of the benefit. If you adopt,
            adopt properly: the components, not just the class names.
          </li>
          <li>
            The floor is cheap to measure. My scan of{" "}
            {govukSummary.meta.scannedSites.toLocaleString()} sites took one afternoon on one laptop
            with open tooling, and your estate is smaller than a country's. Point axe-core at it.
            Just remember that passing the scanner is the start of accessibility work, not the end
            of it.
          </li>
        </ol>

        <h2 id="dig-deeper">Dig deeper</h2>
        <p>
          Everything above is the conversational version of a pre-registered study whose data, code,
          and locked hypotheses are public. If you want the regression tables, the diagnostics, or
          you would rather interrogate the data yourself, start here.
        </p>
      </PostProse>

      <LinkCard
        href={PAPER_URL}
        title="Read the full paper"
        description="Do design systems deliver accessibility at scale? Methods, every estimate, the diagnostics, and the parts that did not replicate, reported as found."
      />

      <PostProse>
        <ul>
          <li>
            <a href={PREREG_URL}>The pre-registration</a>, locked before any estimation ran.
          </li>
          <li>
            Explore the data in your browser: <a href={US_EXPLORER_URL}>US federal sites</a> and{" "}
            <a href={UK_EXPLORER_URL}>UK public sector sites</a>. Queries run locally with DuckDB,
            and the raw Parquet files are downloadable from the paper page.
          </li>
        </ul>
      </PostProse>
    </>
  );
}
