import { useEffect, useId, useRef, useState } from "react";
import { DataTable, type DataTableColumn } from "ui";
import type { ExplorerConfig } from "../content/explorers";
import type { BandStat, GroupOption } from "../lib/explorer-queries";

type PlotModule = typeof import("@observablehq/plot");

function bandColumns(config: ExplorerConfig): Array<DataTableColumn<BandStat>> {
  return [
    { id: "label", header: config.scoreNoun, render: (row) => row.label },
    { id: "sites", header: "Sites", align: "right", render: (row) => row.sites.toLocaleString() },
    {
      id: "mean",
      header: "Mean violations",
      align: "right",
      render: (row) => row.meanViolations.toFixed(2),
    },
    {
      id: "median",
      header: "Median",
      align: "right",
      render: (row) => row.medianViolations.toFixed(0),
    },
    {
      id: "zero",
      header: "Violation-free",
      align: "right",
      render: (row) => `${(row.zeroShare * 100).toFixed(1)}%`,
    },
  ];
}

function renderCharts(
  Plot: PlotModule,
  meanNode: HTMLElement,
  zeroNode: HTMLElement,
  bands: BandStat[],
) {
  const width = Math.max(240, Math.min(meanNode.clientWidth, 640));
  const domain = bands.map((band) => band.label);

  meanNode.replaceChildren(
    Plot.plot({
      width,
      height: 240,
      marginLeft: 44,
      marginBottom: 44,
      style: { background: "transparent", fontFamily: "inherit", fontSize: "10px" },
      x: { domain, label: null, tickRotate: -18 },
      y: { label: "Mean violations", grid: true },
      marks: [
        Plot.barY(bands, { x: "label", y: "meanViolations", fill: "var(--ui-accent)", rx: 2 }),
        Plot.ruleY([0]),
      ],
    }),
  );

  zeroNode.replaceChildren(
    Plot.plot({
      width,
      height: 240,
      marginLeft: 44,
      marginBottom: 44,
      style: { background: "transparent", fontFamily: "inherit", fontSize: "10px" },
      x: { domain, label: null, tickRotate: -18 },
      y: { label: "Violation-free share", grid: true, tickFormat: ".0%" },
      marks: [
        Plot.barY(bands, { x: "label", y: "zeroShare", fill: "var(--ui-accent-ink)", rx: 2 }),
        Plot.ruleY([0]),
      ],
    }),
  );

  for (const node of [meanNode, zeroNode]) {
    for (const svg of node.querySelectorAll("svg")) {
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
      for (const labelledNode of svg.querySelectorAll("[aria-label]")) {
        labelledNode.removeAttribute("aria-label");
      }
    }
  }
}

export function BandExplorer({
  config,
  group,
  onGroupChange,
}: {
  config: ExplorerConfig;
  group: string;
  onGroupChange: (group: string) => void;
}) {
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [bands, setBands] = useState<BandStat[] | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const meanRef = useRef<HTMLDivElement>(null);
  const zeroRef = useRef<HTMLDivElement>(null);
  const selectId = useId();

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    void (async () => {
      try {
        const api = await import("../lib/explorer-queries");
        const groupList = await api.loadGroups(config);
        const validGroup = group === "" || groupList.some((option) => option.value === group);
        const bandStats = validGroup
          ? await api.loadBandStats(config, group === "" ? null : group)
          : [];
        if (cancelled) return;
        setGroups(groupList);
        setBands(bandStats);
        setError(null);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [config, group]);

  useEffect(() => {
    if (!bands) return;
    const chartBands = bands;
    const meanNode = meanRef.current;
    const zeroNode = zeroRef.current;
    if (!meanNode || !zeroNode) return;
    const meanChart = meanNode;
    const zeroChart = zeroNode;
    let disposed = false;
    let frame = 0;
    let previousWidth = 0;

    async function draw() {
      const Plot = await import("@observablehq/plot");
      if (disposed) return;
      renderCharts(Plot, meanChart, zeroChart, chartBands);
    }

    void (async () => {
      await draw();
      previousWidth = meanChart.clientWidth;
    })();

    const observer = new ResizeObserver((entries) => {
      const width = Math.round(entries[0]?.contentRect.width ?? 0);
      if (!width || width === previousWidth) return;
      previousWidth = width;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => void draw());
    });
    observer.observe(meanChart);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      meanChart.replaceChildren();
      zeroChart.replaceChildren();
    };
  }, [bands]);

  const totalSites = bands?.reduce((sum, band) => sum + band.sites, 0) ?? 0;
  const selectedGroupLabel =
    group === "" ? null : (groups.find((option) => option.value === group)?.label ?? group);
  const chartLabel = (metric: string) =>
    bands
      ? `${metric} by ${config.scoreNoun} band: ${bands
          .map(
            (band) =>
              `${band.label}: ${
                metric === "Mean violations"
                  ? band.meanViolations.toFixed(2)
                  : `${(band.zeroShare * 100).toFixed(1)}%`
              }`,
          )
          .join("; ")}`
      : metric;

  if (error) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/5 p-5" role="alert">
        <p className="mb-2 text-sm font-medium text-danger">
          The in-browser database failed to load.
        </p>
        <p className="mb-4 break-words text-sm text-ink-muted">{error}</p>
        <div className="flex flex-wrap gap-4 text-sm font-medium">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-10 rounded-md bg-ink px-4 py-2 text-canvas"
          >
            Retry query
          </button>
          <a
            href={config.parquetUrl}
            download
            className="inline-flex min-h-10 items-center text-ink underline underline-offset-2"
          >
            Download the Parquet artifact instead
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="explorer-workbench" aria-busy={busy} data-visual-ready={!busy}>
      <div className="explorer-controls">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={selectId} className="text-xs text-ink-subtle">
            {config.groupLabel}
          </label>
          <select
            id={selectId}
            value={group}
            onChange={(event) => onGroupChange(event.target.value)}
            disabled={busy && groups.length === 0}
            className="bg-surface-raised border border-edge rounded px-3 py-1.5 text-sm text-ink max-w-72"
          >
            <option value="">{config.groupAllLabel}</option>
            {groups.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.sites.toLocaleString()})
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-ink-subtle pb-2" aria-live="polite">
          {busy ? "Querying…" : `n = ${totalSites.toLocaleString()} sites`}
        </p>
      </div>

      {bands === null ? (
        <p className="text-sm text-ink-muted">
          Loading the in-browser analytics engine (a one-time download of roughly 8&nbsp;MB, cached
          afterwards)…
        </p>
      ) : bands.length === 0 ? (
        <div className="rounded-lg border border-edge bg-surface p-5">
          <p className="font-medium text-ink">No sites match this filter.</p>
          <p className="mt-2 text-sm text-ink-muted">
            Choose a broader group or download the dataset to run a custom query.
          </p>
        </div>
      ) : (
        <>
          <div className="explorer-charts">
            <figure>
              <figcaption className="text-xs text-ink-subtle mb-2">
                Mean detected violations
              </figcaption>
              <div ref={meanRef} role="img" aria-label={chartLabel("Mean violations")} />
            </figure>
            <figure>
              <figcaption className="text-xs text-ink-subtle mb-2">
                Share of sites with zero detected violations
              </figcaption>
              <div ref={zeroRef} role="img" aria-label={chartLabel("Violation-free share")} />
            </figure>
          </div>
          <DataTable
            caption={
              selectedGroupLabel === null
                ? `Violation statistics by ${config.scoreNoun} band, ${config.groupAllLabel.toLowerCase()}.`
                : `Violation statistics by ${config.scoreNoun} band, ${selectedGroupLabel}.`
            }
            columns={bandColumns(config)}
            rows={bands}
            getRowKey={(row) => row.band}
          />
        </>
      )}
    </div>
  );
}
