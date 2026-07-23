import { IconMail, IconMenu2, IconX } from "@tabler/icons-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { BrandMark, ThemeToggle } from "ui";

const navClass =
  "site-nav-link inline-flex min-h-11 items-center px-2 text-sm text-ink-muted transition-colors hover:text-ink";

export function SiteHeader() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);
  const isHome = pathname === "/";

  return (
    <header className="site-header sticky top-0 z-50 border-b border-edge/80 bg-canvas/88 backdrop-blur-xl">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-[var(--ui-shell-width)] items-center justify-between px-5 sm:px-8 lg:h-[5.5rem] lg:px-[var(--ui-shell-gutter)]"
      >
        <Link
          to="/"
          aria-label="Wasim Arif, home"
          className="inline-flex min-h-11 items-center rounded-sm"
          onClick={() => setMenuOpen(false)}
        >
          <BrandMark />
        </Link>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/projects"
            className={navClass}
            activeProps={{ className: "site-nav-link site-nav-link--active !text-ink" }}
          >
            Work
          </Link>
          <Link
            to="/writing"
            className={navClass}
            activeProps={{ className: "site-nav-link site-nav-link--active !text-ink" }}
          >
            Writing
          </Link>
          <a href="https://research.wasimarif.com" className={navClass}>
            Research
          </a>
          <Link
            to="/about"
            className={navClass}
            activeProps={{ className: "site-nav-link site-nav-link--active !text-ink" }}
          >
            About
          </Link>
          <a
            href="mailto:wasim.arif@live.co.uk"
            className={
              isHome
                ? navClass
                : "inline-flex min-h-10 items-center gap-2 rounded-[3px] border border-edge px-3 text-sm text-ink transition-colors hover:border-edge-strong hover:bg-surface/70"
            }
          >
            {!isHome ? <IconMail size={14} aria-hidden="true" /> : null}
            Contact
          </a>
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            ref={menuButtonRef}
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-sm text-ink-muted hover:text-ink"
          >
            {menuOpen ? (
              <IconX size={20} aria-hidden="true" />
            ) : (
              <IconMenu2 size={20} aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {menuOpen ? (
        <div id="mobile-navigation" className="border-t border-edge bg-canvas px-5 py-4 md:hidden">
          <div className="mx-auto grid max-w-[var(--ui-shell-width)] gap-1">
            <Link to="/projects" className={navClass} onClick={() => setMenuOpen(false)}>
              Work
            </Link>
            <Link to="/writing" className={navClass} onClick={() => setMenuOpen(false)}>
              Writing
            </Link>
            <a href="https://research.wasimarif.com" className={navClass}>
              Research
            </a>
            <Link to="/about" className={navClass} onClick={() => setMenuOpen(false)}>
              About
            </Link>
            <a href="mailto:wasim.arif@live.co.uk" className={navClass}>
              Contact
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
