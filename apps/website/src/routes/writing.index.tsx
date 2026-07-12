import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "ui";
import { formatPostDate, sortedPosts } from "../content/posts";
import { buildMetadata } from "../lib/metadata";

const description =
  "Write-ups, tutorials, and research retold for working engineers: accessibility, design systems, data, and product engineering.";

export const Route = createFileRoute("/writing/")({
  head: () => buildMetadata({ title: "Writing", description, path: "/writing" }),
  component: WritingIndex,
});

function WritingIndex() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16 sm:px-8 sm:py-20">
      <header className="mb-14">
        <h1 className="mb-3 text-2xl font-semibold text-ink">Writing</h1>
        <p className="text-base leading-relaxed text-ink-muted">
          Things I have built, measured, or changed my mind about. The research lives in full at{" "}
          <a
            href="https://research.wasimarif.com"
            className="text-accent-ink underline underline-offset-2 hover:text-accent"
          >
            research.wasimarif.com
          </a>
          ; here I tell the same stories in plain English.
        </p>
      </header>

      <ul className="-mt-2 divide-y divide-edge">
        {sortedPosts.map((post) => (
          <li key={post.slug}>
            <Link to="/writing/$slug" params={{ slug: post.slug }} className="group block py-8">
              <p className="mb-2 flex items-center gap-2 text-sm text-ink-subtle">
                <time dateTime={post.date}>{formatPostDate(post.date)}</time>
                <span aria-hidden="true">·</span>
                <span>{post.readingTime}</span>
              </p>
              <h2 className="mb-2 text-xl font-medium leading-snug tracking-tight text-ink transition-colors group-hover:text-accent-ink text-balance">
                {post.title}
              </h2>
              <p className="leading-relaxed text-ink-muted text-pretty">{post.deck}</p>
              {post.tags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Badge key={tag} tone="neutral">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
