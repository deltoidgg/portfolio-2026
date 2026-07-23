import { cn } from "../cn";

interface StatProps {
  value: string;
  label: string;
  className?: string;
}

/** Big-number stat block for paper heroes and dataset summaries. */
export function Stat({ value, label, className }: StatProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="font-display text-3xl text-accent-ink tabular-nums">{value}</span>
      <span className="text-xs text-ink-subtle leading-snug">{label}</span>
    </div>
  );
}
