import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ProjectLayout } from "../components/projects/project-layout";
import { projectContentBySlug } from "../components/projects/project-registry";
import { projectBySlug } from "../content/projects";
import { buildMetadata } from "../lib/metadata";

export const Route = createFileRoute("/projects/$slug")({
  loader: ({ params }) => {
    const project = projectBySlug(params.slug);
    if (!project) throw notFound();
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
    <div className="page message-page">
      <h1>No project here</h1>
      <p>I couldn&rsquo;t find a write-up at this address.</p>
      <Link to="/projects" className="button button--primary">
        See all my work
      </Link>
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
