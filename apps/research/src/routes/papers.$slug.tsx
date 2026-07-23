import { IconArrowLeft, IconExternalLink } from "@tabler/icons-react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Badge, Prose, Section } from "ui";
import { paperContentRegistry } from "../components/paper-content-registry";
import { datasetById } from "../content/datasets";
import { paperBySlug, type PaperStatus } from "../content/papers";
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
    <div className="mx-auto max-w-3xl px-6 py-16 sm:px-8">
      <p className="text-sm text-ink-muted">
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
    <article className="research-paper-page mx-auto max-w-[var(--ui-shell-width)] px-5 pb-4 pt-10 sm:px-8 lg:px-[var(--ui-shell-gutter)] lg:pt-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <Link
        to="/"
        className="mb-9 inline-flex min-h-11 items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <IconArrowLeft size={15} aria-hidden="true" />
        All papers
      </Link>

      <div className="research-paper-layout">
        {content ? <PaperContents /> : null}

        <div className="research-paper-main">
          <header className="research-paper-hero">
            <div className="mb-5 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.13em] text-ink-subtle">
              <Badge tone={paper.status === "published" ? "accent" : "warn"}>
                {statusLabels[paper.status]}
              </Badge>
              <span>{paper.displayNumber}</span>
              {paper.publishedAt ? <time dateTime={paper.publishedAt}>June 2026</time> : null}
            </div>
            <h1>{paper.title}</h1>
            <p>{paper.question}</p>
          </header>

          <dl className="paper-summary">
            <div>
              <dt>Finding</dt>
              <dd>
                Strong adoption signals were associated with 50% fewer detected violations in the
                US; the held-out UK estimate was 44% fewer.
              </dd>
            </div>
            <div>
              <dt>Why it matters</dt>
              <dd>
                The result is consistent with design systems acting as accessibility infrastructure
                while remaining observational rather than causal.
              </dd>
            </div>
            <div>
              <dt>What I built</dt>
              <dd>
                A detector and scanner, ETL pipeline, pre-registered analysis, publication system,
                and in-browser explorer.
              </dd>
            </div>
          </dl>

          {content ? <content.Stats /> : null}

          <Section id="abstract" title="Abstract" className="paper-section">
            <Prose>
              {paper.abstract.map((paragraph) => (
                <p key={paragraph.slice(0, 32)}>{paragraph}</p>
              ))}
            </Prose>
          </Section>

          {content ? <content.Body /> : <GenericPaperBody slug={paper.slug} />}
        </div>
      </div>
    </article>
  );
}

function PaperContents() {
  return (
    <aside className="paper-contents">
      <details open>
        <summary>Paper contents</summary>
        <nav aria-label="Paper contents">
          <ol>
            {paperSections.map(([id, label]) => (
              <li key={id}>
                <a href={"#" + id}>{label}</a>
              </li>
            ))}
          </ol>
        </nav>
      </details>
    </aside>
  );
}

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
            className="inline-flex items-center gap-1.5 text-accent-ink underline underline-offset-2"
          >
            Pre-registration <IconExternalLink size={14} aria-hidden="true" />
          </a>
        </li>
        {dataset ? (
          <li className="text-ink-muted">
            Data:{" "}
            <a href={dataset.source.href} className="text-accent-ink underline underline-offset-2">
              {dataset.source.label}
            </a>{" "}
            snapshot, processed to a versioned Parquet artifact by{" "}
            <code className="font-mono text-[0.8125rem] text-ink">tools/etl</code>.
          </li>
        ) : null}
      </ul>
    </Section>
  );
}
