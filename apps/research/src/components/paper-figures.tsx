import { useEffect, useRef } from "react";
import type { Estimate } from "datasets";

type PlotModule = typeof import("@observablehq/plot");

/** Client-only Observable Plot container (Plot is dynamically imported, never SSR'd). */
function PlotBox({
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

const PLOT_STYLE = {
  background: "transparent",
  fontFamily: "inherit",
  fontSize: "11px",
} as const;

function width(node: HTMLElement, max = 680): number {
  return Math.max(300, Math.min(node.clientWidth, max));
}

/** Forest plot of IRR estimates (log-scale x axis, 95% CIs, reference line at 1). */
export function ForestPlot({ estimates, title }: { estimates: Estimate[]; title: string }) {
  const rows = estimates.map((estimate) => ({
    label: estimate.label,
    irr: estimate.irr,
    low: estimate.ciLow,
    high: estimate.ciHigh,
  }));
  const ariaLabel = `${title}: ${rows
    .map(
      (row) =>
        `${row.label} IRR ${row.irr.toFixed(2)} [${row.low.toFixed(2)}, ${row.high.toFixed(2)}]`,
    )
    .join("; ")}`;

  return (
    <PlotBox
      label={ariaLabel}
      render={(Plot, node) => {
        node.replaceChildren(
          Plot.plot({
            width: width(node),
            height: 60 + rows.length * 44,
            marginLeft: 170,
            marginRight: 44,
            style: PLOT_STYLE,
            x: {
              type: "log",
              label: "Incidence-rate ratio (log scale)",
              grid: true,
              tickFormat: (value: number) =>
                Number(value)
                  .toFixed(2)
                  .replace(/\.?0+$/, ""),
            },
            y: { domain: rows.map((row) => row.label), label: null },
            marks: [
              Plot.ruleX([1], { stroke: "var(--ui-ink-subtle)", strokeDasharray: "4 3" }),
              Plot.ruleY(rows, {
                y: "label",
                x1: "low",
                x2: "high",
                stroke: "var(--ui-accent)",
                strokeWidth: 2,
              }),
              Plot.dot(rows, {
                y: "label",
                x: "irr",
                fill: "var(--ui-accent)",
                r: 4.5,
              }),
              Plot.text(rows, {
                y: "label",
                x: "high",
                text: (row: (typeof rows)[number]) => ` ${row.irr.toFixed(2)}`,
                textAnchor: "start",
                fill: "var(--ui-ink-muted)",
              }),
            ],
          }),
        );
      }}
    />
  );
}

export interface GradientPoint {
  band: string;
  unadjustedMean: number;
  adjustedIrr: number | null;
}

/** Unadjusted band means next to adjusted IRRs — the attenuation picture. */
export function BandGradient({ points }: { points: GradientPoint[] }) {
  const ariaLabel = `Unadjusted mean violations and adjusted IRRs by adoption band: ${points
    .map(
      (point) =>
        `${point.band}: mean ${point.unadjustedMean.toFixed(2)}${
          point.adjustedIrr === null ? "" : `, adjusted IRR ${point.adjustedIrr.toFixed(2)}`
        }`,
    )
    .join("; ")}`;

  return (
    <PlotBox
      label={ariaLabel}
      render={(Plot, node) => {
        const w = width(node);
        const domain = points.map((point) => point.band);
        const unadjusted = Plot.plot({
          width: w,
          height: 230,
          marginBottom: 40,
          style: PLOT_STYLE,
          x: { domain, label: null, tickRotate: -18 },
          y: { label: "Mean violations (unadjusted)", grid: true },
          marks: [
            Plot.barY(points, {
              x: "band",
              y: "unadjustedMean",
              fill: "var(--ui-accent)",
              rx: 2,
            }),
            Plot.ruleY([0]),
          ],
        });
        const adjustedPoints = points.filter((point) => point.adjustedIrr !== null);
        const adjusted = Plot.plot({
          width: w,
          height: 230,
          marginBottom: 40,
          style: PLOT_STYLE,
          x: { domain, label: null, tickRotate: -18 },
          y: { label: "Adjusted IRR vs none (agency FE)", grid: true },
          marks: [
            Plot.ruleY([1], { stroke: "var(--ui-ink-subtle)", strokeDasharray: "4 3" }),
            Plot.lineY(adjustedPoints, {
              x: "band",
              y: "adjustedIrr",
              stroke: "var(--ui-accent-ink)",
              strokeWidth: 2,
            }),
            Plot.dot(adjustedPoints, {
              x: "band",
              y: "adjustedIrr",
              fill: "var(--ui-accent-ink)",
              r: 4,
            }),
          ],
        });
        const grid = document.createElement("div");
        grid.style.display = "grid";
        grid.style.gap = "1.5rem";
        grid.append(unadjusted, adjusted);
        node.replaceChildren(grid);
      }}
    />
  );
}

export interface CategoryPoint {
  category: string;
  mechanism: "component" | "template";
  betaStd: number;
  se: number;
}

/** Dot plot of standardized adoption gradients per violation category. */
export function CategoryDotPlot({ points }: { points: CategoryPoint[] }) {
  const sorted = [...points].sort((a, b) => a.betaStd - b.betaStd);
  const ariaLabel = `Standardized adoption gradient by category: ${sorted
    .map((point) => `${point.category} (${point.mechanism}) ${point.betaStd.toFixed(3)}`)
    .join("; ")}`;

  return (
    <PlotBox
      label={ariaLabel}
      render={(Plot, node) => {
        node.replaceChildren(
          Plot.plot({
            width: width(node),
            height: 60 + sorted.length * 34,
            marginLeft: 150,
            marginRight: 20,
            style: PLOT_STYLE,
            x: { label: "Standardized PPML coefficient (per SD of adoption)", grid: true },
            y: { domain: sorted.map((point) => point.category), label: null },
            color: {
              domain: ["component", "template"],
              range: ["var(--ui-accent)", "var(--ui-ink-subtle)"],
              legend: true,
            },
            marks: [
              Plot.ruleX([0], { stroke: "var(--ui-ink-subtle)", strokeDasharray: "4 3" }),
              Plot.ruleY(sorted, {
                y: "category",
                x1: (point: CategoryPoint) => point.betaStd - 1.96 * point.se,
                x2: (point: CategoryPoint) => point.betaStd + 1.96 * point.se,
                stroke: "mechanism",
                strokeWidth: 1.5,
              }),
              Plot.dot(sorted, {
                y: "category",
                x: "betaStd",
                fill: "mechanism",
                r: 4.5,
              }),
            ],
          }),
        );
      }}
    />
  );
}

/** US vs UK strong-adoption IRRs with the pre-registered ±window band around the US value. */
export function UsUkComparison({
  usIrr,
  ukEstimate,
  window: comparisonWindow,
}: {
  usIrr: number;
  ukEstimate: Estimate;
  window: number;
}) {
  const rows = [
    {
      label: "US (H1, agency FE)",
      irr: usIrr,
      low: null as number | null,
      high: null as number | null,
    },
    {
      label: "UK (H4, org-type FE)",
      irr: ukEstimate.irr,
      low: ukEstimate.ciLow,
      high: ukEstimate.ciHigh,
    },
  ];
  const ariaLabel = `US strong-adoption IRR ${usIrr.toFixed(2)}; UK IRR ${ukEstimate.irr.toFixed(2)} with 95% CI [${ukEstimate.ciLow.toFixed(2)}, ${ukEstimate.ciHigh.toFixed(2)}]; pre-registered window ±${comparisonWindow.toFixed(2)} around the US value.`;

  return (
    <PlotBox
      label={ariaLabel}
      render={(Plot, node) => {
        node.replaceChildren(
          Plot.plot({
            width: width(node),
            height: 170,
            marginLeft: 150,
            marginRight: 24,
            style: PLOT_STYLE,
            x: { label: "Incidence-rate ratio (strong-adoption contrast)", grid: true },
            y: { domain: rows.map((row) => row.label), label: null },
            marks: [
              Plot.rectX([0], {
                x1: usIrr - comparisonWindow,
                x2: usIrr + comparisonWindow,
                y1: -1,
                y2: 2,
                fill: "var(--ui-accent)",
                fillOpacity: 0.08,
              }),
              Plot.ruleX([1], { stroke: "var(--ui-ink-subtle)", strokeDasharray: "4 3" }),
              Plot.ruleX([usIrr], { stroke: "var(--ui-accent)", strokeDasharray: "2 3" }),
              Plot.ruleY(
                rows.filter((row) => row.low !== null),
                {
                  y: "label",
                  x1: "low",
                  x2: "high",
                  stroke: "var(--ui-accent-ink)",
                  strokeWidth: 2,
                },
              ),
              Plot.dot(rows, { y: "label", x: "irr", fill: "var(--ui-accent-ink)", r: 5 }),
              Plot.text(rows, {
                y: "label",
                x: "irr",
                text: (row: (typeof rows)[number]) => row.irr.toFixed(2),
                dy: -12,
                fill: "var(--ui-ink-muted)",
              }),
            ],
          }),
        );
      }}
    />
  );
}
