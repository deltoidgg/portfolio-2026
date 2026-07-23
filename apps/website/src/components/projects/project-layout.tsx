import { IconArrowLeft, IconArrowUpRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Badge } from "ui";
import type { Project } from "../../content/projects";

const lifecycleLabels = {
  active: "Live",
  maintained: "Maintained",
  archived: "Archived",
} as const;

const sectionLabels: Record<string, string> = {
  why: "Problem framing",
  evidence: "Evidence",
  model: "Model",
  interface: "Interface",
  system: "Architecture",
  status: "What remains",
  problem: "Problem",
  decision: "Decision",
  architecture: "Architecture",
  outcome: "What it proves",
  limitations: "What remains",
};

export function ProjectLayout({ project, children }: { project: Project; children: ReactNode }) {
  const evidenceActions = project.actions.filter((action) => action.kind !== "case-study");

  return (
    <article className="case-page mx-auto max-w-[var(--ui-case-width)] px-5 pb-4 pt-8 sm:px-8 lg:px-0 lg:pt-12">
      <Link
        to="/projects"
        className="mb-8 inline-flex min-h-11 items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink lg:mb-10"
      >
        <IconArrowLeft size={15} aria-hidden="true" />
        Back to work
      </Link>

      <header className="case-hero">
        <div className="mb-5 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-subtle">
          <span>Case study</span>
          <span aria-hidden="true">/</span>
          <span>{project.kind} &amp; design engineering</span>
          <Badge tone={project.lifecycle === "active" ? "accent" : "neutral"}>
            {lifecycleLabels[project.lifecycle]}
          </Badge>
        </div>
        <h1>{project.name}</h1>
        <p>{project.summary}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          {evidenceActions.map((action, index) => (
            <a
              key={action.href}
              href={action.href}
              target="_blank"
              rel="noopener noreferrer"
              className={index === 0 ? "primary-action" : "secondary-action"}
            >
              {action.label}
              <IconArrowUpRight size={15} aria-hidden="true" />
            </a>
          ))}
        </div>
      </header>

      <figure className="case-media">
        <img
          src={project.cover.src}
          alt={project.cover.alt}
          width={project.cover.width}
          height={project.cover.height}
          fetchPriority="high"
          decoding="async"
        />
      </figure>

      <div className="case-body-grid">
        <div className="case-story">
          <CaseSummaryRow label="Problem">{project.problem}</CaseSummaryRow>
          <CaseSummaryRow label="Decision">{project.decision}</CaseSummaryRow>
          <CaseSummaryRow label="Evidence">{project.evidence}</CaseSummaryRow>
          <div className="project-prose">{children}</div>
        </div>

        {project.evidencePoints && project.evidencePoints.length > 0 ? (
          <aside className="case-outcomes" aria-label="Key evidence">
            <p className="section-kicker">Key evidence</p>
            {project.evidencePoints.map((point) => (
              <div key={point.value + point.label}>
                <strong>{point.value}</strong>
                <span>{point.label}</span>
                {point.note ? <small>{point.note}</small> : null}
              </div>
            ))}
          </aside>
        ) : null}
      </div>
    </article>
  );
}

function CaseSummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="case-section case-section--summary">
      <div className="case-section__label">
        <i />
        {label}
      </div>
      <div className="case-section__content">
        <p>{children}</p>
      </div>
    </section>
  );
}

export function ProjectSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="case-section scroll-mt-28">
      <div className="case-section__label">
        <i />
        {sectionLabels[id] ?? title}
      </div>
      <div className="case-section__content">
        <h2>{title}</h2>
        {children}
      </div>
    </section>
  );
}

export function ProjectFigure({
  src,
  alt,
  caption,
  width = 1600,
  height = 900,
}: {
  src: string;
  alt: string;
  caption: string;
  width?: number;
  height?: number;
}) {
  return (
    <figure className="project-figure">
      <div className="overflow-hidden rounded-[4px] border border-edge bg-surface">
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          className="h-auto w-full"
        />
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
