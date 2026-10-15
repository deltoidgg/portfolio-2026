import { cn } from "../cn";

interface BrandMarkProps {
  suffix?: string;
  className?: string;
}

export function BrandMark({ suffix, className }: BrandMarkProps) {
  return (
    <span className={cn("inline-flex items-baseline gap-2 text-ink", className)} aria-hidden="true">
      <span className="font-display text-[1.45rem] leading-none tracking-[-0.01em]">
        Wasim Arif
      </span>
      {suffix ? <span className="text-sm text-ink-subtle">{suffix}</span> : null}
    </span>
  );
}
