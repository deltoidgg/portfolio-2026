import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ProjectLayout } from "../components/projects/project-layout";
import { projectContentBySlug } from "../components/projects/project-registry";
import { projectBySlug } from "../content/projects";
import { buildMetadata } from "../lib/metadata";

export const Route = createFileRoute("/projects/$slug")({
  loader: ({ params }) => {
    const project = projectBySlug(params.slug);
    if (!project || !projectContentBySlug(params.slug)) throw notFound();
    return { project };
  },
  head: ({ loaderData }) =>
    loaderData
      ? buildMetadata({
          title: loaderData.project.name,
          description: loaderData.project.summary,
          path: `/projects/${loaderData.project.slug}`,
          image: `/social/${loaderData.project.slug}.png`,
        })
      : { meta: [] },
  component: ProjectPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-6 py-20 sm:px-8">
      <h1 className="mb-3 text-2xl font-semibold text-ink">Project not found</h1>
      <p className="text-ink-muted">
        This case study does not exist.{" "}
        <Link to="/projects" className="font-medium text-accent-ink underline underline-offset-2">
          Browse selected work
        </Link>
      </p>
    </div>
  ),
});

function ProjectPage() {
  const { project } = Route.useLoaderData();
  const Content = projectContentBySlug(project.slug);
  if (!Content) return null;
  return (
    <ProjectLayout project={project}>
      <Content />
    </ProjectLayout>
  );
}
