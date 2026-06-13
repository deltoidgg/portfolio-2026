import { IconArrowUpRight } from "@tabler/icons-react";

/** A prominent "go deeper" link, used to hand readers over to the research app. */
export function LinkCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="group my-8 flex items-start justify-between gap-4 rounded-lg border border-edge bg-surface px-5 py-4 transition-colors hover:border-edge-strong"
    >
      <span className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink group-hover:text-accent-ink transition-colors">
          {title}
        </span>
        <span className="text-sm leading-relaxed text-ink-muted">{description}</span>
      </span>
      <IconArrowUpRight
        size={18}
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-ink-subtle transition-colors group-hover:text-accent-ink"
      />
    </a>
  );
}
