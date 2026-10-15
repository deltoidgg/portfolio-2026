import { IconArrowLeft, IconArrowRight, IconArrowUpRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { nextProject, type Project, type ProjectImage } from "../../content/projects";
import { ProjectPicture, projectTransition } from "../project-picture";

const statusLabels = {
  active: "Live, still working on it",
  maintained: "Live, no longer in development",
  archived: "Archived",
} as const;

export function ProjectLayout({ project, children }: { project: Project; children: ReactNode }) {
  const next = nextProject(project.slug);

  return (
    <article className="page case">
      <Link to="/projects" className="back-link">
        <IconArrowLeft size={16} aria-hidden="true" />
        All work
      </Link>

      <header className="case__header">
        <h1>{project.name}</h1>
        <p className="case__lede">{project.summary}</p>
        <dl className="case__facts">
          <div>
            <dt>When</dt>
            <dd>{project.timeframe}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>Design and engineering, on my own</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{statusLabels[project.lifecycle]}</dd>
          </div>
          <div>
            <dt>Built with</dt>
            <dd>{project.tags.join(", ")}</dd>
          </div>
        </dl>
        <div className="case__actions">
          {project.actions.map((action, index) => (
            <a
              key={action.href}
              href={action.href}
              target="_blank"
              rel="noopener noreferrer"
              className={index === 0 ? "button button--primary" : "button"}
            >
              {action.label}
              <IconArrowUpRight size={15} aria-hidden="true" />
            </a>
          ))}
        </div>
      </header>

      <figure className="case__cover" style={projectTransition(project.slug)}>
        <ProjectPicture image={project.cover} sizes="(min-width: 72rem) 72rem, 100vw" priority />
      </figure>

      <div className="case__body">{children}</div>

      {next ? (
        <nav className="case__next" aria-label="Next project">
          <Link to="/projects/$slug" params={{ slug: next.slug }} className="next-card">
            <span className="next-card__text">
              <strong>Next up: {next.name}</strong>
              <span>{next.summary}</span>
              <span className="next-card__cta">
                Read about {next.name} <IconArrowRight size={15} aria-hidden="true" />
              </span>
            </span>
            <span className="next-card__media reveal-media" style={projectTransition(next.slug)}>
              <ProjectPicture image={next.cover} sizes="(min-width: 48rem) 28rem, 100vw" />
            </span>
          </Link>
        </nav>
      ) : null}
    </article>
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
    <section id={id} className="case-section" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>{title}</h2>
      {children}
    </section>
  );
}

export function ProjectFigure({
  image,
  caption,
  wide = false,
}: {
  image: ProjectImage;
  caption: string;
  wide?: boolean;
}) {
  return (
    <figure className={wide ? "case-figure case-figure--wide" : "case-figure"}>
      <div className="case-figure__frame reveal-media">
        <ProjectPicture
          image={image}
          sizes={wide ? "(min-width: 72rem) 64rem, 100vw" : "(min-width: 48rem) 42rem, 100vw"}
        />
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

/** A short aside for a decision worth calling out, without breaking the reading flow. */
export function ProjectNote({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="case-note">
      <p>
        <strong>{title}</strong> {children}
      </p>
    </aside>
  );
}
