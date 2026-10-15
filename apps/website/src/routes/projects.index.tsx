import { IconArrowRight } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ProjectPicture, projectTransition } from "../components/project-picture";
import { sortedProjects } from "../content/projects";
import { buildMetadata } from "../lib/metadata";

const description =
  "Things I've designed and built on my own: a reading app, a Fantasy Premier League lab, devtools and a fighting game stats site.";

export const Route = createFileRoute("/projects/")({
  head: () =>
    buildMetadata({
      title: "Work",
      description,
      path: "/projects",
      image: "/social/projects.png",
    }),
  component: ProjectsIndex,
});

function ProjectsIndex() {
  return (
    <div className="page">
      <header className="page-intro">
        <h1>Work</h1>
        <p>
          Things I&rsquo;ve designed and built on my own, mostly because I wanted them to exist.
          Each one has a write-up covering why I made it, how it works and what&rsquo;s still
          unfinished.
        </p>
      </header>

      <section aria-label="Projects" className="project-list">
        {sortedProjects.map((project, index) => (
          <Link
            key={project.slug}
            to="/projects/$slug"
            params={{ slug: project.slug }}
            className="project-row"
          >
            <span
              className={index === 0 ? "project-row__media" : "project-row__media reveal-media"}
              style={projectTransition(project.slug)}
            >
              <ProjectPicture
                image={project.cover}
                sizes="(min-width: 56rem) 40rem, 100vw"
                priority={index === 0}
              />
            </span>
            <span className="project-row__text">
              <span className="project-row__meta">{project.timeframe}</span>
              <strong>{project.name}</strong>
              <span className="project-row__summary">{project.summary}</span>
              <span className="project-row__tags">{project.tags.join(" · ")}</span>
              <span className="project-row__cta">
                Read the write-up <IconArrowRight size={15} aria-hidden="true" />
              </span>
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
