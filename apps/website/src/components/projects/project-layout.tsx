import { IconArrowLeft, IconArrowUpRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Badge } from "ui";
import type { Project } from "../../content/projects";

const lifecycleLabels = {
  active: "Active",
  maintained: "Maintained",
  archived: "Archived",
} as const;

export function ProjectLayout({ project, children }: { project: Project; children: ReactNode }) {
  const evidenceActions = project.actions.filter((action) => action.kind !== "case-study");

  return (
    <article className="pb-12 sm:pb-20">
      <div className="mx-auto max-w-2xl px-6 pt-12 sm:px-8 sm:pt-16">
        <Link
          to="/projects"
          className="mb-12 inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <IconArrowLeft size={16} aria-hidden="true" />
          Selected work
        </Link>

        <header className="mb-10">
          <div className="mb-5 flex flex-wrap items-center gap-2 font-mono text-xs text-ink-subtle">
            <span>{project.role}</span>
            <span aria-hidden="true">/</span>
            <span>{project.timeframe}</span>
            <Badge tone={project.lifecycle === "active" ? "accent" : "neutral"}>
              {lifecycleLabels[project.lifecycle]}
            </Badge>
          </div>
          <h1 className="mb-5 text-4xl font-semibold tracking-[-0.035em] text-ink text-balance sm:text-5xl">
            {project.name}
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-ink-muted text-pretty">
            {project.summary}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {evidenceActions.map((action) => (
              <a
                key={`${action.kind}-${action.href}`}
                href={action.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-edge bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-edge-strong hover:bg-surface-raised"
              >
                {action.label}
                <IconArrowUpRight size={16} aria-hidden="true" />
              </a>
            ))}
          </div>
        </header>
      </div>

      <figure className="mx-auto mb-12 max-w-5xl px-4 sm:mb-16 sm:px-8">
        <div className="overflow-hidden rounded-xl border border-edge bg-surface shadow-[0_24px_80px_rgb(0_0_0/0.12)]">
          <img
            src={project.cover.src}
            alt={project.cover.alt}
            width={project.cover.width}
            height={project.cover.height}
            fetchPriority="high"
            decoding="async"
            className="h-auto w-full"
          />
        </div>
      </figure>

      <div className="mx-auto max-w-2xl px-6 sm:px-8">
        <ProofTrail project={project} />
        <div className="project-prose">{children}</div>
      </div>
    </article>
  );
}

function ProofTrail({ project }: { project: Project }) {
  const items = [
    { label: "Problem", value: project.problem },
    { label: "Decision", value: project.decision },
    { label: "Evidence", value: project.evidence },
  ];

  return (
    <section aria-label="Project proof trail" className="proof-trail mb-16">
      {items.map((item, index) => (
        <div key={item.label} className="proof-trail__item">
          <div className="mb-3 flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-accent-ink">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <span>{item.label}</span>
          </div>
          <p className="text-sm leading-relaxed text-ink-muted text-pretty">{item.value}</p>
        </div>
      ))}
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
    <section id={id} className="scroll-mt-24">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function ProjectFigure({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption: string;
}) {
  return (
    <figure className="project-figure">
      <div className="overflow-hidden rounded-lg border border-edge bg-surface">
        <img
          src={src}
          alt={alt}
          width={1600}
          height={900}
          loading="lazy"
          decoding="async"
          className="h-auto w-full"
        />
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
