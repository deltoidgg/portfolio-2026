import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="border-b border-edge">
      <nav
        aria-label="Primary"
        className="max-w-2xl mx-auto px-6 sm:px-8 h-14 flex items-center justify-between"
      >
        <Link
          to="/"
          className="text-sm font-medium text-ink hover:text-ink-muted transition-colors"
        >
          Wasim Arif
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <Link
            to="/writing"
            className="text-ink-muted hover:text-ink transition-colors"
            activeProps={{ className: "text-ink" }}
          >
            Writing
          </Link>
          <a
            href="https://research.wasimarif.com"
            className="text-ink-muted hover:text-ink transition-colors"
          >
            Research
          </a>
        </div>
      </nav>
    </header>
  );
}
