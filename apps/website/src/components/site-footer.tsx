const links = [
  { label: "GitHub", href: "https://github.com/deltoidgg" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/wasimarif/" },
  { label: "X", href: "https://x.com/xwasim" },
  { label: "Bluesky", href: "https://bsky.app/profile/rerixo.bsky.social" },
  { label: "Email", href: "mailto:wasim.arif@live.co.uk" },
  { label: "Source", href: "https://github.com/deltoidgg/portfolio-2026" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-edge mt-20">
      <div className="max-w-2xl mx-auto px-6 sm:px-8 py-8 flex flex-wrap items-center justify-between gap-4 text-sm">
        <p className="text-ink-subtle">Wasim Arif, London</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              {...(link.href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="text-ink-muted hover:text-ink transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
