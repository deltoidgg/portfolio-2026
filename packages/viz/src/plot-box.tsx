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
    const container = node;
    let disposed = false;
    let frame = 0;
    let previousWidth = 0;

    function makeGeneratedPlotDecorative() {
      const svgNodes = container.querySelectorAll("svg");
      for (const svg of svgNodes) {
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        for (const labelledNode of svg.querySelectorAll("[aria-label]")) {
          labelledNode.removeAttribute("aria-label");
        }
      }
    }

    async function draw() {
      const Plot = await import("@observablehq/plot");
      if (disposed || !ref.current) return;
      render(Plot, ref.current);
      makeGeneratedPlotDecorative();
    }

    void (async () => {
      await draw();
      previousWidth = container.clientWidth;
    })();

    const observer = new ResizeObserver((entries) => {
      const width = Math.round(entries[0]?.contentRect.width ?? 0);
      if (!width || width === previousWidth) return;
      previousWidth = width;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => void draw());
    });
    observer.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      container.replaceChildren();
    };
  }, [render]);

  return <div ref={ref} role="img" aria-label={label} />;
}

/** Base style applied to every plot; colours come from the ui token vars. */
export const PLOT_STYLE = {
  background: "transparent",
  color: "var(--ui-ink-muted)",
  fontFamily: "inherit",
  fontSize: "11px",
} as const;

/** Clamp a container-driven plot width into a sensible range. */
export function plotWidth(node: HTMLElement, max = 680): number {
  return Math.max(240, Math.min(node.clientWidth, max));
}
