import { IconArrowLeft } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Badge } from "ui";
import { formatPostDate, type PostMeta } from "../../content/posts";

export function PostLayout({ meta, children }: { meta: PostMeta; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl px-6 py-16 sm:px-8 sm:py-20">
      <Link
        to="/writing"
        className="mb-10 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <IconArrowLeft size={16} aria-hidden="true" />
        Writing
      </Link>

      <header className="mb-10 border-b border-edge pb-8">
        <p className="mb-4 flex items-center gap-2 text-sm text-ink-subtle">
          <time dateTime={meta.date}>{formatPostDate(meta.date)}</time>
          <span aria-hidden="true">·</span>
          <span>{meta.readingTime}</span>
        </p>
        <h1 className="mb-4 text-3xl font-semibold leading-tight tracking-tight text-ink text-balance sm:text-4xl">
          {meta.title}
        </h1>
        <p className="text-lg leading-relaxed text-ink-muted text-pretty">{meta.deck}</p>
        {meta.tags.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {meta.tags.map((tag) => (
              <Badge key={tag} tone="neutral">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </header>

      {children}
    </article>
  );
}
