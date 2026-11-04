import { IconMenu2, IconX } from "@tabler/icons-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { BrandMark, ThemeToggle } from "ui";

const navClass =
  "site-nav-link inline-flex min-h-11 items-center px-2 text-[0.9375rem] text-ink-muted transition-colors hover:text-ink";
const activeClass = `${navClass} site-nav-link--active !text-ink`;
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
  // the datasets link points at a section of the index, but the explorers live under it too
  const inExplorers = useRouterState({ select: (state) => state.location.pathname }).startsWith(
    "/explore",
  );
  const links = (
    <>
      <Link
        to="/papers/$slug"
        params={{ slug: "design-systems-accessibility" }}
        className={navClass}
        activeProps={{ className: "site-nav-link site-nav-link--active !text-ink" }}
        onClick={close}
      >
        Papers
      </Link>
      <Link
        to="/"
        hash="datasets"
        className={inExplorers ? activeClass : navClass}
        aria-current={inExplorers ? "true" : undefined}
        onClick={close}
      >
        Datasets
      </Link>
      <Link to="/" hash="methods" className={navClass} onClick={close}>
        Methods
      </Link>
      <a href="https://wasimarif.com/about" className={navClass}>
        About
      </a>
      <a href="mailto:wasim.arif@live.co.uk" className={navClass}>
        Contact
      </a>
    </>
  );

  return (
    <header className="site-header sticky top-0 z-50 border-b bg-canvas/85 backdrop-blur-xl">
      <nav aria-label="Research" className="shell flex h-16 items-center justify-between lg:h-20">
        <Link
          to="/"
          aria-label="Wasim Arif Research, home"
          className="inline-flex min-h-11 items-center rounded-sm"
          onClick={close}
        >
          <BrandMark suffix="Research" />
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          {links}
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
            aria-controls="research-mobile-navigation"
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
        id="research-mobile-navigation"
        className="mobile-menu border-b border-edge bg-canvas md:hidden"
        data-open={menuOpen}
        inert={!menuOpen}
      >
        <div className="shell grid gap-1 py-4">{links}</div>
      </div>
    </header>
  );
}
