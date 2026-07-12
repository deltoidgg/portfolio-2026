import type { ReactNode } from "react";
import { cn } from "../cn";

type BadgeTone = "accent" | "neutral" | "warn";

const toneClasses: Record<BadgeTone, string> = {
  accent: "border-accent-edge text-accent-ink bg-accent-soft",
  neutral: "border-edge text-ink-muted bg-surface-raised",
  warn: "border-warn/30 text-warn bg-warn/10",
};

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

/** Small label pill for statuses and categories. */
export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "text-[11px] leading-4 font-medium px-2 py-0.5 rounded border whitespace-nowrap",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
