import type { ReactNode } from "react";
import { useId } from "react";
import { cn } from "../cn";

interface SectionProps {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/** A labelled page section: heading wired to the region via aria-labelledby. */
export function Section({ id, title, description, children, className }: SectionProps) {
  const headingId = useId();
  return (
    <section id={id} aria-labelledby={headingId} className={cn("mb-20 scroll-mt-24", className)}>
      <h2 id={headingId} className="text-lg font-medium text-ink mb-2">
        {title}
      </h2>
      {description ? (
        <p className="text-ink-muted text-sm leading-relaxed mb-8">{description}</p>
      ) : (
        <div className="mb-8" />
      )}
      {children}
    </section>
  );
}
