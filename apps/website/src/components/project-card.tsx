import { IconArrowRight, IconArrowUpRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "ui";
import type { Project } from "../content/projects";

const lifecycleLabels = {
  active: "Active",
  maintained: "Maintained",
  archived: "Archived",
} as const;

export function ProjectCard({
  project,
  priority = false,
}: {
  project: Project;
  priority?: boolean;
}) {
  const externalAction = project.actions.find(
    (action) => action.kind === "live" || action.kind === "docs" || action.kind === "source",
  );

  return (
    <article className="group overflow-hidden rounded-xl border border-edge bg-surface transition-[border-color,background-color,transform] duration-300 hover:-translate-y-0.5 hover:border-edge-strong hover:bg-surface-raised/60 motion-reduce:transform-none">
      <Link
        to="/projects/$slug"
        params={{ slug: project.slug }}
        aria-label={`Read ${project.name} case study`}
        className="block overflow-hidden border-b border-edge bg-canvas"
      >
        <img
          src={project.cover.src}
          alt={project.cover.alt}
          width={project.cover.width}
          height={project.cover.height}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.012] motion-reduce:transform-none"
        />
      </Link>
      <div className="p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.13em] text-ink-subtle">
          <span>{project.kind}</span>
          <span aria-hidden="true">/</span>
          <span>{project.timeframe}</span>
          <Badge tone={project.lifecycle === "active" ? "accent" : "neutral"}>
            {lifecycleLabels[project.lifecycle]}
          </Badge>
        </div>
        <h3 className="mb-3 text-2xl font-semibold tracking-tight text-ink">
          <Link
            to="/projects/$slug"
            params={{ slug: project.slug }}
            className="transition-colors hover:text-accent-ink"
          >
            {project.name}
          </Link>
        </h3>
        <p className="leading-relaxed text-ink-muted text-pretty">{project.summary}</p>

        <dl className="mt-6 grid gap-4 border-l border-accent-edge pl-4 text-sm">
          <div>
            <dt className="mb-1 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-accent-ink">
              Decision
            </dt>
            <dd className="leading-relaxed text-ink-muted">{project.decision}</dd>
          </div>
          <div>
            <dt className="mb-1 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-accent-ink">
              Evidence
            </dt>
            <dd className="leading-relaxed text-ink-muted">{project.evidence}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          {project.tags.map((tag) => (
            <Badge key={tag} tone="neutral">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-medium">
          <Link
            to="/projects/$slug"
            params={{ slug: project.slug }}
            className="inline-flex min-h-10 items-center gap-1.5 text-ink transition-colors hover:text-accent-ink"
          >
            Read case study
            <IconArrowRight
              size={16}
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5"
            />
          </Link>
          {externalAction ? (
            <a
              href={externalAction.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-1.5 text-ink-muted transition-colors hover:text-ink"
            >
              {externalAction.label}
              <IconArrowUpRight size={16} aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
