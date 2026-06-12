import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge, Card, Section, StatusDot } from "ui";
import { datasetRegistry } from "../content/datasets";
import { papers, type PaperStatus } from "../content/papers";

export const Route = createFileRoute("/")({
  component: LabIndex,
});

const statusLabels: Record<PaperStatus, string> = {
  "in-progress": "In progress",
  preregistered: "Pre-registered",
  published: "Published",
};

function LabIndex() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 sm:px-8 sm:py-20">
      <header className="mb-16">
        <h1 className="text-lg font-medium text-ink mb-3">Research</h1>
        <p className="text-ink-muted text-sm leading-relaxed max-w-prose">
          Open, pre-registered research on how design systems, accessibility, and AI coding agents
          shape the quality of the web. Hypotheses are locked before estimation, every figure traces
          to a versioned data artifact, and the data is yours to explore in the browser.
        </p>
      </header>

      <Section title="Papers">
        <div className="space-y-4">
          {papers.map((paper) => (
            <Card key={paper.slug}>
              <div className="flex items-center gap-2 mb-2">
                <StatusDot tone={paper.status === "published" ? "live" : "wip"} />
                <h3 className="text-base font-medium text-ink">
                  <Link
                    to="/papers/$slug"
                    params={{ slug: paper.slug }}
                    className="hover:text-ink-muted transition-colors"
                  >
                    {paper.title}
                  </Link>
                </h3>
                <Badge tone={paper.status === "published" ? "accent" : "warn"}>
                  {statusLabels[paper.status]}
                </Badge>
              </div>
              <p className="text-ink-muted text-sm leading-relaxed">{paper.question}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        title="Data explorers"
        description="Each dataset is a versioned Parquet artifact, queried live in your browser with DuckDB-WASM. No server, no tracking of your queries."
      >
        <div className="space-y-4">
          {datasetRegistry.map((dataset) => (
            <Card key={dataset.id}>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h3 className="text-base font-medium text-ink">
                  <Link
                    to="/explore/$dataset"
                    params={{ dataset: dataset.id }}
                    className="hover:text-ink-muted transition-colors"
                  >
                    {dataset.name}
                  </Link>
                </h3>
                <Badge>{dataset.rows}</Badge>
              </div>
              <p className="text-ink-muted text-sm leading-relaxed">{dataset.description}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Method">
        <p className="text-ink-muted text-sm leading-relaxed max-w-prose">
          This lab follows the pre-registration discipline used in quantitative social science:
          variables, models, and the analyst&apos;s own priors are locked in a public document
          before any confirmatory relationship is examined; exploratory findings are labelled as
          such; null results are reported as nulls; and replication on held-out data is designed in
          from the start.
        </p>
      </Section>
    </div>
  );
}
