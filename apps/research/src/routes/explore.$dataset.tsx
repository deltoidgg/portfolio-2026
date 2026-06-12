import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { IconArrowLeft, IconExternalLink } from "@tabler/icons-react";
import { Badge } from "ui";
import { BandExplorer } from "../components/band-explorer";
import { datasetById } from "../content/datasets";
import { explorerConfigs } from "../content/explorers";

export const Route = createFileRoute("/explore/$dataset")({
  loader: ({ params }) => {
    const dataset = datasetById(params.dataset);
    if (!dataset) throw notFound();
    return { dataset };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: `${loaderData.dataset.name} — Research — Wasim Arif` }] : [],
  }),
  component: ExplorePage,
  notFoundComponent: () => (
    <div className="max-w-3xl mx-auto px-6 py-16 sm:px-8">
      <p className="text-ink-muted text-sm">
        No such dataset.{" "}
        <Link to="/" className="text-accent-ink underline underline-offset-2">
          Back to the lab
        </Link>
      </p>
    </div>
  ),
});

function ExplorePage() {
  const { dataset } = Route.useLoaderData();

  return (
    <div className="max-w-3xl mx-auto px-6 py-16 sm:px-8 sm:py-20">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors mb-10"
      >
        <IconArrowLeft size={16} aria-hidden="true" />
        Back to the lab
      </Link>

      <header className="mb-10">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <h1 className="text-xl font-medium text-ink leading-snug">{dataset.name}</h1>
          <Badge>{dataset.rows}</Badge>
        </div>
        <p className="text-ink-muted text-sm leading-relaxed mb-3">{dataset.description}</p>
        <p className="text-xs text-ink-subtle">
          Source:{" "}
          <a
            href={dataset.source.href}
            className="underline underline-offset-2 hover:text-ink-muted"
          >
            {dataset.source.label}
          </a>{" "}
          · Queries run locally in your browser via DuckDB-WASM ·{" "}
          <a
            href={dataset.parquetUrl}
            download
            className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-ink-muted"
          >
            Download the Parquet artifact
            <IconExternalLink size={12} aria-hidden="true" />
          </a>
        </p>
      </header>

      {explorerConfigs[dataset.id] ? <BandExplorer config={explorerConfigs[dataset.id]} /> : null}
    </div>
  );
}
