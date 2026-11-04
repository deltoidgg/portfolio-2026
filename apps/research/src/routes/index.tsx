import { IconArrowRight, IconArrowUpRight } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { govukSummary, ukResults, usResults, uswdsSummary } from "datasets/artifacts";
import { datasetRegistry } from "../content/datasets";
import { formatPaperDate, papers } from "../content/papers";
import { buildResearchMetadata, SITE_NAME } from "../lib/metadata";

const description =
  "Pre-registered research on design systems and web accessibility, with open data, analysis code and in-browser data explorers.";

const REPO = "https://github.com/deltoidgg/portfolio-2026";
const PAPER_DOCS = `${REPO}/blob/main/docs/research/paper-01-design-systems-a11y`;

export const Route = createFileRoute("/")({
  head: () => buildResearchMetadata({ title: SITE_NAME, description, path: "/" }),
  component: LabIndex,
});

const methodDocuments = [
  {
    title: "Pre-registration",
    copy: "Hypotheses, model specifications, decision rules and priors, locked before any confirmatory estimate.",
    href: `${PAPER_DOCS}/PREREGISTRATION.md`,
  },
  {
    title: "Data freeze record",
    copy: "Which snapshot was analysed, how it was filtered and when it was frozen.",
    href: `${PAPER_DOCS}/DATA_FREEZE.md`,
  },
  {
    title: "UK scan recipe",
    copy: "Domain sources, detection weights, band boundaries and violation mapping, committed before collection.",
    href: `${PAPER_DOCS}/UK_SCAN_RECIPE.md`,
  },
  {
    title: "Deviations log",
    copy: "Every departure from the protocol, when it happened and why.",
    href: `${PAPER_DOCS}/DEVIATIONS.md`,
  },
  {
    title: "Analysis code",
    copy: "The Python scripts that produce every confirmatory estimate.",
    href: `${REPO}/tree/main/tools/analysis`,
  },
  {
    title: "Scanner",
    copy: "The Playwright and axe-core scanner used to collect the UK sample.",
    href: `${REPO}/tree/main/tools/scanner`,
  },
] as const;

function LabIndex() {
  const usDrop = Math.round((1 - usResults.h1.strongVsNone.irr) * 100);
  const ukDrop = Math.round((1 - ukResults.h4.strongVsNone.irr) * 100);

  return (
    <div className="page">
      <header className="page-intro research-intro">
        <h1>Research</h1>
        <p>
          I study how design systems affect web accessibility, using public data and open tools.
          Hypotheses and analysis plans are written down and published before any estimates are run,
          and everything behind a paper (the data, the code and the pre-registration) is released
          alongside it. The datasets can be queried directly in your browser.
        </p>
      </header>

      <section id="papers" className="research-section" aria-labelledby="papers-heading">
        <h2 id="papers-heading">Papers</h2>
        {papers.map((paper) => (
          <article key={paper.slug} className="paper-entry">
            <h3>
              <Link to="/papers/$slug" params={{ slug: paper.slug }}>
                {paper.title}
              </Link>
            </h3>
            <p className="paper-entry__meta">
              {paper.displayNumber}
              {paper.publishedAt ? (
                <>
                  {" "}
                  <span aria-hidden="true">·</span> Published{" "}
                  <time dateTime={paper.publishedAt}>{formatPaperDate(paper.publishedAt)}</time>
                </>
              ) : null}
            </p>
            <p className="paper-entry__summary">{paper.cardSummary}</p>
            <dl className="paper-entry__results">
              <div>
                <dt>United States, {uswdsSummary.meta.analysedSites.toLocaleString()} sites</dt>
                <dd>{usDrop}% fewer detected violations</dd>
              </div>
              <div>
                <dt>
                  United Kingdom replication, {govukSummary.meta.analysedSites.toLocaleString()}{" "}
                  sites
                </dt>
                <dd>{ukDrop}% fewer detected violations</dd>
              </div>
            </dl>
            <ul className="text-links">
              <li>
                <Link to="/papers/$slug" params={{ slug: paper.slug }}>
                  Read the paper <IconArrowRight size={15} aria-hidden="true" />
                </Link>
              </li>
              <li>
                <a href={paper.preregistrationHref}>
                  Pre-registration <IconArrowUpRight size={15} aria-hidden="true" />
                </a>
              </li>
              <li>
                <a href="https://wasimarif.com/writing/design-systems-accessibility">
                  Plain-English summary <IconArrowUpRight size={15} aria-hidden="true" />
                </a>
              </li>
            </ul>
          </article>
        ))}
      </section>

      <section id="datasets" className="research-section" aria-labelledby="datasets-heading">
        <h2 id="datasets-heading">Datasets</h2>
        <p className="research-section__intro">
          Both datasets are the frozen files the paper was estimated on. The explorers run queries
          locally with DuckDB, so your queries never leave your browser.
        </p>
        <ul className="dataset-list">
          {datasetRegistry.map((dataset) => (
            <li key={dataset.id}>
              <Link
                to="/explore/$dataset"
                params={{ dataset: dataset.id }}
                search={{ group: undefined }}
              >
                <span>
                  <strong>{dataset.name}</strong>
                  <span className="dataset-list__summary">{dataset.summary}</span>
                  <span className="dataset-list__meta">
                    {dataset.rows} <span aria-hidden="true">·</span> {dataset.source.label}{" "}
                    <span aria-hidden="true">·</span> Parquet
                  </span>
                </span>
                <span className="dataset-list__cta">
                  Explore <IconArrowRight size={15} aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="methods" className="research-section" aria-labelledby="methods-heading">
        <h2 id="methods-heading">Methods</h2>
        <p className="research-section__intro">
          Each study follows a discovery and confirmation split. Patterns are explored on one
          sample, the confirmatory analysis is specified and locked, and only then is it run, once,
          on data that was not used to design it. These are the documents that make that checkable.
        </p>
        <ul className="method-list">
          {methodDocuments.map((document) => (
            <li key={document.title}>
              <a href={document.href}>
                <strong>{document.title}</strong>
                <span>{document.copy}</span>
                <IconArrowUpRight size={15} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
