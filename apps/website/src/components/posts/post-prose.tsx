import type { ReactNode } from "react";

/**
 * Blog typography. Tuned for long-form reading: larger type, a relaxed measure,
 * a clear heading scale, and theme-aware ink so it reads well in light or dark.
 */
export function PostProse({ children }: { children: ReactNode }) {
  return (
    <div
      className={[
        "text-[1.0625rem] leading-[1.75] text-ink-muted",
        "[&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-ink [&_h2]:text-balance",
        "[&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-ink",
        "[&_p]:mb-6 [&_p]:text-pretty",
        "[&_a]:font-medium [&_a]:text-accent-ink [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent",
        "[&_strong]:font-semibold [&_strong]:text-ink",
        "[&_ul]:mb-6 [&_ul]:list-disc [&_ul]:space-y-2.5 [&_ul]:pl-5",
        "[&_ol]:mb-6 [&_ol]:list-decimal [&_ol]:space-y-2.5 [&_ol]:pl-5",
        "[&_li]:pl-1 [&_li::marker]:text-ink-subtle",
        "[&_code]:rounded [&_code]:bg-surface [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-ink",
        "[&_blockquote]:my-6 [&_blockquote]:border-l-2 [&_blockquote]:border-accent-edge [&_blockquote]:pl-4 [&_blockquote]:text-ink",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
