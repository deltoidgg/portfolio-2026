import { IconArrowRight } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { sortedProjects } from "../content/projects";
import { buildMetadata } from "../lib/metadata";

const description =
  "Selected product and design-engineering work, each separated into the problem, decision, and evidence available today.";

export const Route = createFileRoute("/projects/")({
  head: () =>
    buildMetadata({
      title: "Selected work",
      description,
      path: "/projects",
      image: "/social/projects.png",
    }),
  component: ProjectsIndex,
});

function ProjectsIndex() {
  return (
    <div className="page-ledger mx-auto max-w-[var(--ui-page-width)] px-5 py-14 sm:px-8 lg:px-0 lg:py-20">
      <header className="editorial-intro">
        <p className="section-kicker">Selected work</p>
        <h1>Products with inspectable decisions.</h1>
        <p>
          Independent tools and products spanning AI services, frontend systems, accessibility,
          interaction, and data visualisation. Every case study separates the claim from the
          evidence available today.
        </p>
      </header>

      <section aria-labelledby="project-list-heading" className="border-t border-edge">
        <h2 id="project-list-heading" className="sr-only">
          Projects
        </h2>
        {sortedProjects.map((project, index) => (
          <Link
            key={project.slug}
            to="/projects/$slug"
            params={{ slug: project.slug }}
            className="index-row group"
          >
            <span className="index-row__number">{String(index + 1).padStart(2, "0")}</span>
            <span className="index-row__main">
              <small>
                {project.kind} · {project.timeframe}
              </small>
              <strong>{project.name}</strong>
              <p>{project.summary}</p>
            </span>
            <span className="index-row__proof">
              <small>Key decision</small>
              <p>{project.decision}</p>
            </span>
            <IconArrowRight size={17} aria-hidden="true" />
          </Link>
        ))}
      </section>
    </div>
  );
}
