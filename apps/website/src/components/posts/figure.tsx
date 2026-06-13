import type { ReactNode } from "react";

/** Chart (or any visual) with a caption, spaced for article flow. */
export function Figure({ children, caption }: { children: ReactNode; caption: string }) {
  return (
    <figure className="my-10">
      <div className="rounded-lg border border-edge bg-surface px-4 py-5 sm:px-6">{children}</div>
      <figcaption className="mt-3 text-xs leading-relaxed text-ink-subtle">{caption}</figcaption>
    </figure>
  );
}
