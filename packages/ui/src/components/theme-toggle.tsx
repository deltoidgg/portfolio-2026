import { useEffect, useState } from "react";
import type { Theme } from "../theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Storage can be unavailable in private browsing; the in-page choice still works.
    }
    setTheme(next);
  }

  const label = theme === "light" ? "Switch to dark theme" : "Switch to light theme";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="group flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition-colors duration-200 hover:text-ink"
    >
      <span
        className="relative grid h-6 w-6 place-items-center rounded-full border border-edge bg-canvas shadow-[0_0_0_1px_rgb(255_255_255/0.015)] transition-colors duration-200 group-hover:border-edge-strong"
        aria-hidden="true"
      >
        <span
          className={
            "block h-1.5 w-1.5 rounded-full bg-accent-bright shadow-[0_0_10px_var(--ui-accent)] transition-transform duration-200 " +
            (theme === "light" ? "scale-75" : "scale-100")
          }
        />
      </span>
    </button>
  );
}
