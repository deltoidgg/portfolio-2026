import { useEffect, useRef } from "react";

export type PlotModule = typeof import("@observablehq/plot");

/** Client-only Observable Plot container (Plot is dynamically imported, never SSR'd). */
export function PlotBox({
  label,
  render,
}: {
  label: string;
  render: (Plot: PlotModule, node: HTMLElement) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let disposed = false;
    void (async () => {
      const Plot = await import("@observablehq/plot");
      if (disposed || !ref.current) return;
      render(Plot, ref.current);
    })();
    return () => {
      disposed = true;
      node.replaceChildren();
    };
  }, [render]);

  return <div ref={ref} role="img" aria-label={label} />;
}

/** Base style applied to every plot; colours come from the ui token vars. */
export const PLOT_STYLE = {
  background: "transparent",
  fontFamily: "inherit",
  fontSize: "11px",
} as const;

/** Clamp a container-driven plot width into a sensible range. */
export function plotWidth(node: HTMLElement, max = 680): number {
  return Math.max(300, Math.min(node.clientWidth, max));
}
