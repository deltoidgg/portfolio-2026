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
        "[&_h2]:mt-14 [&_h2]:mb-4 [&_h2]:scroll-mt-28 [&_h2]:font-display [&_h2]:text-[2rem] [&_h2]:font-normal [&_h2]:leading-[1.1] [&_h2]:tracking-[-0.01em] [&_h2]:text-ink [&_h2]:text-balance",
        "[&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-ink",
        "[&_p]:mb-6 [&_p]:text-pretty",
        "[&_a]:text-ink [&_a]:underline [&_a]:decoration-accent-edge [&_a]:decoration-1 [&_a]:underline-offset-[0.2em] hover:[&_a]:decoration-accent",
        "[&_strong]:font-semibold [&_strong]:text-ink",
        "[&_ul]:mb-6 [&_ul]:list-disc [&_ul]:space-y-3 [&_ul]:pl-5",
        "[&_ol]:mb-6 [&_ol]:list-decimal [&_ol]:space-y-3 [&_ol]:pl-5",
        "[&_li]:pl-1 [&_li::marker]:text-ink-subtle",
        "[&_code]:rounded [&_code]:bg-surface [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-ink",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
