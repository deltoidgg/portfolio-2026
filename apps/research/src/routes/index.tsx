import { IconArrowRight, IconBrandGithub } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { govukSummary, ukResults, usResults, uswdsSummary } from "datasets/artifacts";
import { Badge, Card, Section } from "ui";
import { datasetRegistry } from "../content/datasets";
import { papers, type PaperStatus } from "../content/papers";
import { buildResearchMetadata } from "../lib/metadata";

const description =
  "Open, pre-registered research on design systems and accessibility, with reproducible analysis and interactive data explorers.";

export const Route = createFileRoute("/")({
  head: () => buildResearchMetadata({ title: "Research — Wasim Arif", description, path: "/" }),
  component: LabIndex,
});

const statusLabels: Record<PaperStatus, string> = {
  "in-progress": "In progress",
  preregistered: "Pre-registered",
  published: "Published",
};

function LabIndex() {
  const usDrop = Math.round((1 - usResults.h1.strongVsNone.irr) * 100);
  const ukDrop = Math.round((1 - ukResults.h4.strongVsNone.irr) * 100);
  const totalSites = uswdsSummary.meta.analysedSites + govukSummary.meta.analysedSites;

  return (
    <div className="mx-auto max-w-5xl px-6 py-16 sm:px-8 sm:py-20">
      <header className="mb-20 max-w-2xl">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-accent-ink">
          Independent research lab
        </p>
        <h1 className="mb-5 text-4xl font-semibold tracking-[-0.035em] text-ink text-balance">
          Open research. Inspectable systems.
        </h1>
        <p className="text-base leading-relaxed text-ink-muted text-pretty">
          Pre-registered research on design systems and accessibility. Hypotheses are locked before
          estimation, every figure traces to a versioned artifact, nulls and deviations are
          reported, and the data can be queried in your browser.
        </p>
      </header>

      <Section id="papers" title="Published paper">
        <div className="space-y-4">
          {papers.map((paper) => (
            <Card key={paper.slug} className="p-0 overflow-hidden">
              <div className="p-5 sm:p-7">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Badge tone={paper.status === "published" ? "accent" : "warn"}>
                    {statusLabels[paper.status]}
                  </Badge>
                  <span className="font-mono text-xs text-ink-subtle">Paper 01 · June 2026</span>
                </div>
                <h2 className="mb-3 text-2xl font-semibold tracking-tight text-ink text-balance">
                  <Link
                    to="/papers/$slug"
                    params={{ slug: paper.slug }}
                    className="transition-colors hover:text-accent-ink"
                  >
                    {paper.title}
                  </Link>
                </h2>
                <p className="max-w-2xl leading-relaxed text-ink-muted text-pretty">
                  Strong design-system adoption signals were associated with roughly half as many
                  automatically detected accessibility violations. The pre-registered model
                  replicated on held-out UK data.
                </p>
              </div>
              <dl className="grid gap-px border-t border-edge bg-edge sm:grid-cols-3">
                <div className="bg-canvas p-5">
                  <dt className="mb-2 text-xs text-ink-subtle">US association</dt>
                  <dd className="font-mono text-2xl font-semibold text-ink">−{usDrop}%</dd>
                </div>
                <div className="bg-canvas p-5">
                  <dt className="mb-2 text-xs text-ink-subtle">Held-out UK replication</dt>
                  <dd className="font-mono text-2xl font-semibold text-ink">−{ukDrop}%</dd>
                </div>
                <div className="bg-canvas p-5">
                  <dt className="mb-2 text-xs text-ink-subtle">Sites analysed</dt>
                  <dd className="font-mono text-2xl font-semibold text-ink">
                    {totalSites.toLocaleString()}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-edge p-5 text-sm font-medium sm:px-7">
                <Link
                  to="/papers/$slug"
                  params={{ slug: paper.slug }}
                  className="inline-flex min-h-10 items-center gap-1.5 text-ink transition-colors hover:text-accent-ink"
                >
                  Read paper <IconArrowRight size={16} aria-hidden="true" />
                </Link>
                <a
                  href={paper.preregistrationHref}
                  className="inline-flex min-h-10 items-center text-ink-muted transition-colors hover:text-ink"
                >
                  View preregistration
                </a>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        id="engineering"
        title="What I built"
        description="The study is also a software system: collection, transformation, estimation, publication, and exploration share versioned contracts."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            [
              "Scanner",
              "Playwright + axe-core collection with frozen detection and politeness rules.",
            ],
            ["ETL", "DuckDB pipelines that emit compact Parquet and typed JSON artifacts."],
            [
              "Analysis",
              "Pre-registered PPML models, diagnostics, replication, and simulation tests.",
            ],
            [
              "Visualisation",
              "Accessible, responsive figures shared between paper and plain-English article.",
            ],
            [
              "Explorer",
              "DuckDB-WASM queries over versioned datasets, entirely inside the browser.",
            ],
            [
              "Reproducibility",
              "Public preregistration, data freeze, deviations, source, and generated results.",
            ],
          ].map(([title, copy]) => (
            <div key={title} className="rounded-lg border border-edge bg-surface p-5">
              <h3 className="mb-2 text-sm font-semibold text-ink">{title}</h3>
              <p className="text-sm leading-relaxed text-ink-muted">{copy}</p>
            </div>
          ))}
        </div>
        <a
          href="https://github.com/deltoidgg/portfolio-2026"
          className="mt-6 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-ink transition-colors hover:text-accent-ink"
        >
          <IconBrandGithub size={17} aria-hidden="true" />
          Inspect the source and frozen artifacts
        </a>
      </Section>

      <Section
        id="data-explorers"
        title="Data explorers"
        description="Each dataset is a versioned Parquet artifact queried locally with DuckDB-WASM. Queries and filter choices never leave the browser."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {datasetRegistry.map((dataset) => (
            <Card key={dataset.id}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge>{dataset.rows}</Badge>
                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-subtle">
                  Parquet
                </span>
              </div>
              <h3 className="mb-2 text-lg font-semibold leading-snug text-ink">
                <Link
                  to="/explore/$dataset"
                  params={{ dataset: dataset.id }}
                  search={{ group: undefined }}
                  className="transition-colors hover:text-accent-ink"
                >
                  {dataset.name}
                </Link>
              </h3>
              <p className="text-sm leading-relaxed text-ink-muted">{dataset.description}</p>
              <Link
                to="/explore/$dataset"
                params={{ dataset: dataset.id }}
                search={{ group: undefined }}
                className="mt-5 inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-ink"
              >
                Explore data <IconArrowRight size={16} aria-hidden="true" />
              </Link>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="method" title="Research discipline">
        <p className="max-w-[70ch] leading-relaxed text-ink-muted text-pretty">
          Variables, models, and priors are locked before confirmatory relationships are examined;
          exploratory findings are labelled; null results are reported as nulls; and replication on
          held-out data is designed in from the start. The approach bounds researcher degrees of
          freedom without pretending observational data can prove causation.
        </p>
      </Section>
    </div>
  );
}
