import { cn } from "../cn";

type StatusTone = "live" | "wip" | "paused";

const toneClasses: Record<StatusTone, string> = {
  live: "bg-accent",
  wip: "bg-warn",
  paused: "bg-ink-subtle",
};

const toneLabels: Record<StatusTone, string> = {
  live: "Live",
  wip: "Work in progress",
  paused: "Paused",
};

interface StatusDotProps {
  tone?: StatusTone;
  label?: string;
  className?: string;
}

/** The pulsing status dot used across project/paper listings. */
export function StatusDot({ tone = "live", label, className }: StatusDotProps) {
  const accessibleLabel = label ?? toneLabels[tone];
  return (
    <span
      className={cn(
        "inline-block w-1.5 h-1.5 rounded-full animate-pulse [animation-duration:5s]",
        toneClasses[tone],
        className,
      )}
      role="img"
      aria-label={accessibleLabel}
      title={accessibleLabel}
    />
  );
}
