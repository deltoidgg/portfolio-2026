import type { ReactNode } from "react";

/** An aside that sits next to the main argument without interrupting it. */
export function Callout({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <aside
      aria-label={title ?? "Note"}
      className="my-10 rounded-lg bg-surface px-6 py-5 text-[0.9875rem] leading-relaxed text-ink-muted"
    >
      {title ? <strong className="font-semibold text-ink">{title} </strong> : null}
      {children}
    </aside>
  );
}
