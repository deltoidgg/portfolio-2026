import { cn } from "../cn";

interface BrandMarkProps {
  suffix?: string;
  className?: string;
}

export function BrandMark({ suffix, className }: BrandMarkProps) {
  return (
    <span className={cn("inline-flex items-baseline gap-3 text-ink", className)}>
      <span
        className="font-display text-[1.85rem] leading-none tracking-[-0.07em]"
        aria-hidden="true"
      >
        WA
      </span>
      {suffix ? <span className="text-sm text-ink-muted">{suffix}</span> : null}
    </span>
  );
}
