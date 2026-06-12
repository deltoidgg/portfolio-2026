import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="border-b border-edge">
      <nav
        aria-label="Primary"
        className="max-w-3xl mx-auto px-6 sm:px-8 h-14 flex items-center justify-between"
      >
        <Link
          to="/"
          className="text-sm font-medium text-ink hover:text-ink-muted transition-colors"
        >
          Wasim Arif <span className="text-ink-subtle font-normal">/ Research</span>
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <Link
            to="/explore/$dataset"
            params={{ dataset: "uswds-a11y" }}
            className="text-ink-muted hover:text-ink transition-colors"
          >
            Data
          </Link>
          <a
            href="https://wasimarif.com"
            className="text-ink-muted hover:text-ink transition-colors"
          >
            Portfolio
          </a>
        </div>
      </nav>
    </header>
  );
}
