import type { ReactNode } from "react";

/** Chart (or any visual) with a caption, spaced for article flow. */
export function Figure({ children, caption }: { children: ReactNode; caption: string }) {
  return (
    <figure className="reveal my-12">
      <div className="rounded-lg border border-edge bg-surface px-4 py-5 sm:px-6">{children}</div>
      <figcaption className="mt-3 text-sm leading-relaxed text-ink-subtle">{caption}</figcaption>
    </figure>
  );
}
