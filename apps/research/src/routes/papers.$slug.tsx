import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { IconArrowLeft, IconExternalLink } from "@tabler/icons-react";
import { Badge, Prose, Section } from "ui";
import { datasetById } from "../content/datasets";
import { paperBySlug, type PaperStatus } from "../content/papers";
import { paperContentRegistry } from "../components/paper-content-registry";

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

function PaperPage() {
  const { paper } = Route.useLoaderData();
  const content = paperContentRegistry[paper.slug];

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

      {content ? <content.Stats /> : null}

      <Section title="Abstract">
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

/** Fallback for papers that don't have a full write-up registered yet. */
function GenericPaperBody({ slug }: { slug: string }) {
  const paper = paperBySlug(slug);
  if (!paper) return null;
  const dataset = datasetById(paper.datasetId);

  return (
    <Section title="Materials">
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
