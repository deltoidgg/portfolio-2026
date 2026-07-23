import { IconArrowRight, IconDatabase, IconFileDescription } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { govukSummary, ukResults, usResults, uswdsSummary } from "datasets/artifacts";
import { datasetRegistry } from "../content/datasets";
import { papers } from "../content/papers";
import { buildResearchMetadata } from "../lib/metadata";

const description =
  "Open, pre-registered research on design systems and accessibility, with reproducible analysis and interactive data explorers.";

export const Route = createFileRoute("/")({
  head: () => buildResearchMetadata({ title: "Research — Wasim Arif", description, path: "/" }),
  component: LabIndex,
});

const methodology = [
  [
    "01",
    "Preregistration",
    "Hypotheses, models, variables, and analyses locked before estimation.",
  ],
  ["02", "Data collection", "Sampling frames, inclusion criteria, and measurement specifications."],
  ["03", "Estimation", "Statistical models, assumptions, and replication code."],
  ["04", "Replication", "Held-out tests, robustness checks, and effect validation."],
  ["05", "Publication", "Final papers, tables, figures, and appendices."],
  ["06", "Artifacts", "Code, schemas, instruments, and versioned outputs."],
] as const;

function LabIndex() {
  const paper = papers[0];
  const usDrop = Math.round((1 - usResults.h1.strongVsNone.irr) * 100);
  const ukDrop = Math.round((1 - ukResults.h4.strongVsNone.irr) * 100);
  const totalSites = uswdsSummary.meta.analysedSites + govukSummary.meta.analysedSites;

  return (
    <div className="research-home mx-auto max-w-[var(--ui-page-width)] px-5 pb-2 pt-12 sm:px-8 lg:px-0 lg:pt-20">
      <header className="research-hero">
        <h1>
          Open research.
          <br />
          Inspectable evidence<span>.</span>
        </h1>
        <p>
          Pre-registered studies on design systems and accessibility. Hypotheses are locked before
          estimation, every figure traces to a versioned artifact, and all data can be queried in
          your browser.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {paper ? (
            <Link to="/papers/$slug" params={{ slug: paper.slug }} className="secondary-action">
              <IconFileDescription size={15} aria-hidden="true" />
              Read latest paper
              <IconArrowRight size={15} aria-hidden="true" />
            </Link>
          ) : null}
          <Link to="/" hash="datasets" className="text-action">
            Browse datasets <IconArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </header>

      {paper ? (
        <section
          id="papers"
          className="research-latest border-t border-edge"
          aria-labelledby="latest-paper-heading"
        >
          <div className="section-heading-row">
            <p className="section-kicker">Latest paper</p>
            <a href="#published-papers">
              View all papers <IconArrowRight size={14} aria-hidden="true" />
            </a>
          </div>
          <div className="research-latest__grid">
            <article>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-subtle">
                <span className="text-accent-ink">Published</span> · {paper.displayNumber} · June
                2026
              </p>
              <h2 id="latest-paper-heading">{paper.title}</h2>
              <p>{paper.cardSummary}</p>
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
                <Link to="/papers/$slug" params={{ slug: paper.slug }}>
                  Read paper <IconArrowRight size={14} />
                </Link>
                <a href={paper.preregistrationHref}>
                  View preregistration <IconArrowRight size={14} />
                </a>
                <Link
                  to="/explore/$dataset"
                  params={{ dataset: paper.datasetId }}
                  search={{ group: undefined }}
                >
                  View artifacts <IconArrowRight size={14} />
                </Link>
              </div>
            </article>
            <dl className="research-latest__metrics">
              <div>
                <dt>US association</dt>
                <dd>
                  <span>−{usDrop}%</span>
                  <small>fewer violations</small>
                </dd>
              </div>
              <div>
                <dt>Held-out UK replication</dt>
                <dd>
                  <span>−{ukDrop}%</span>
                  <small>replicated reduction</small>
                </dd>
              </div>
              <div>
                <dt>Sites analysed</dt>
                <dd>
                  <span>{totalSites.toLocaleString()}</span>
                  <small>across two countries</small>
                </dd>
              </div>
            </dl>
          </div>
        </section>
      ) : null}

      <section
        id="published-papers"
        className="research-table-section border-t border-edge"
        aria-labelledby="published-papers-heading"
      >
        <div className="section-heading-row">
          <p id="published-papers-heading" className="section-kicker">
            Published papers
          </p>
        </div>
        <ol className="research-paper-list">
          {papers.map((item, index) => (
            <li key={item.slug}>
              <span>{index + 1}</span>
              <Link to="/papers/$slug" params={{ slug: item.slug }}>
                {item.title}
              </Link>
              <small>{item.displayNumber} · June 2026</small>
              <Link to="/papers/$slug" params={{ slug: item.slug }}>
                Read paper <IconArrowRight size={14} />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section
        id="datasets"
        className="research-table-section border-t border-edge scroll-mt-28"
        aria-labelledby="datasets-heading"
      >
        <div className="section-heading-row">
          <p id="datasets-heading" className="section-kicker">
            Datasets
          </p>
        </div>
        <div className="dataset-ledger">
          {datasetRegistry.map((dataset, index) => (
            <article key={dataset.id}>
              <DatasetGlyph variant={index === 0 ? "us" : "uk"} />
              <div>
                <h2>{dataset.name}</h2>
                <p>{dataset.description}</p>
              </div>
              <dl>
                <div>
                  <dt>Sites</dt>
                  <dd>{dataset.rows.replace(" sites", "")}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{dataset.source.label}</dd>
                </div>
                <div>
                  <dt>Format</dt>
                  <dd>Parquet</dd>
                </div>
              </dl>
              <Link
                to="/explore/$dataset"
                params={{ dataset: dataset.id }}
                search={{ group: undefined }}
              >
                Explore dataset <IconArrowRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section
        id="methodology"
        className="research-method border-t border-edge scroll-mt-28"
        aria-labelledby="methodology-heading"
      >
        <div className="section-heading-row">
          <p id="methodology-heading" className="section-kicker">
            Open artifacts &amp; methodology
          </p>
        </div>
        <ol>
          {methodology.map(([number, title, copy]) => (
            <li key={number}>
              <span>{number}</span>
              <h2>{title}</h2>
              <p>{copy}</p>
              <a href="https://github.com/deltoidgg/portfolio-2026">
                View <IconArrowRight size={13} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function DatasetGlyph({ variant }: { variant: "us" | "uk" }) {
  const dots =
    variant === "us"
      ? [
          [8, 14],
          [14, 10],
          [20, 9],
          [26, 12],
          [32, 10],
          [38, 14],
          [44, 13],
          [50, 16],
          [56, 14],
          [62, 18],
          [68, 17],
          [74, 21],
          [80, 20],
          [18, 18],
          [24, 20],
          [30, 18],
          [36, 22],
          [42, 21],
          [48, 24],
          [54, 23],
          [60, 27],
          [66, 25],
          [72, 28],
          [24, 27],
          [30, 29],
          [36, 27],
          [42, 31],
          [48, 29],
          [54, 33],
          [60, 31],
          [66, 34],
        ]
      : [
          [44, 4],
          [41, 10],
          [44, 15],
          [40, 20],
          [42, 26],
          [38, 31],
          [40, 37],
          [35, 42],
          [37, 48],
          [33, 54],
          [35, 60],
          [30, 65],
          [33, 70],
          [39, 73],
          [43, 68],
          [46, 62],
          [44, 55],
          [47, 49],
          [45, 42],
          [49, 36],
          [46, 30],
          [50, 24],
          [48, 18],
          [51, 12],
        ];
  return (
    <svg className="dataset-glyph" viewBox="0 0 90 78" aria-hidden="true">
      {dots.map(([x, y], index) => (
        <circle key={index} cx={x} cy={y} r="1.4" fill="currentColor" />
      ))}
      <IconDatabase x="64" y="52" width="18" height="18" strokeWidth="1" />
    </svg>
  );
}
