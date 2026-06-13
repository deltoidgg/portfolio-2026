import { IconArrowLeft } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { formatPostDate, type PostMeta } from "../../content/posts";

export function PostLayout({ meta, children }: { meta: PostMeta; children: ReactNode }) {
  return (
    <article className="max-w-2xl mx-auto px-6 py-16 sm:px-8 sm:py-20">
      <Link
        to="/writing"
        className="mb-10 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <IconArrowLeft size={16} aria-hidden="true" />
        Writing
      </Link>

      <header className="mb-12">
        <h1 className="mb-4 text-2xl font-semibold leading-snug text-ink sm:text-3xl">
          {meta.title}
        </h1>
        <p className="mb-5 text-base leading-relaxed text-ink-muted">{meta.deck}</p>
        <p className="text-sm text-ink-subtle">
          <time dateTime={meta.date}>{formatPostDate(meta.date)}</time>
          <span aria-hidden="true"> · </span>
          {meta.readingTime}
        </p>
      </header>

      {children}
    </article>
  );
}
