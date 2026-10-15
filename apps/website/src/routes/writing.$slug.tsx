import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { postComponentBySlug } from "../components/posts/post-registry";
import { PostLayout } from "../components/posts/post-layout";
import { postBySlug } from "../content/posts";
import { buildMetadata } from "../lib/metadata";

export const Route = createFileRoute("/writing/$slug")({
  loader: ({ params }) => {
    const post = postBySlug(params.slug);
    if (!post) throw notFound();
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
    <div className="page message-page">
      <h1>No post here</h1>
      <p>I couldn&rsquo;t find anything at this address.</p>
      <Link to="/writing" className="button button--primary">
        See all writing
      </Link>
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
