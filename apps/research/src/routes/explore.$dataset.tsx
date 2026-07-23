import { IconArrowLeft, IconExternalLink } from "@tabler/icons-react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Badge } from "ui";
import { BandExplorer } from "../components/band-explorer";
import { datasetById } from "../content/datasets";
import { explorerConfigs } from "../content/explorers";
import { buildResearchMetadata } from "../lib/metadata";

export const Route = createFileRoute("/explore/$dataset")({
  validateSearch: (search: Record<string, unknown>) => ({
    group: typeof search.group === "string" && search.group.length > 0 ? search.group : undefined,
  }),
  loader: ({ params }) => {
    const dataset = datasetById(params.dataset);
    if (!dataset) throw notFound();
    return { dataset };
  },
  head: ({ loaderData }) =>
    loaderData
      ? buildResearchMetadata({
          title: loaderData.dataset.name,
          description: loaderData.dataset.description,
          path: `/explore/${loaderData.dataset.id}`,
        })
      : { meta: [] },
  component: ExplorePage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-6 py-16 sm:px-8">
      <p className="text-sm text-ink-muted">
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
  const { group } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <div className="explorer-page mx-auto max-w-[var(--ui-page-width)] px-5 py-10 sm:px-8 lg:px-0 lg:py-16">
      <Link
        to="/"
        className="mb-9 inline-flex min-h-11 items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <IconArrowLeft size={15} aria-hidden="true" />
        Back to the lab
      </Link>

      <header className="explorer-hero">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p className="section-kicker">Interactive dataset</p>
          <Badge>{dataset.rows}</Badge>
        </div>
        <h1>{dataset.name}</h1>
        <p>{dataset.description}</p>
        <div className="explorer-meta">
          <span>
            Source: <a href={dataset.source.href}>{dataset.source.label}</a>
          </span>
          <span>Queries run locally via DuckDB-WASM</span>
          <a href={dataset.parquetUrl} download>
            Download Parquet <IconExternalLink size={13} aria-hidden="true" />
          </a>
        </div>
      </header>

      {explorerConfigs[dataset.id] ? (
        <BandExplorer
          config={explorerConfigs[dataset.id]}
          group={group ?? ""}
          onGroupChange={(nextGroup) =>
            void navigate({ search: { group: nextGroup || undefined }, replace: true })
          }
        />
      ) : null}
    </div>
  );
}
