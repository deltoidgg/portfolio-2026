import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "ui";

const navClass =
  "inline-flex min-h-10 items-center rounded-md px-2 text-ink-muted transition-colors hover:bg-surface hover:text-ink";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-edge bg-canvas/80 backdrop-blur-md">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-14 max-w-5xl items-center justify-between px-3 sm:px-8"
      >
        <Link
          to="/"
          aria-label="Wasim Arif, home"
          className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md"
        >
          <span className="gradient mask block h-5 w-[31px]" role="img" aria-hidden="true" />
        </Link>
        <div className="flex items-center text-[0.8125rem] sm:gap-0.5 sm:text-sm">
          <Link
            to="/projects"
            className={navClass}
            activeProps={{ className: "!text-ink bg-surface" }}
          >
            Work
          </Link>
          <Link to="/writing" className={navClass} activeProps={{ className: "!text-ink" }}>
            Writing
          </Link>
          <a href="https://research.wasimarif.com" className={navClass}>
            Research
            <span className="sr-only"> (opens the research site)</span>
          </a>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
