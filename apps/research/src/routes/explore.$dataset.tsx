import { IconArrowLeft, IconDownload } from "@tabler/icons-react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
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
    <div className="page message-page">
      <h1>Dataset not found</h1>
      <p>There is no dataset at this address.</p>
      <Link to="/" className="button button--primary">
        Go to the research index
      </Link>
    </div>
  ),
});

function ExplorePage() {
  const { dataset } = Route.useLoaderData();
  const { group } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <div className="page explorer">
      <Link to="/" className="back-link">
        <IconArrowLeft size={16} aria-hidden="true" />
        All research
      </Link>

      <header className="explorer__header">
        <h1>{dataset.name}</h1>
        <p>{dataset.description}</p>
        <ul className="explorer__meta">
          <li>{dataset.rows}</li>
          <li>
            Source: <a href={dataset.source.href}>{dataset.source.label}</a>
          </li>
          <li>Queries run in your browser with DuckDB</li>
          <li>
            <a href={dataset.parquetUrl} download>
              Download the Parquet file <IconDownload size={14} aria-hidden="true" />
            </a>
          </li>
        </ul>
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
