import { createFileRoute, Link } from "@tanstack/react-router";
import { formatPostDate, posts } from "../content/posts";

export const Route = createFileRoute("/writing/")({
  head: () => ({
    meta: [
      { title: "Writing · Wasim Arif" },
      {
        name: "description",
        content:
          "Write-ups, tutorials, and research retold for working engineers. Accessibility, design systems, data, and the occasional experiment.",
      },
    ],
  }),
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

      <ul className="space-y-12">
        {posts.map((post) => (
          <li key={post.slug}>
            <article>
              <p className="mb-2 text-sm text-ink-subtle">
                <time dateTime={post.date}>{formatPostDate(post.date)}</time>
                <span aria-hidden="true"> · </span>
                {post.readingTime}
              </p>
              <h2 className="mb-2 text-lg font-medium leading-snug">
                <Link
                  to="/writing/$slug"
                  params={{ slug: post.slug }}
                  className="text-ink transition-colors hover:text-accent-ink"
                >
                  {post.title}
                </Link>
              </h2>
              <p className="text-sm leading-relaxed text-ink-muted">{post.deck}</p>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
