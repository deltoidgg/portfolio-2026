import { createFileRoute, Link } from "@tanstack/react-router";
import { formatPostDate, sortedPosts } from "../content/posts";
import { buildMetadata } from "../lib/metadata";

const description =
  "Writing about accessibility, design systems, data and building things for the web, in plain English.";

export const Route = createFileRoute("/writing/")({
  head: () => buildMetadata({ title: "Writing", description, path: "/writing" }),
  component: WritingIndex,
});

function WritingIndex() {
  return (
    <div className="page">
      <header className="page-intro">
        <h1>Writing</h1>
        <p>
          Things I&rsquo;ve built, measured or changed my mind about. The formal papers and data
          live on my <a href="https://research.wasimarif.com">research site</a>; this is where I
          explain the same ideas in plain English.
        </p>
      </header>

      <section aria-label="Posts" className="post-list">
        {sortedPosts.map((post) => (
          <Link
            key={post.slug}
            to="/writing/$slug"
            params={{ slug: post.slug }}
            className="post-row"
          >
            <time dateTime={post.date}>{formatPostDate(post.date)}</time>
            <span>
              <strong>{post.title}</strong>
              <span>{post.deck}</span>
              <small>{post.readingTime}</small>
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
