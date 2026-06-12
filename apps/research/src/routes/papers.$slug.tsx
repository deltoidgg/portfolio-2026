import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { IconArrowLeft, IconExternalLink } from "@tabler/icons-react";
import { Badge, DataTable, Prose, Section, Stat, type DataTableColumn } from "ui";
import { datasetById } from "../content/datasets";
import { paperBySlug, uswdsSummary, type PaperStatus } from "../content/papers";

export const Route = createFileRoute("/papers/$slug")({
  loader: ({ params }) => {
    const paper = paperBySlug(params.slug);
    if (!paper) throw notFound();
    return { paper };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: `${loaderData.paper.title} — Research — Wasim Arif` }] : [],
  }),
  component: PaperPage,
  notFoundComponent: () => (
    <div className="max-w-3xl mx-auto px-6 py-16 sm:px-8">
      <p className="text-ink-muted text-sm">
        No such paper.{" "}
        <Link to="/" className="text-accent-ink underline underline-offset-2">
          Back to the lab
        </Link>
      </p>
    </div>
  ),
});

const statusLabels: Record<PaperStatus, string> = {
  "in-progress": "In progress",
  preregistered: "Pre-registered",
  published: "Published",
};

interface BandRow {
  band: string;
  label: string;
  sites: number;
  meanViolations: number;
  medianViolations: number;
  zeroShare: number;
}

const bandColumns: Array<DataTableColumn<BandRow>> = [
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

function PaperPage() {
  const { paper } = Route.useLoaderData();
  const dataset = datasetById(paper.datasetId);

  const bands = uswdsSummary.bands;
  const none = bands.find((band) => band.band === "none");
  const strong = bands.filter((band) => band.band === "likely" || band.band === "definite");
  const strongSites = strong.reduce((sum, band) => sum + band.sites, 0);
  const strongMean =
    strong.reduce((sum, band) => sum + band.meanViolations * band.sites, 0) / strongSites;
  const strongZero =
    strong.reduce((sum, band) => sum + band.zeroShare * band.sites, 0) / strongSites;
  const meanReduction = none ? 1 - strongMean / none.meanViolations : 0;
  const zeroRatio = none ? strongZero / none.zeroShare : 0;

  return (
    <article className="max-w-3xl mx-auto px-6 py-16 sm:px-8 sm:py-20">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors mb-10"
      >
        <IconArrowLeft size={16} aria-hidden="true" />
        All papers
      </Link>

      <header className="mb-12">
        <div className="mb-4">
          <Badge tone={paper.status === "published" ? "accent" : "warn"}>
            {statusLabels[paper.status]}
          </Badge>
        </div>
        <h1 className="text-2xl font-medium text-ink leading-snug mb-4">{paper.title}</h1>
        <p className="text-ink-muted text-sm leading-relaxed">{paper.question}</p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-y border-edge py-6 mb-12">
        <Stat
          value={uswdsSummary.meta.analysedSites.toLocaleString()}
          label="Federal websites analysed"
        />
        <Stat
          value={`−${Math.round(meanReduction * 100)}%`}
          label="Mean violations, strong adoption vs none (unadjusted)"
        />
        <Stat
          value={`${zeroRatio.toFixed(1)}×`}
          label="More violation-free sites under strong adoption"
        />
        <Stat
          value={uswdsSummary.categories.length.toString()}
          label="axe-core violation categories tracked"
        />
      </div>

      <Section title="Abstract">
        <Prose>
          {paper.abstract.map((paragraph) => (
            <p key={paragraph.slice(0, 32)}>{paragraph}</p>
          ))}
        </Prose>
      </Section>

      <Section
        title="Preliminary descriptives"
        description="Unadjusted means from the frozen snapshot. The dose-response gradient below is the motivating pattern, not the confirmatory result."
      >
        <DataTable
          caption={`USWDS adoption vs detected accessibility violations, ${uswdsSummary.meta.analysedSites.toLocaleString()} live federal websites (snapshot ${uswdsSummary.meta.snapshotDate.slice(0, 10)}).`}
          columns={bandColumns}
          rows={bands}
          getRowKey={(row) => row.band}
        />
        {dataset ? (
          <p className="text-sm text-ink-muted mt-4">
            <Link
              to="/explore/$dataset"
              params={{ dataset: dataset.id }}
              className="text-accent-ink underline underline-offset-2 hover:text-accent"
            >
              Explore this dataset in the browser
            </Link>{" "}
            — filter by agency, switch metrics, and inspect the gradient yourself.
          </p>
        ) : null}
      </Section>

      <Section title="Materials">
        <ul className="space-y-3 text-sm">
          <li>
            <a
              href={paper.preregistrationHref}
              className="inline-flex items-center gap-1.5 text-accent-ink underline underline-offset-2 hover:text-accent"
            >
              Pre-registration (draft until frozen)
              <IconExternalLink size={14} aria-hidden="true" />
            </a>
          </li>
          {dataset ? (
            <li className="text-ink-muted">
              Data:{" "}
              <a
                href={dataset.source.href}
                className="text-accent-ink underline underline-offset-2 hover:text-accent"
              >
                {dataset.source.label}
              </a>{" "}
              snapshot, processed to a versioned Parquet artifact by{" "}
              <code className="font-mono text-ink text-[0.8125rem]">tools/etl</code>.
            </li>
          ) : null}
          <li className="text-ink-muted">
            Replication: frozen specification applied once to a held-out UK public-sector scan
            (govuk-frontend detection + axe-core), collected by{" "}
            <code className="font-mono text-ink text-[0.8125rem]">tools/scanner</code> (phase 2).
          </li>
        </ul>
      </Section>
    </article>
  );
}
