import { IconArrowRight } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { formatPostDate, sortedPosts } from "../content/posts";
import { buildMetadata } from "../lib/metadata";

const description =
  "Writing about systems, evidence, accessibility, data, and product engineering in plain English.";

export const Route = createFileRoute("/writing/")({
  head: () => buildMetadata({ title: "Writing", description, path: "/writing" }),
  component: WritingIndex,
});

function WritingIndex() {
  return (
    <div className="page-ledger mx-auto max-w-[var(--ui-page-width)] px-5 py-14 sm:px-8 lg:px-0 lg:py-20">
      <header className="editorial-intro">
        <p className="section-kicker">Writing</p>
        <h1>Evidence, interfaces, and the systems underneath.</h1>
        <p>
          Things I have built, measured, or changed my mind about. Formal papers and datasets live
          in the <a href="https://research.wasimarif.com">Research Lab</a>; these are the same ideas
          in plain English.
        </p>
      </header>

      <section className="border-t border-edge" aria-labelledby="writing-list-heading">
        <h2 id="writing-list-heading" className="sr-only">
          Published writing
        </h2>
        {sortedPosts.map((post, index) => (
          <Link
            key={post.slug}
            to="/writing/$slug"
            params={{ slug: post.slug }}
            className="index-row index-row--article group"
          >
            <span className="index-row__number">{String(index + 1).padStart(2, "0")}</span>
            <span className="index-row__main">
              <small>
                {post.category} · {formatPostDate(post.date)} · {post.readingTime}
              </small>
              <strong>{post.title}</strong>
              <p>{post.deck}</p>
            </span>
            <span className="index-row__proof">
              <small>Topics</small>
              <p>{post.tags.join(" · ")}</p>
            </span>
            <IconArrowRight size={17} aria-hidden="true" />
          </Link>
        ))}
      </section>
    </div>
  );
}
