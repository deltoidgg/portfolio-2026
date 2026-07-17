import { IconArrowRight, IconArrowUpRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { Project } from "../content/projects";
import { FplSignalTrace } from "./projects/fpl-signal-trace";

export function FplSpotlight({ project }: { project: Project }) {
  return (
    <article className="fpl-spotlight" aria-labelledby="fpl-spotlight-title">
      <div className="fpl-spotlight__copy">
        <div className="fpl-spotlight__eyebrow">
          <span>Live experiment</span>
          <span aria-hidden="true">/</span>
          <span>FPL market intelligence</span>
        </div>
        <h3 id="fpl-spotlight-title">When the market moves, the forecast should explain why.</h3>
        <p>
          FPL availability, bookmaker prices, and player evidence become one point-in-time forecast
          with an interval, component recipe, and source trail—not just a transfer score.
        </p>
        <div className="fpl-spotlight__actions">
          <Link to="/projects/$slug" params={{ slug: project.slug }}>
            How it was built <IconArrowRight size={16} aria-hidden="true" />
          </Link>
          <a href="https://fpl.wasimarif.com" target="_blank" rel="noopener noreferrer">
            Open the experiment <IconArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
      <FplSignalTrace />
    </article>
  );
}
