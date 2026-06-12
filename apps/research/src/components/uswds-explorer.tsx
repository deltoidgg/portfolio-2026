import { useEffect, useId, useRef, useState } from "react";
import { DataTable, type DataTableColumn } from "ui";
import type { AgencyOption, BandStat } from "../lib/uswds-queries";

type PlotModule = typeof import("@observablehq/plot");

const bandColumns: Array<DataTableColumn<BandStat>> = [
  { id: "label", header: "USWDS adoption", render: (row) => row.label },
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

function renderCharts(
  Plot: PlotModule,
  meanNode: HTMLElement,
  zeroNode: HTMLElement,
  bands: BandStat[],
) {
  const width = Math.max(280, Math.min(meanNode.clientWidth, 640));
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
}

export function UswdsExplorer() {
  const [agencies, setAgencies] = useState<AgencyOption[]>([]);
  const [agency, setAgency] = useState("");
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
        const api = await import("../lib/uswds-queries");
        const [agencyList, bandStats] = await Promise.all([
          api.loadAgencies(),
          api.loadBandStats(agency === "" ? null : agency),
        ]);
        if (cancelled) return;
        setAgencies(agencyList);
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
  }, [agency]);

  useEffect(() => {
    if (!bands) return;
    const meanNode = meanRef.current;
    const zeroNode = zeroRef.current;
    if (!meanNode || !zeroNode) return;
    let disposed = false;
    void (async () => {
      const Plot = await import("@observablehq/plot");
      if (disposed) return;
      renderCharts(Plot, meanNode, zeroNode, bands);
    })();
    return () => {
      disposed = true;
      meanNode.replaceChildren();
      zeroNode.replaceChildren();
    };
  }, [bands]);

  const totalSites = bands?.reduce((sum, band) => sum + band.sites, 0) ?? 0;
  const chartLabel = (metric: string) =>
    bands
      ? `${metric} by USWDS adoption band: ${bands
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
      <p className="text-sm text-danger" role="alert">
        The in-browser database failed to load: {error}
      </p>
    );
  }

  return (
    <div aria-busy={busy}>
      <div className="flex flex-wrap items-end gap-4 mb-8">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={selectId} className="text-xs text-ink-subtle">
            Agency
          </label>
          <select
            id={selectId}
            value={agency}
            onChange={(event) => setAgency(event.target.value)}
            disabled={busy && agencies.length === 0}
            className="bg-surface-raised border border-edge rounded px-3 py-1.5 text-sm text-ink max-w-72"
          >
            <option value="">All agencies</option>
            {agencies.map((option) => (
              <option key={option.agency} value={option.agency}>
                {option.agency} ({option.sites.toLocaleString()})
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
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-8 mb-8">
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
              agency === ""
                ? "Violation statistics by USWDS adoption band, all agencies."
                : `Violation statistics by USWDS adoption band, ${agency}.`
            }
            columns={bandColumns}
            rows={bands}
            getRowKey={(row) => row.band}
          />
        </>
      )}
    </div>
  );
}
