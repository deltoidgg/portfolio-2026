import { useEffect, useState } from "react";

/**
 * Tracks which section a reader is in for a table of contents: the last section whose top has
 * passed 30% of the viewport, or the final section once the page is scrolled to the bottom.
 * Reads layout at most once per frame while scrolling.
 */
export function useActiveSection(ids: readonly string[]): string {
  const [active, setActive] = useState(ids[0] ?? "");

  useEffect(() => {
    if (ids.length === 0) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const threshold = window.innerHeight * 0.3;
      let current = ids[0]!;
      for (const id of ids) {
        const node = document.getElementById(id);
        if (node && node.getBoundingClientRect().top <= threshold) current = id;
      }
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      setActive(atBottom ? ids[ids.length - 1]! : current);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [ids]);

  return active;
}
