import { FplSignalTrace } from "./fpl-signal-trace";
import { ProjectSection } from "./project-layout";

export function FplProject() {
  return (
    <>
      <ProjectSection id="why" title="A transfer decision is a probability problem">
        <p>
          FPL decisions look simple only after uncertainty has been hidden. A player can be a strong
          pick because of likely minutes, the chance their team scores twice, clean-sheet potential,
          an anytime-scorer price, or the opportunity cost of the transfer. Those signals live in
          different systems and do not agree on the same vocabulary.
        </p>
        <p>
          I built the experiment to test a more useful question than “who has the highest expected
          points?”: what changed, which evidence moved the forecast, and how much confidence should
          a manager place in the new rank before the deadline?
        </p>
      </ProjectSection>

      <ProjectSection id="evidence" title="Keep the evidence that produced the number">
        <p>
          Source adapters validate the observable FPL JSON and bookmaker responses with Zod, retain
          the untouched payload, and emit the same canonical capture contract. Stable keys join
          teams, fixtures, players, seasons, and gameweeks without allowing a plausible-looking
          fuzzy match to silently corrupt the model.
        </p>
        <FplSignalTrace />
        <div className="decision-panel">
          <p className="decision-panel__label">Architecture decision</p>
          <p>
            Capture batches are immutable and idempotent. Neon stores raw snapshots, normalised
            observations, forecasts, annotations, and source aliases together, so the interface can
            replay what was knowable at each point rather than reconstructing history from current
            values.
          </p>
        </div>
      </ProjectSection>

      <ProjectSection id="model" title="Translate market prices into the FPL scoring system">
        <p>
          The model removes bookmaker margin from compatible markets, keeps the cross-source range,
          and combines those probabilities with FPL availability, starts, minutes, ownership, price,
          and per-90 goal and assist rates. Missing player props fall back explicitly to the
          historical-rate prior instead of becoming invented precision.
        </p>
        <p>
          The output is a discrete FPL-points distribution—not one opaque score. It records the
          expected value, p10/p50/p90 interval, appearance, goal, assist, clean-sheet, bonus, and
          other components, plus the quotes and assumptions used for that player. Ranking is a view
          over that evidence, not a replacement for it.
        </p>
      </ProjectSection>

      <ProjectSection id="interface" title="Replay the deadline instead of flattening it">
        <p>
          The Deadline Intelligence Room uses one selected timestamp to update the watchlist,
          forecast trajectories, source freshness, consensus range, evidence notes, and points
          recipe. Moving the timeline therefore changes the whole decision state, not merely a line
          chart cursor.
        </p>
        <p>
          The dense desktop layout behaves like an analysis workstation; at narrow widths it becomes
          a deliberate reading order—watchlist, source mesh, trajectory, recipe, then time controls.
          Motion helps connect state changes, while reduced-motion users receive the same
          information without animated transitions.
        </p>
      </ProjectSection>

      <ProjectSection id="system" title="A separate app with a deep backend seam">
        <p>
          The experiment runs as its own TanStack Start application at fpl.wasimarif.com. Nitro
          builds the React server and server functions for Vercel; Drizzle and Neon provide the
          point-in-time store; the browser receives only the read model, never database credentials
          or provider keys.
        </p>
        <p>
          Capture, entity resolution, storage, modelling, and read-model projection live in a
          framework-neutral market-intelligence package. The FPL app owns interaction and serving.
          That boundary lets another collector, scheduled job, or visual experiment reuse the data
          model without turning the portfolio or research publication site into the application
          backend.
        </p>
      </ProjectSection>

      <ProjectSection id="status" title="What the experiment proves—and what remains">
        <ul>
          <li>A deployed, responsive room backed by a versioned Neon data model.</li>
          <li>
            Observable FPL and odds adapters with boundary validation and raw-payload retention.
          </li>
          <li>
            An explainable baseline model with deterministic tests for scoring and fallback paths.
          </li>
          <li>
            Browser audits across light and dark portfolio themes and the FPL app’s fixed dark UI.
          </li>
        </ul>
        <p>
          The current public replay is seeded and the collection commands are still run manually.
          The next production step is to select the current gameweek from captured data and schedule
          repeated pre-deadline captures. Broader bookmaker, exchange, and prediction-market
          coverage should expand only after fixture and player resolution remain trustworthy under
          real payload drift.
        </p>
      </ProjectSection>
    </>
  );
}
