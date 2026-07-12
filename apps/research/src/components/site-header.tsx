import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "ui";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-edge bg-canvas/85 backdrop-blur-md">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-14 max-w-5xl items-center justify-between px-3 sm:px-8"
      >
        <Link
          to="/"
          aria-label="Wasim Arif research, home"
          className="inline-flex min-h-10 items-center rounded-md px-2 text-sm font-medium text-ink transition-colors hover:bg-surface hover:text-ink-muted"
        >
          WA <span className="ml-1 hidden font-normal text-ink-subtle sm:inline">/ Research</span>
        </Link>
        <div className="flex items-center text-[0.8125rem] sm:gap-0.5 sm:text-sm">
          <Link
            to="/papers/$slug"
            params={{ slug: "design-systems-accessibility" }}
            className="inline-flex min-h-10 items-center rounded-md px-2 text-ink-muted transition-colors hover:bg-surface hover:text-ink"
            activeProps={{ className: "!text-ink bg-surface" }}
          >
            Paper
          </Link>
          <Link
            to="/"
            hash="data-explorers"
            className="inline-flex min-h-10 items-center rounded-md px-2 text-ink-muted transition-colors hover:bg-surface hover:text-ink"
          >
            Data
          </Link>
          <a
            href="https://wasimarif.com"
            className="inline-flex min-h-10 items-center rounded-md px-2 text-ink-muted transition-colors hover:bg-surface hover:text-ink"
          >
            Portfolio
          </a>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
