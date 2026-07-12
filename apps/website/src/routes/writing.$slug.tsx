import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { postComponentBySlug } from "../components/posts/post-registry";
import { PostLayout } from "../components/posts/post-layout";
import { postBySlug } from "../content/posts";
import { buildMetadata } from "../lib/metadata";

export const Route = createFileRoute("/writing/$slug")({
  loader: ({ params }) => {
    const post = postBySlug(params.slug);
    if (!post || !postComponentBySlug(params.slug)) throw notFound();
    return { post };
  },
  head: ({ loaderData }) =>
    loaderData
      ? buildMetadata({
          title: loaderData.post.title,
          description: loaderData.post.deck,
          path: `/writing/${loaderData.post.slug}`,
          type: "article",
          publishedTime: loaderData.post.date,
        })
      : { meta: [] },
  component: PostPage,
  notFoundComponent: () => (
    <div className="max-w-2xl mx-auto px-6 py-16 sm:px-8">
      <p className="text-sm text-ink-muted">
        No such post.{" "}
        <Link to="/writing" className="text-accent-ink underline underline-offset-2">
          Back to writing
        </Link>
      </p>
    </div>
  ),
});

function PostPage() {
  const { post } = Route.useLoaderData();
  const Body = postComponentBySlug(post.slug);
  if (!Body) return null;

  return (
    <PostLayout meta={post}>
      <Body />
    </PostLayout>
  );
}
