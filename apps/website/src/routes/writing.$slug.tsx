import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { postComponentBySlug } from "../components/posts/post-registry";
import { PostLayout } from "../components/posts/post-layout";
import { postBySlug } from "../content/posts";

export const Route = createFileRoute("/writing/$slug")({
  loader: ({ params }) => {
    const post = postBySlug(params.slug);
    if (!post || !postComponentBySlug(params.slug)) throw notFound();
    return { post };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: `${loaderData.post.title} · Wasim Arif` },
            { name: "description", content: loaderData.post.deck },
            { property: "og:title", content: loaderData.post.title },
            { property: "og:description", content: loaderData.post.deck },
            { property: "og:type", content: "article" },
            { property: "og:site_name", content: "Wasim Arif" },
            { property: "article:published_time", content: loaderData.post.date },
            { name: "twitter:card", content: "summary" },
          ],
        }
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
