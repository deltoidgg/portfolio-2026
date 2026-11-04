import { IconArrowLeft, IconExternalLink } from "@tabler/icons-react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Prose, Section, useActiveSection } from "ui";
import { paperContentRegistry } from "../components/paper-content-registry";
import { datasetById } from "../content/datasets";
import { formatPaperDate, paperBySlug, type PaperStatus } from "../content/papers";
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
    <div className="page message-page">
      <h1>Paper not found</h1>
      <p>There is no paper at this address.</p>
      <Link to="/" className="button button--primary">
        Go to the research index
      </Link>
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
    <article className="page paper">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <Link to="/" className="back-link">
        <IconArrowLeft size={16} aria-hidden="true" />
        All research
      </Link>

      <div className="paper__layout">
        {content ? <PaperContents /> : null}

        <div className="paper__main">
          <header className="paper__header">
            <h1>{paper.title}</h1>
            <p className="paper__question">{paper.question}</p>
            <p className="paper__meta">
              By Wasim Arif <span aria-hidden="true">·</span> {paper.displayNumber}{" "}
              <span aria-hidden="true">·</span> {statusLabels[paper.status]}
              {paper.publishedAt ? (
                <>
                  {" "}
                  <time dateTime={paper.publishedAt}>{formatPaperDate(paper.publishedAt)}</time>
                </>
              ) : null}
            </p>
          </header>

          <dl className="paper-summary">
            <div>
              <dt>Main finding</dt>
              <dd>
                Strong adoption signals were associated with 50% fewer detected violations in the
                US. The held-out UK estimate was 44% fewer.
              </dd>
            </div>
            <div>
              <dt>Why it matters</dt>
              <dd>
                The result is consistent with design systems working as accessibility
                infrastructure, although the design is observational rather than causal.
              </dd>
            </div>
            <div>
              <dt>What was built</dt>
              <dd>
                A detector and scanner, an ETL pipeline, the pre-registered analysis, this
                publication and the in-browser explorers.
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

const paperSectionIds = paperSections.map(([id]) => id);

function PaperContents() {
  const active = useActiveSection(paperSectionIds);

  const list = (
    <ol className="toc">
      {paperSections.map(([id, label]) => (
        <li key={id}>
          <a href={"#" + id} aria-current={active === id ? "location" : undefined}>
            {label}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="paper__rail">
      <details className="paper__contents-mobile">
        <summary>Contents</summary>
        {list}
      </details>
      <nav className="paper__contents" aria-label="Paper contents">
        <h2>Contents</h2>
        {list}
      </nav>
    </div>
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
