import { createFileRoute } from "@tanstack/react-router";
import { ProjectCard } from "../components/project-card";
import { featuredProjects, sortedProjects } from "../content/projects";
import { buildMetadata } from "../lib/metadata";

const description =
  "Selected independent product and design-engineering work: runtime provenance devtools, an AI-assisted reading product, and fighting-game analytics.";

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
  const earlierProjects = sortedProjects.filter((project) => !project.featured);

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-8 sm:py-20">
      <header className="mx-auto mb-14 max-w-2xl">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-accent-ink">
          Selected work
        </p>
        <h1 className="mb-4 text-4xl font-semibold tracking-[-0.035em] text-ink text-balance">
          Products with inspectable decisions
        </h1>
        <p className="max-w-xl leading-relaxed text-ink-muted text-pretty">
          Independent tools and products spanning AI services, frontend systems, interaction design,
          accessibility, and data visualisation. Each case study separates the problem, the
          decision, and the evidence available today.
        </p>
      </header>

      <section aria-labelledby="current-work" className="mb-20">
        <h2 id="current-work" className="sr-only">
          Current work
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {featuredProjects.map((project, index) => (
            <ProjectCard key={project.slug} project={project} priority={index === 0} />
          ))}
        </div>
      </section>

      {earlierProjects.length > 0 ? (
        <section aria-labelledby="earlier-work">
          <div className="mx-auto mb-8 max-w-2xl border-t border-edge pt-10">
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.16em] text-accent-ink">
              Earlier work
            </p>
            <h2 id="earlier-work" className="text-2xl font-semibold tracking-tight text-ink">
              Foundations that still hold up
            </h2>
          </div>
          <div className="mx-auto grid max-w-2xl gap-6">
            {earlierProjects.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
