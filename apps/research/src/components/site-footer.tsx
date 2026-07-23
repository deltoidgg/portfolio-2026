import { BrandMark, StatusDot } from "ui";

const links = [
  { label: "GitHub", href: "https://github.com/deltoidgg" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/wasimarif/" },
  { label: "Bluesky", href: "https://bsky.app/profile/rerixo.bsky.social" },
  { label: "Email", href: "mailto:wasim.arif@live.co.uk" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-edge">
      <div className="mx-auto flex max-w-[var(--ui-shell-width)] flex-col gap-6 px-5 py-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-[var(--ui-shell-gutter)]">
        <div className="flex items-center gap-4">
          <BrandMark className="[&>span:first-child]:text-xl" />
          <span className="text-xs text-ink-subtle">© 2026 Wasim Arif, London</span>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="text-xs text-ink-muted transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
          <StatusDot label="Research site available" />
        </nav>
      </div>
    </footer>
  );
}
