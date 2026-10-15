const links = [
  { label: "wasimarif.com", href: "https://wasimarif.com" },
  { label: "GitHub", href: "https://github.com/deltoidgg/portfolio-2026" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/wasimarif/" },
  { label: "Email", href: "mailto:wasim.arif@live.co.uk" },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-edge">
      <div className="shell flex flex-col gap-5 py-8 text-sm md:flex-row md:items-center md:justify-between">
        <p className="max-w-xl text-ink-subtle">
          © 2026 Wasim Arif. Code is MIT licensed; papers and figures are CC BY 4.0. Source data
          keeps its original terms.
        </p>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
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
