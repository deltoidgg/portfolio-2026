import { IconMenu2, IconX } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { BrandMark, ThemeToggle } from "ui";

const navClass =
  "site-nav-link inline-flex min-h-11 items-center px-2 text-[0.9375rem] text-ink-muted transition-colors hover:text-ink";
const activeProps = { className: "site-nav-link site-nav-link--active !text-ink" };

export function SiteHeader() {
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

  const close = () => setMenuOpen(false);

  return (
    <header className="site-header sticky top-0 z-50 border-b bg-canvas/85 backdrop-blur-xl">
      <nav aria-label="Primary" className="shell flex h-16 items-center justify-between lg:h-20">
        <Link
          to="/"
          aria-label="Wasim Arif, home"
          className="inline-flex min-h-11 items-center rounded-sm"
          onClick={close}
        >
          <BrandMark />
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          <Link to="/projects" className={navClass} activeProps={activeProps}>
            Work
          </Link>
          <Link to="/writing" className={navClass} activeProps={activeProps}>
            Writing
          </Link>
          <a href="https://research.wasimarif.com" className={navClass}>
            Research
          </a>
          <Link to="/about" className={navClass} activeProps={activeProps}>
            About
          </Link>
          <a href="mailto:wasim.arif@live.co.uk" className={navClass}>
            Contact
          </a>
          <span className="ml-2">
            <ThemeToggle />
          </span>
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
        <div
          id="mobile-navigation"
          className="mobile-menu border-t border-edge bg-canvas md:hidden"
        >
          <div className="shell grid gap-1 py-4">
            <Link to="/projects" className={navClass} onClick={close}>
              Work
            </Link>
            <Link to="/writing" className={navClass} onClick={close}>
              Writing
            </Link>
            <a href="https://research.wasimarif.com" className={navClass}>
              Research
            </a>
            <Link to="/about" className={navClass} onClick={close}>
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
