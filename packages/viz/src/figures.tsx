import { PLOT_STYLE, PlotBox, plotWidth } from "./plot-box";

/**
 * Generic research figures. Estimates are passed structurally (label + IRR +
 * CI bounds) so this package stays decoupled from the datasets schemas.
 */
export interface FigureEstimate {
  label: string;
  irr: number;
  ciLow: number;
  ciHigh: number;
}

/** Lets a value label sit on top of a reference line without the line running through it. */
const LABEL_HALO = { stroke: "var(--ui-canvas)", strokeWidth: 4 } as const;

/**
 * Round-number ticks for a log axis, so it reads 0.3, 0.5, 1, 1.5 instead of a crowd of
 * near-duplicates that the browser then has to drop. Falls back to automatic ticks.
 */
function logTicks(values: number[]): number[] | undefined {
  const candidates = [0.1, 0.2, 0.3, 0.5, 0.7, 1, 1.5, 2, 3, 5, 7, 10];
  const low = Math.min(...values);
  const high = Math.max(...values);
  const ticks = candidates.filter((candidate) => candidate >= low && candidate <= high);
  return ticks.length >= 3 ? ticks : undefined;
}

/** Forest plot of IRR estimates (log-scale x axis, 95% CIs, reference line at 1). */
export function ForestPlot({ estimates, title }: { estimates: FigureEstimate[]; title: string }) {
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

  const height = 76 + rows.length * 44;

  return (
    <PlotBox
      label={ariaLabel}
      height={height}
      render={(Plot, node) => {
        node.replaceChildren(
          Plot.plot({
            width: plotWidth(node),
            height,
            marginLeft: 170,
            marginRight: 44,
            marginBottom: 46,
            style: PLOT_STYLE,
            x: {
              type: "log",
              label: "Incidence-rate ratio (log scale)",
              grid: true,
              ticks: logTicks([1, ...rows.flatMap((row) => [row.low, row.high])]),
              tickFormat: (value: number) =>
                Number(value)
                  .toFixed(2)
                  .replace(/\.?0+$/, ""),
            },
            y: { domain: rows.map((row) => row.label), label: null, tickSize: 0 },
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
                ...LABEL_HALO,
              }),
            ],
          }),
        );
      }}
    />
  );
}

/** "Partial (25-49)" becomes "Partial", so axis labels stay level and never collide. */
const shortBand = (band: string) => band.replace(/\s*\(.*\)$/, "");

export interface GradientPoint {
  band: string;
  unadjustedMean: number;
  adjustedIrr: number | null;
}

/** Unadjusted band means next to adjusted IRRs: the attenuation picture. */
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
      height={230 * 2 + 24}
      render={(Plot, node) => {
        const w = plotWidth(node);
        const domain = points.map((point) => point.band);
        const unadjusted = Plot.plot({
          width: w,
          height: 230,
          marginBottom: 28,
          style: PLOT_STYLE,
          x: { domain, label: null, tickFormat: shortBand },
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
          marginBottom: 28,
          style: PLOT_STYLE,
          x: { domain, label: null, tickFormat: shortBand },
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

  const height = 76 + sorted.length * 34;

  return (
    <PlotBox
      label={ariaLabel}
      // the plot plus the colour legend that sits above it
      height={height + 38}
      render={(Plot, node) => {
        node.replaceChildren(
          Plot.plot({
            width: plotWidth(node),
            height,
            marginLeft: 150,
            marginRight: 20,
            marginBottom: 46,
            style: PLOT_STYLE,
            x: { label: "Standardized PPML coefficient (per SD of adoption)", grid: true },
            y: { domain: sorted.map((point) => point.category), label: null, tickSize: 0 },
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
  usLabel = "US (H1, agency FE)",
  ukLabel = "UK (H4, org-type FE)",
}: {
  usIrr: number;
  ukEstimate: FigureEstimate;
  window: number;
  usLabel?: string;
  ukLabel?: string;
}) {
  const rows = [
    {
      label: usLabel,
      irr: usIrr,
      low: null as number | null,
      high: null as number | null,
    },
    {
      label: ukLabel,
      irr: ukEstimate.irr,
      low: ukEstimate.ciLow,
      high: ukEstimate.ciHigh,
    },
  ];
  const ariaLabel = `US strong-adoption IRR ${usIrr.toFixed(2)}; UK IRR ${ukEstimate.irr.toFixed(2)} with 95% CI [${ukEstimate.ciLow.toFixed(2)}, ${ukEstimate.ciHigh.toFixed(2)}]; pre-registered window ±${comparisonWindow.toFixed(2)} around the US value.`;

  return (
    <PlotBox
      label={ariaLabel}
      height={186}
      render={(Plot, node) => {
        node.replaceChildren(
          Plot.plot({
            width: plotWidth(node),
            height: 186,
            marginLeft: 150,
            marginRight: 24,
            marginBottom: 46,
            style: PLOT_STYLE,
            x: { label: "Incidence-rate ratio (strong-adoption contrast)", grid: true },
            y: { domain: rows.map((row) => row.label), label: null, tickSize: 0 },
            marks: [
              // with no y channel the window runs the full height of the plot
              Plot.rectX([{ low: usIrr - comparisonWindow, high: usIrr + comparisonWindow }], {
                x1: "low",
                x2: "high",
                fill: "var(--ui-accent)",
                fillOpacity: 0.1,
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
                // up and to the right of the dot, clear of the dotted line at the US value
                textAnchor: "start",
                dx: 8,
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
