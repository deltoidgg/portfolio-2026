const stages = [
  {
    marker: "01 / inputs",
    title: "FPL + markets",
    detail: "Availability, fixtures, ownership, team odds, and player props",
  },
  {
    marker: "02 / capture",
    title: "Raw evidence",
    detail: "Immutable payloads with observed and published timestamps",
  },
  {
    marker: "03 / resolve",
    title: "Canonical graph",
    detail: "Stable player, team, fixture, season, and gameweek identities",
  },
  {
    marker: "04 / forecast",
    title: "Points distribution",
    detail: "Minutes, rates, market priors, scoring rules, and uncertainty",
  },
  {
    marker: "05 / decision",
    title: "Deadline room",
    detail: "Replayable ranks, intervals, disagreement, and evidence recipes",
  },
] as const;

export function FplSignalTrace() {
  return (
    <div className="fpl-trace">
      <div className="fpl-trace__status">
        <span>Market → points trace</span>
        <span>
          <i aria-hidden="true" /> Point-in-time
        </span>
      </div>
      <ol className="fpl-trace__stages">
        {stages.map((stage) => (
          <li key={stage.marker} className="fpl-trace__stage">
            <span>{stage.marker}</span>
            <strong>{stage.title}</strong>
            <small>{stage.detail}</small>
          </li>
        ))}
      </ol>
      <p className="fpl-trace__footnote">
        Every displayed forecast retains the source batch and model recipe that produced it.
      </p>
    </div>
  );
}
