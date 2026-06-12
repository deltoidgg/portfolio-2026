import type { ReactNode } from "react";
import { cn } from "../cn";

interface ProseProps {
  children: ReactNode;
  className?: string;
}

/**
 * Typographic container for long-form content. Styles plain HTML elements so
 * paper/article bodies don't need utility classes on every node.
 */
export function Prose({ children, className }: ProseProps) {
  return (
    <div
      className={cn(
        "text-ink-muted text-sm leading-relaxed",
        "[&_h3]:text-ink [&_h3]:text-base [&_h3]:font-medium [&_h3]:mt-8 [&_h3]:mb-3",
        "[&_p]:mb-4",
        "[&_a]:text-accent-ink [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent",
        "[&_strong]:text-ink [&_strong]:font-medium",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ul]:space-y-1",
        "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_ol]:space-y-1",
        "[&_code]:font-mono [&_code]:text-[0.8125rem] [&_code]:text-ink",
        className,
      )}
    >
      {children}
    </div>
  );
}
