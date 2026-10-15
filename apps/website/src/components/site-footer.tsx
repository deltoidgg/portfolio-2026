const links = [
  { label: "GitHub", href: "https://github.com/deltoidgg" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/wasimarif/" },
  { label: "Bluesky", href: "https://bsky.app/profile/rerixo.bsky.social" },
  { label: "Email", href: "mailto:wasim.arif@live.co.uk" },
  { label: "RSS", href: "/rss.xml" },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-edge">
      <div className="shell flex flex-col gap-5 py-8 text-sm md:flex-row md:items-center md:justify-between">
        <p className="text-ink-subtle">
          © 2026 Wasim Arif. Made in London.{" "}
          <a
            href="https://github.com/deltoidgg/portfolio-2026"
            className="underline decoration-edge-strong underline-offset-4 transition-colors hover:text-ink hover:decoration-ink-subtle"
          >
            View the source
          </a>
          .
        </p>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              {...(link.href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="inline-flex min-h-8 items-center text-ink-muted transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
