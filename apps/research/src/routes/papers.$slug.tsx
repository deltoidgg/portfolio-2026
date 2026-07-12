import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { IconArrowLeft, IconExternalLink } from "@tabler/icons-react";
import { Badge, Prose, Section } from "ui";
import { datasetById } from "../content/datasets";
import { paperBySlug, type PaperStatus } from "../content/papers";
import { paperContentRegistry } from "../components/paper-content-registry";
import { buildResearchMetadata, RESEARCH_ORIGIN } from "../lib/metadata";

export const Route = createFileRoute("/papers/$slug")({
  loader: ({ params }) => {
    const paper = paperBySlug(params.slug);
    if (!paper) throw notFound();
    return { paper };
  },
  head: ({ loaderData }) =>
    loaderData
      ? buildResearchMetadata({
          title: loaderData.paper.title,
          description: loaderData.paper.question,
          path: `/papers/${loaderData.paper.slug}`,
          image: "/social/paper-design-systems.png",
          type: "article",
          publishedTime: loaderData.paper.publishedAt,
        })
      : { meta: [] },
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

function PaperPage() {
  const { paper } = Route.useLoaderData();
  const content = paperContentRegistry[paper.slug];
  const paperUrl = `${RESEARCH_ORIGIN}/papers/${paper.slug}`;
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    headline: paper.title,
    description: paper.question,
    datePublished: paper.publishedAt,
    url: paperUrl,
    mainEntityOfPage: paperUrl,
    author: { "@type": "Person", name: "Wasim Arif", url: "https://wasimarif.com" },
    isAccessibleForFree: true,
  });

  return (
    <article className="max-w-3xl mx-auto px-6 py-16 sm:px-8 sm:py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
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
        <p className="text-ink-muted text-base leading-relaxed">{paper.question}</p>
        {paper.publishedAt ? (
          <p className="mt-3 font-mono text-xs text-ink-subtle">
            Published <time dateTime={paper.publishedAt}>June 2026</time>
          </p>
        ) : null}
      </header>

      <dl className="mb-12 grid gap-px overflow-hidden rounded-lg border border-edge bg-edge sm:grid-cols-3">
        <div className="bg-surface p-5">
          <dt className="mb-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-accent-ink">
            Finding
          </dt>
          <dd className="text-sm leading-relaxed text-ink-muted">
            Strong adoption signals were associated with 50% fewer detected violations in the US;
            the held-out UK estimate was 44% fewer.
          </dd>
        </div>
        <div className="bg-surface p-5">
          <dt className="mb-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-accent-ink">
            Why it matters
          </dt>
          <dd className="text-sm leading-relaxed text-ink-muted">
            The result is consistent with design systems acting as accessibility infrastructure at
            estate scale, while remaining observational rather than causal.
          </dd>
        </div>
        <div className="bg-surface p-5">
          <dt className="mb-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-accent-ink">
            What I built
          </dt>
          <dd className="text-sm leading-relaxed text-ink-muted">
            A frozen detector and scanner, ETL pipeline, pre-registered analysis, publication
            system, and in-browser data explorer.
          </dd>
        </div>
      </dl>

      {content ? <content.Stats /> : null}

      {content ? <PaperContents /> : null}

      <Section id="abstract" title="Abstract">
        <Prose>
          {paper.abstract.map((paragraph) => (
            <p key={paragraph.slice(0, 32)}>{paragraph}</p>
          ))}
        </Prose>
      </Section>

      {content ? <content.Body /> : <GenericPaperBody slug={paper.slug} />}
    </article>
  );
}

const paperSections = [
  ["abstract", "Abstract"],
  ["introduction", "1. Introduction"],
  ["data", "2. Data"],
  ["methods", "3. Methods"],
  ["us-results", "4. US results"],
  ["diagnostics", "5. Diagnostics"],
  ["uk-replication", "6. UK replication"],
  ["limitations", "7. Limitations"],
  ["deviations", "Deviations"],
  ["downloads", "Downloads"],
] as const;

function PaperContents() {
  return (
    <nav aria-label="Paper contents" className="mb-12 rounded-lg border border-edge bg-surface p-5">
      <h2 className="mb-3 text-sm font-semibold text-ink">Contents</h2>
      <ol className="grid gap-x-6 gap-y-2 text-sm text-ink-muted sm:grid-cols-2">
        {paperSections.map(([id, label]) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className="underline decoration-edge underline-offset-4 hover:text-ink"
            >
              {label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Fallback for papers that don't have a full write-up registered yet. */
function GenericPaperBody({ slug }: { slug: string }) {
  const paper = paperBySlug(slug);
  if (!paper) return null;
  const dataset = datasetById(paper.datasetId);

  return (
    <Section id="materials" title="Materials">
      <ul className="space-y-3 text-sm">
        <li>
          <a
            href={paper.preregistrationHref}
            className="inline-flex items-center gap-1.5 text-accent-ink underline underline-offset-2 hover:text-accent"
          >
            Pre-registration
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
      </ul>
    </Section>
  );
}
