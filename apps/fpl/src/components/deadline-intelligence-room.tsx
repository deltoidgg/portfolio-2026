import {
  IconChevronLeft,
  IconChevronRight,
  IconPlayerPause,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { sourceStatusAt } from "market-intelligence";
import type { Annotation, DeadlineRoom, ForecastPoint, RoomPlayer } from "market-intelligence";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";

const plot = { left: 48, right: 742, top: 26, bottom: 294 } as const;

function pointAt(player: RoomPlayer, observedAt: string): ForecastPoint {
  const point =
    player.series.find((point) => point.observedAt === observedAt) ??
    player.series.at(-1) ??
    player.series[0];
  if (!point) throw new Error(`Missing forecast series for ${player.playerKey}`);
  return point;
}

function formatCountdown(minutes: number): string {
  if (minutes < 60) return `T−${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `T−${hours}h${remainder ? ` ${remainder}m` : ""}`;
}

function formatObservedAt(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

function signed(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

type TableSort = "rank" | "expectedPoints" | "p10" | "p50" | "p90" | "minutes";

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function pathFor(values: number[], min: number, max: number): string {
  const width = plot.right - plot.left;
  const height = plot.bottom - plot.top;
  return values
    .map((value, index) => {
      const x = plot.left + (index / Math.max(1, values.length - 1)) * width;
      const y = plot.bottom - ((value - min) / Math.max(0.1, max - min)) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function bandFor(player: RoomPlayer, min: number, max: number): string {
  const width = plot.right - plot.left;
  const height = plot.bottom - plot.top;
  const upper = player.series.map((point, index) => {
    const x = plot.left + (index / Math.max(1, player.series.length - 1)) * width;
    const y = plot.bottom - ((point.p90 - min) / Math.max(0.1, max - min)) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const lower = player.series.toReversed().map((point, reverseIndex) => {
    const index = player.series.length - reverseIndex - 1;
    const x = plot.left + (index / Math.max(1, player.series.length - 1)) * width;
    const y = plot.bottom - ((point.p10 - min) / Math.max(0.1, max - min)) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return [...upper, ...lower].join(" ");
}

function DeadlineChart({
  room,
  selectedPlayer,
  selectedIndex,
  pinnedIndex,
}: {
  room: DeadlineRoom;
  selectedPlayer: RoomPlayer;
  selectedIndex: number;
  pinnedIndex: number | null;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  // the chart is drawn 800 units wide and scaled to its container, so work out how many
  // units a 12px label needs to stay readable on narrow screens
  const [labelSize, setLabelSize] = useState(12);
  useEffect(() => {
    const node = svgRef.current;
    if (!node) return;
    const measure = () => {
      const width = node.getBoundingClientRect().width;
      if (width > 0) setLabelSize(Math.max(12, Math.round((12 * 800) / width)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const allPoints = room.players.flatMap((player) =>
    player.series.flatMap((point) => [point.p10, point.p90]),
  );
  const min = Math.floor(Math.min(...allPoints));
  const max = Math.ceil(Math.max(...allPoints));
  const x =
    plot.left + (selectedIndex / Math.max(1, room.timeline.length - 1)) * (plot.right - plot.left);
  const pinnedX =
    pinnedIndex === null
      ? undefined
      : plot.left +
        (pinnedIndex / Math.max(1, room.timeline.length - 1)) * (plot.right - plot.left);
  const current = pointAt(
    selectedPlayer,
    room.timeline[selectedIndex]?.observedAt ?? room.generatedAt,
  );
  const y =
    plot.bottom -
    ((current.expectedPoints - min) / Math.max(0.1, max - min)) * (plot.bottom - plot.top);
  const ticks = Array.from({ length: 5 }, (_, index) => min + ((max - min) / 4) * index);

  return (
    <svg
      ref={svgRef}
      className="room-chart"
      style={{ "--chart-label": `${labelSize}px` } as CSSProperties}
      viewBox="0 0 800 342"
      role="img"
      aria-label={`Expected-points trajectories. ${selectedPlayer.playerName} is selected at ${current.expectedPoints.toFixed(1)} points.`}
    >
      <title>Expected-points trajectories before the gameweek deadline</title>
      {ticks.map((tick) => {
        const tickY =
          plot.bottom - ((tick - min) / Math.max(0.1, max - min)) * (plot.bottom - plot.top);
        return (
          <g key={tick}>
            <line x1={plot.left} x2={plot.right} y1={tickY} y2={tickY} stroke="var(--room-line)" />
            <text
              x={plot.left - 10}
              y={tickY}
              dy="0.35em"
              textAnchor="end"
              className="room-chart-label"
            >
              {tick.toFixed(0)}
            </text>
          </g>
        );
      })}
      <polygon points={bandFor(selectedPlayer, min, max)} fill="rgb(117 229 211 / 0.07)" />
      {room.players.map((player) => (
        <motion.path
          key={player.playerKey}
          initial={false}
          d={pathFor(
            player.series.map((point) => point.expectedPoints),
            min,
            max,
          )}
          fill="none"
          stroke={player.playerKey === selectedPlayer.playerKey ? "var(--room-cyan)" : "#46606c"}
          strokeWidth={player.playerKey === selectedPlayer.playerKey ? 2.5 : 1.15}
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={{ opacity: player.playerKey === selectedPlayer.playerKey ? 1 : 0.52 }}
        />
      ))}
      {room.annotations.map((annotation) => {
        const annotationIndex = room.timeline.findIndex(
          (point) => point.observedAt === annotation.observedAt,
        );
        if (annotationIndex < 0) return null;
        const annotationX =
          plot.left +
          (annotationIndex / Math.max(1, room.timeline.length - 1)) * (plot.right - plot.left);
        return (
          <line
            key={annotation.key}
            x1={annotationX}
            x2={annotationX}
            y1={plot.top}
            y2={plot.top + 13}
            stroke="var(--room-amber)"
            strokeWidth="2"
          />
        );
      })}
      {pinnedX === undefined ? null : (
        <line
          x1={pinnedX}
          x2={pinnedX}
          y1={plot.top}
          y2={plot.bottom}
          stroke="var(--room-amber)"
          strokeWidth="1"
          strokeDasharray="2 6"
        />
      )}
      <line
        x1={x}
        x2={x}
        y1={plot.top}
        y2={plot.bottom}
        stroke="var(--room-cyan)"
        strokeWidth="1"
        strokeDasharray="3 5"
      />
      <circle
        cx={x}
        cy={y}
        r="5"
        fill="var(--room-canvas)"
        stroke="var(--room-cyan)"
        strokeWidth="2.5"
      />
      {room.timeline.map((point, index) => {
        const tickX =
          plot.left + (index / Math.max(1, room.timeline.length - 1)) * (plot.right - plot.left);
        return (
          <text
            key={point.observedAt}
            x={tickX}
            y={332}
            textAnchor={
              index === 0 ? "start" : index === room.timeline.length - 1 ? "end" : "middle"
            }
            className="room-chart-label"
          >
            {index === 0 ||
            index === room.timeline.length - 1 ||
            (index === selectedIndex && index > 2 && index < room.timeline.length - 3)
              ? formatCountdown(point.minutesToDeadline)
              : "·"}
          </text>
        );
      })}
    </svg>
  );
}

function Recipe({ player, point }: { player: RoomPlayer; point: ForecastPoint }) {
  const components = [
    ["Appearance", point.components.appearance],
    ["Goals", point.components.goals],
    ["Assists", point.components.assists],
    ["Clean sheet", point.components.cleanSheet],
    ["Bonus", point.components.bonus],
    ["Other", point.components.other ?? 0],
  ] as const;
  const maxComponent = Math.max(...components.map(([, value]) => Math.abs(value)), 0.1);
  const availability = point.evidence.signals?.find((signal) => signal.key === "availability");
  const recipe = point.evidence.recipe;
  const primaryConsensus = recipe?.consensus[0];

  return (
    <div className="room-recipe">
      <div>
        <div className="room-recipe-score">
          <div>
            <strong>{point.expectedPoints.toFixed(1)}</strong>
            <span>expected points</span>
          </div>
          <div className="room-range-copy">
            <b>
              {point.p10.toFixed(1)}–{point.p90.toFixed(1)}
            </b>
            <span>80% range</span>
          </div>
        </div>
        <h2>{point.evidence.headline}</h2>
        <p className="room-recipe-detail">{point.evidence.detail}</p>
      </div>
      <div>
        <ol className="room-recipe-flow" aria-label="From odds to points">
          <li>
            Odds
            <small>{recipe?.quotes.length ?? 0} bookmaker prices</small>
          </li>
          <li>
            Consensus
            <small>
              {primaryConsensus
                ? `${percent(primaryConsensus.probability)}, sources ${percent(primaryConsensus.spread)} apart`
                : "no odds yet"}
            </small>
          </li>
          <li>
            Minutes
            <small>
              {recipe
                ? `${recipe.minutes.expectedMinutes.toFixed(0)} expected`
                : (availability?.value ?? "no odds yet")}
            </small>
          </li>
          <li>
            FPL points
            <small>{point.expectedPoints.toFixed(1)} xP</small>
          </li>
        </ol>
        {recipe && recipe.quotes.length > 0 ? (
          <div className="room-quote-ledger" aria-label="Raw market quote transformation">
            {recipe.quotes.map((quote) => (
              <div key={`${quote.sourceKey}:${quote.marketFamily}`}>
                <span>{quote.label}</span>
                <b>{quote.decimalOdds.toFixed(2)}</b>
                <small>→ {percent(quote.impliedProbability)}</small>
              </div>
            ))}
          </div>
        ) : null}
        {recipe ? (
          <div className="room-latent-rates">
            <span>Model rates</span>
            <b>Goals {recipe.rates.goal.toFixed(2)}</b>
            <b>Assists {recipe.rates.assist.toFixed(2)}</b>
            <b>Clean sheet {percent(recipe.rates.cleanSheet)}</b>
            <b>Plays 60+ {percent(recipe.minutes.sixtyMinuteProbability)}</b>
          </div>
        ) : null}
        <div className="room-component-list" aria-label={`${player.playerName} points recipe`}>
          {components.map(([label, value]) => (
            <div className="room-component-row" key={label}>
              <span>{label}</span>
              <div className="room-component-track" aria-hidden="true">
                <motion.div
                  className="room-component-fill"
                  initial={false}
                  animate={{ scaleX: Math.abs(value) / maxComponent }}
                />
              </div>
              <span className="room-component-value">{value.toFixed(1)}</span>
            </div>
          ))}
        </div>
        {(point.evidence.sourceKeys ?? []).length > 0 ? (
          <p className="room-evidence-sources">
            Based on {(point.evidence.sourceKeys ?? []).join(", ")}
          </p>
        ) : null}
        <div className="room-confidence">
          <span>Confidence</span>
          <strong>{Math.round((point.evidence.confidence ?? 0) * 100)}%</strong>
        </div>
      </div>
    </div>
  );
}

export function DeadlineIntelligenceRoom({ initialRoom }: { initialRoom: DeadlineRoom }) {
  const reducedMotion = useReducedMotion();
  const room = initialRoom;
  const [selectedIndex, setSelectedIndex] = useState(initialRoom.timeline.length - 1);
  const [selectedPlayerKey, setSelectedPlayerKey] = useState(
    initialRoom.players[0]?.playerKey ?? "",
  );
  const [fixtureFilter, setFixtureFilter] = useState("all");
  const [playing, setPlaying] = useState(false);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  const [playerSearch, setPlayerSearch] = useState("");
  const [tableSort, setTableSort] = useState<TableSort>("rank");
  const [compareKeys, setCompareKeys] = useState<string[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => setHasHydrated(true), []);

  useEffect(() => {
    if (!playing || reducedMotion) return;
    const timer = window.setInterval(() => {
      setSelectedIndex((current) => {
        if (current >= room.timeline.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 900);
    return () => window.clearInterval(timer);
  }, [playing, reducedMotion, room.timeline.length]);

  const selectedTime = room.timeline[selectedIndex] ?? room.timeline.at(-1);
  const filteredPlayers = useMemo(() => {
    if (fixtureFilter === "all") return room.players;
    const fixture = room.fixtures.find((candidate) => candidate.key === fixtureFilter);
    if (!fixture) return room.players;
    return room.players.filter(
      (player) => player.teamKey === fixture.homeTeam || player.teamKey === fixture.awayTeam,
    );
  }, [fixtureFilter, room.fixtures, room.players]);
  const rankedPlayers = useMemo(
    () =>
      filteredPlayers.toSorted(
        (a, b) =>
          pointAt(a, selectedTime?.observedAt ?? room.generatedAt).rank -
          pointAt(b, selectedTime?.observedAt ?? room.generatedAt).rank,
      ),
    [filteredPlayers, room.generatedAt, selectedTime?.observedAt],
  );
  const selectedPlayer =
    room.players.find((player) => player.playerKey === selectedPlayerKey) ??
    rankedPlayers[0] ??
    room.players[0];
  if (!selectedPlayer || !selectedTime) return null;
  const selectedPoint = pointAt(selectedPlayer, selectedTime.observedAt);
  const pinnedTime = pinnedIndex === null ? undefined : room.timeline[pinnedIndex];
  const pinnedPoint = pinnedTime ? pointAt(selectedPlayer, pinnedTime.observedAt) : undefined;
  const leader = rankedPlayers[0];
  const runnerUp = rankedPlayers[1];
  const leaderPoint = leader ? pointAt(leader, selectedTime.observedAt) : undefined;
  const runnerUpPoint = runnerUp ? pointAt(runnerUp, selectedTime.observedAt) : undefined;
  const lead =
    leaderPoint && runnerUpPoint ? leaderPoint.expectedPoints - runnerUpPoint.expectedPoints : 0;
  const tablePlayers = rankedPlayers
    .filter((player) =>
      player.playerName.toLocaleLowerCase().includes(playerSearch.trim().toLocaleLowerCase()),
    )
    .toSorted((a, b) => {
      const aPoint = pointAt(a, selectedTime.observedAt);
      const bPoint = pointAt(b, selectedTime.observedAt);
      const value = (point: ForecastPoint) =>
        tableSort === "minutes"
          ? (point.evidence.recipe?.minutes.sixtyMinuteProbability ?? 0)
          : point[tableSort];
      return tableSort === "rank" ? value(aPoint) - value(bPoint) : value(bPoint) - value(aPoint);
    });
  const comparedPlayers = compareKeys.flatMap((key) => {
    const player = room.players.find((candidate) => candidate.playerKey === key);
    return player ? [player] : [];
  });
  const visibleAnnotations = room.annotations
    .filter((annotation) => annotation.observedAt <= selectedTime.observedAt)
    .toSorted((a, b) => b.observedAt.localeCompare(a.observedAt))
    .slice(0, 3);
  const selectedConsensus = selectedPoint.evidence.recipe?.consensus.find(
    (market) => market.quoteCount > 1,
  );
  const transferLead = leaderPoint ? leaderPoint.expectedPoints - selectedPoint.expectedPoints : 0;

  return (
    <div className="deadline-room">
      <div className="room-frame">
        <header className="room-hero">
          <div>
            <h1 className="room-display">Deadline room</h1>
            <p className="room-hero-copy">
              Replay the last 48 hours before the GW{room.gameweek} deadline. Step through and watch
              each forecast shift as odds and team news change. Where sources disagree, it shows up
              here instead of getting averaged away.
            </p>
          </div>
          <div className="room-mode-stack">
            <span>{room.dataMode === "neon" ? "Recorded data" : "Demo data"}</span>
            <span>
              GW{room.gameweek} · {room.season} · {room.sources.length} sources
            </span>
            <span>Snapshot {formatObservedAt(room.generatedAt)}</span>
          </div>
        </header>

        <div className="room-toolbar">
          <div className="room-fixtures" aria-label="Fixture filter">
            <button
              type="button"
              className="room-fixture"
              aria-pressed={fixtureFilter === "all"}
              onClick={() => setFixtureFilter("all")}
            >
              All fixtures
            </button>
            {room.fixtures.map((fixture) => (
              <button
                type="button"
                className="room-fixture"
                aria-pressed={fixtureFilter === fixture.key}
                onClick={() => {
                  setFixtureFilter(fixture.key);
                  const firstPlayer = room.players.find(
                    (player) =>
                      player.teamKey === fixture.homeTeam || player.teamKey === fixture.awayTeam,
                  );
                  if (firstPlayer) setSelectedPlayerKey(firstPlayer.playerKey);
                }}
                key={fixture.key}
              >
                {fixture.homeTeam} / {fixture.awayTeam}
              </button>
            ))}
          </div>
        </div>

        <div className="room-grid">
          <aside className="room-panel" aria-label="Player watchlist and sources">
            <div className="room-panel-head">
              <span className="room-panel-title">Players</span>
              <span className="room-panel-index">Expected points</span>
            </div>
            <div className="room-player-list">
              {rankedPlayers.map((player) => {
                const point = pointAt(player, selectedTime.observedAt);
                const comparison = pinnedTime
                  ? pointAt(player, pinnedTime.observedAt).expectedPoints
                  : (player.series[0]?.expectedPoints ?? point.expectedPoints);
                const delta = point.expectedPoints - comparison;
                return (
                  <button
                    type="button"
                    className="room-player"
                    aria-pressed={selectedPlayer.playerKey === player.playerKey}
                    onClick={() => setSelectedPlayerKey(player.playerKey)}
                    key={player.playerKey}
                  >
                    <span className="room-rank">{point.rank}</span>
                    <span>
                      <span className="room-player-name">{player.playerName}</span>
                      <span className="room-player-meta">
                        {player.teamKey} · {player.position} · {point.p10.toFixed(1)}–
                        {point.p90.toFixed(1)}
                      </span>
                    </span>
                    <span className="room-player-points">
                      <strong>{point.expectedPoints.toFixed(1)}</strong>
                      <span className="room-delta" data-negative={delta < 0}>
                        {signed(delta)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="room-panel-head">
              <span className="room-panel-title">Sources</span>
              <span className="room-panel-index">Captures so far</span>
            </div>
            <div className="room-source-list">
              {room.sources.map((source) => {
                const status = sourceStatusAt(source, selectedTime.observedAt);
                return (
                  <div className="room-source-row" data-awaiting={!status} key={source.key}>
                    <span>{source.label}</span>
                    <span>
                      {status
                        ? `${status.captureCount}, last ${formatCountdown(
                            Math.max(
                              0,
                              Math.round(
                                (Date.parse(room.deadlineAt) - Date.parse(status.lastCapturedAt)) /
                                  60_000,
                              ),
                            ),
                          )}`
                        : "not started"}
                    </span>
                  </div>
                );
              })}
            </div>
          </aside>

          <section className="room-panel" aria-label="Deadline forecast timeline">
            <div className="room-panel-head">
              <span className="room-panel-title">Forecasts over time</span>
              <span className="room-panel-index">
                {formatCountdown(selectedTime.minutesToDeadline)} to deadline
              </span>
            </div>
            <div
              className="room-signal-tape"
              aria-label={`${selectedPlayer.playerName} evidence tape`}
            >
              {(selectedPoint.evidence.signals ?? []).map((signal) => (
                <article className="room-signal" data-direction={signal.direction} key={signal.key}>
                  <span>{signal.sourceKey}</span>
                  <b>{signal.value}</b>
                  <strong>{signal.label}</strong>
                  {signal.movement === undefined ? null : <small>{signed(signal.movement)}</small>}
                </article>
              ))}
            </div>
            {selectedConsensus ? (
              <div className="room-consensus" aria-label="Cross-source market consensus">
                <div>
                  <span>Where the sources agree</span>
                  <strong>{selectedConsensus.label}</strong>
                  <small>{selectedConsensus.adjustmentMethod}</small>
                </div>
                <div className="room-consensus-band">
                  <span style={{ left: `${selectedConsensus.low * 100}%` }} />
                  <b style={{ left: `${selectedConsensus.probability * 100}%` }} />
                  <span style={{ left: `${selectedConsensus.high * 100}%` }} />
                </div>
                <div className="room-consensus-values">
                  <span>{percent(selectedConsensus.low)} low</span>
                  <strong>{percent(selectedConsensus.probability)} consensus</strong>
                  <span>{percent(selectedConsensus.high)} high</span>
                  <b>{percent(selectedConsensus.spread)} disagreement</b>
                </div>
              </div>
            ) : null}
            <div className="room-decision-strip">
              <span>Captain pick</span>
              <strong>{leader?.playerName ?? "No player"}</strong>
              <span>
                {runnerUp
                  ? `${lead.toFixed(1)} xP ahead of ${runnerUp.playerName}`
                  : "Nobody to compare with"}
              </span>
              <span className="room-decision-label">Transfer idea</span>
              <strong>
                {leader?.playerKey === selectedPlayer.playerKey
                  ? `Keep ${selectedPlayer.playerName}`
                  : `Look at ${leader?.playerName ?? selectedPlayer.playerName}`}
              </strong>
              <span>
                {leader?.playerKey === selectedPlayer.playerKey
                  ? "Nobody else on this list is forecast higher"
                  : `${transferLead.toFixed(1)} xP more than ${selectedPlayer.playerName}. Check it fits your budget first.`}
              </span>
              {pinnedTime && pinnedPoint ? (
                <span className="room-pinned-delta">
                  Pinned {formatCountdown(pinnedTime.minutesToDeadline)} ·{" "}
                  {signed(selectedPoint.expectedPoints - pinnedPoint.expectedPoints)} xP
                </span>
              ) : null}
            </div>
            <div className="room-chart-wrap">
              <DeadlineChart
                room={room}
                selectedPlayer={selectedPlayer}
                selectedIndex={selectedIndex}
                pinnedIndex={pinnedIndex}
              />
            </div>
            <AnimatePresence mode="popLayout" initial={false}>
              {visibleAnnotations.length > 0 ? (
                <motion.div
                  className="room-event-strip"
                  key={selectedTime.observedAt}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                >
                  {visibleAnnotations.map((annotation: Annotation) => (
                    <article className="room-event" key={annotation.key}>
                      <span className="room-event-time">
                        {annotation.sourceKey} · {signed(annotation.impact)} xP
                      </span>
                      <h3>{annotation.title}</h3>
                      <p>{annotation.detail}</p>
                    </article>
                  ))}
                </motion.div>
              ) : (
                <div className="room-empty-event" key="empty">
                  Nothing has moved yet. This is the opening snapshot.
                </div>
              )}
            </AnimatePresence>
            <details className="room-exact">
              <summary>All values at this snapshot</summary>
              <label className="room-table-search">
                <span>Filter players</span>
                <input
                  type="search"
                  value={playerSearch}
                  placeholder="Search name"
                  onChange={(event) => setPlayerSearch(event.currentTarget.value)}
                />
              </label>
              {comparedPlayers.length > 0 ? (
                <div className="room-compare-tray" aria-live="polite">
                  <span>Comparing</span>
                  {comparedPlayers.map((player) => (
                    <button
                      type="button"
                      key={player.playerKey}
                      onClick={() =>
                        setCompareKeys((current) =>
                          current.filter((candidate) => candidate !== player.playerKey),
                        )
                      }
                    >
                      {player.playerName} ·{" "}
                      {pointAt(player, selectedTime.observedAt).expectedPoints.toFixed(1)} xP ×
                    </button>
                  ))}
                  {comparedPlayers.length === 2 ? (
                    <strong>
                      Gap{" "}
                      {Math.abs(
                        pointAt(comparedPlayers[0]!, selectedTime.observedAt).expectedPoints -
                          pointAt(comparedPlayers[1]!, selectedTime.observedAt).expectedPoints,
                      ).toFixed(1)}{" "}
                      xP
                    </strong>
                  ) : (
                    <small>Pick one more to compare</small>
                  )}
                </div>
              ) : null}
              <div className="room-table-wrap">
                <table className="room-table">
                  <thead>
                    <tr>
                      <th scope="col">Compare</th>
                      <th scope="col">Player</th>
                      {(
                        [
                          ["expectedPoints", "xP"],
                          ["p10", "Low (P10)"],
                          ["p50", "Median"],
                          ["p90", "High (P90)"],
                          ["rank", "Rank"],
                          ["minutes", "Plays 60+"],
                        ] as const
                      ).map(([key, label]) => (
                        <th
                          scope="col"
                          key={key}
                          aria-sort={tableSort === key ? "descending" : "none"}
                        >
                          <button
                            type="button"
                            aria-pressed={tableSort === key}
                            onClick={() => setTableSort(key)}
                          >
                            {label}
                          </button>
                        </th>
                      ))}
                      <th scope="col">Spread</th>
                      <th scope="col">Time to deadline</th>
                      <th scope="col">Change since pin or open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tablePlayers.map((player) => {
                      const point = pointAt(player, selectedTime.observedAt);
                      const comparison = pinnedTime
                        ? pointAt(player, pinnedTime.observedAt).expectedPoints
                        : (player.series[0]?.expectedPoints ?? point.expectedPoints);
                      return (
                        <tr key={player.playerKey}>
                          <td>
                            <button
                              type="button"
                              className="room-compare-button"
                              aria-label={`${compareKeys.includes(player.playerKey) ? "Remove" : "Add"} ${player.playerName} ${compareKeys.includes(player.playerKey) ? "from" : "to"} comparison`}
                              aria-pressed={compareKeys.includes(player.playerKey)}
                              onClick={() =>
                                setCompareKeys((current) =>
                                  current.includes(player.playerKey)
                                    ? current.filter((key) => key !== player.playerKey)
                                    : [...current.slice(-1), player.playerKey],
                                )
                              }
                            >
                              {compareKeys.includes(player.playerKey) ? "−" : "+"}
                            </button>
                          </td>
                          <th scope="row">{player.playerName}</th>
                          <td>{point.expectedPoints.toFixed(1)}</td>
                          <td>{point.p10.toFixed(1)}</td>
                          <td>{point.p50.toFixed(1)}</td>
                          <td>{point.p90.toFixed(1)}</td>
                          <td>{point.rank}</td>
                          <td>
                            {percent(point.evidence.recipe?.minutes.sixtyMinuteProbability ?? 0)}
                          </td>
                          <td>
                            <div
                              className="room-quantile"
                              title={`P10 ${point.p10.toFixed(1)}, median ${point.p50.toFixed(1)}, P90 ${point.p90.toFixed(1)}`}
                            >
                              {[point.p10, point.p50, point.p90].map((value, index) => (
                                <span
                                  data-median={index === 1}
                                  key={`${value}:${index}`}
                                  style={{
                                    left: `${Math.min(100, (value / Math.max(12, point.p90)) * 100)}%`,
                                  }}
                                />
                              ))}
                            </div>
                          </td>
                          <td>{formatCountdown(selectedTime.minutesToDeadline)}</td>
                          <td>{signed(point.expectedPoints - comparison)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          </section>

          <aside className="room-panel room-recipe-panel" aria-label="Odds to points explanation">
            <div className="room-panel-head">
              <span className="room-panel-title">How odds become points</span>
              <span className="room-panel-index">{selectedPlayer.playerName}</span>
            </div>
            <Recipe player={selectedPlayer} point={selectedPoint} />
          </aside>
        </div>

        <div className="room-deadline-rail">
          <div className="room-rail-controls">
            <button
              type="button"
              className="room-icon-button"
              aria-label="Previous snapshot"
              disabled={selectedIndex === 0}
              onClick={() => setSelectedIndex((current) => Math.max(0, current - 1))}
            >
              <IconChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="room-icon-button"
              aria-label={playing ? "Pause replay" : "Play replay"}
              disabled={hasHydrated && Boolean(reducedMotion)}
              onClick={() => {
                if (!playing && selectedIndex === room.timeline.length - 1) setSelectedIndex(0);
                setPlaying((current) => !current);
              }}
            >
              {playing ? (
                <IconPlayerPause size={18} aria-hidden="true" />
              ) : (
                <IconPlayerPlay size={18} aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className="room-icon-button"
              aria-label="Next snapshot"
              disabled={selectedIndex === room.timeline.length - 1}
              onClick={() =>
                setSelectedIndex((current) => Math.min(room.timeline.length - 1, current + 1))
              }
            >
              <IconChevronRight size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="room-pin-button"
              aria-label={pinnedIndex === null ? "Pin current snapshot" : "Clear pinned snapshot"}
              aria-pressed={pinnedIndex !== null}
              onClick={() => setPinnedIndex((current) => (current === null ? selectedIndex : null))}
            >
              {pinnedIndex === null ? "Pin" : "Unpin"}
            </button>
          </div>
          <input
            className="room-range"
            type="range"
            min={0}
            max={Math.max(0, room.timeline.length - 1)}
            value={selectedIndex}
            aria-label="Deadline replay snapshot"
            onChange={(event) => {
              setPlaying(false);
              setSelectedIndex(Number(event.currentTarget.value));
            }}
          />
          <div className="room-rail-readout" aria-live="polite">
            <strong>{formatCountdown(selectedTime.minutesToDeadline)}</strong>
            <span>{formatObservedAt(selectedTime.observedAt)}</span>
            {pinnedTime && pinnedPoint ? (
              <span>
                vs {formatCountdown(pinnedTime.minutesToDeadline)} ·{" "}
                {signed(selectedPoint.expectedPoints - pinnedPoint.expectedPoints)} xP
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
