import { IconMenu2, IconX } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { BrandMark, ThemeToggle } from "ui";

const navClass =
  "site-nav-link inline-flex min-h-11 items-center px-2 text-[0.9375rem] text-ink-muted transition-colors hover:text-ink";
const activeProps = { className: "site-nav-link site-nav-link--active !text-ink" };
// both icons sit on top of each other and swap, so opening the menu has a small turn instead of a snap
const menuIcon = "col-start-1 row-start-1 transition-[opacity,scale,rotate] duration-200 ease-out";

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
            className="grid h-11 w-11 place-items-center rounded-sm text-ink-muted transition-[color,scale] duration-200 hover:text-ink active:scale-90"
          >
            <IconMenu2
              size={20}
              aria-hidden="true"
              className={`${menuIcon} ${menuOpen ? "scale-50 -rotate-90 opacity-0" : ""}`}
            />
            <IconX
              size={20}
              aria-hidden="true"
              className={`${menuIcon} ${menuOpen ? "" : "scale-50 rotate-90 opacity-0"}`}
            />
          </button>
        </div>
      </nav>

      <div
        id="mobile-navigation"
        className="mobile-menu border-b border-edge bg-canvas md:hidden"
        data-open={menuOpen}
        inert={!menuOpen}
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
    </header>
  );
}
