import type { ReactNode } from "react";

/** An aside that sits next to the main argument without interrupting it. */
export function Callout({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div
      role="note"
      aria-label={title ?? "Note"}
      className="my-8 rounded-md border-l-2 border-accent bg-surface px-5 py-4 text-sm leading-relaxed text-ink-muted"
    >
      {title ? <p className="mb-1.5 font-medium text-ink">{title}</p> : null}
      {children}
    </div>
  );
}
