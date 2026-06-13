import type { ReactNode } from "react";

/**
 * Blog typography. Sized up from the ui Prose for long-form reading, with
 * article-level section headings; same link, emphasis, and code treatment.
 */
export function PostProse({ children }: { children: ReactNode }) {
  return (
    <div
      className={[
        "text-[0.9375rem] leading-7 text-ink-muted",
        "[&_h2]:text-ink [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-12 [&_h2]:mb-4",
        "[&_p]:mb-5",
        "[&_a]:text-accent-ink [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent",
        "[&_strong]:text-ink [&_strong]:font-medium",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-5 [&_ul]:space-y-2",
        "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-5 [&_ol]:space-y-2",
        "[&_code]:font-mono [&_code]:text-[0.8125rem] [&_code]:text-ink",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
