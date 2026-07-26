import {
  IconActivity,
  IconAlertTriangle,
  IconChartDots3,
  IconCircleCheck,
  IconClock,
  IconDatabase,
  IconInfoCircle,
  IconList,
  IconPlayerPause,
  IconPlayerPlay,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { scaleLinear } from "d3";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OpportunityMap, OpportunityPlayer } from "market-intelligence";

export type OpportunityViewState = {
  mode: "forecast" | "value" | "opportunity";
  view: "auto" | "map" | "list";
  horizon: 1 | 3 | 5;
  position: "ALL" | OpportunityPlayer["position"];
  team?: string;
  maxPrice?: number;
  minSixty: number;
  search?: string;
  player?: string;
  compare?: string;
  snapshot: string;
};

type ViewPatch = Partial<OpportunityViewState>;
type MapPlayer = OpportunityMap["players"][number] & {
  displayExpectedPoints: number;
  displayValue?: number;
  provisionalOwnershipGap?: number;
  xValue: number;
  yValue: number;
};

const positionColour = {
  GKP: "#7ea9ff",
  DEF: "#75e5d3",
  MID: "#f0c96b",
  FWD: "#ff7a73",
} as const;

const modes = {
  forecast: {
    label: "Forecast",
    x: "Projected points",
    y: "Haul probability",
    xFormat: (value: number) => value.toFixed(1),
    yFormat: (value: number) => `${Math.round(value * 100)}%`,
  },
  value: {
    label: "Value",
    x: "Projected points / £m",
    y: "Projected points",
    xFormat: (value: number) => value.toFixed(2),
    yFormat: (value: number) => value.toFixed(1),
  },
  opportunity: {
    label: "Opportunity",
    x: "Projected points / £m",
    y: "Ownership rank gap",
    xFormat: (value: number) => value.toFixed(2),
    yFormat: (value: number) => (value > 0 ? `+${Math.round(value)}` : `${Math.round(value)}`),
  },
} as const;

function playerPrice(player: OpportunityPlayer): number | undefined {
  if (player.price.status === "official") return player.price.value;
  if (player.price.status === "estimated") return player.price.midpoint;
  return undefined;
}

function priceLabel(player: OpportunityPlayer): string {
  if (player.price.status === "unpublished") return "Not published";
  if (player.price.status === "official") return `£${player.price.value.toFixed(1)}m`;
  return `~£${player.price.midpoint.toFixed(1)}m`;
}

function ownershipLabel(player: OpportunityPlayer): string {
  if (player.ownership.status === "unavailable") return "Not published";
  return `${player.ownership.value.toFixed(1)}%`;
}

function gameweekFixtureLabel(gameweek: OpportunityPlayer["gameweeks"][number]): string {
  if (!gameweek.fixtureDetails?.length) return gameweek.fixtures.length === 0 ? "Blank" : "Fixture";
  return gameweek.fixtureDetails
    .map((fixture) => `${fixture.opponent} ${fixture.venue === "home" ? "(H)" : "(A)"}`)
    .join(" + ");
}

function usePlotSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 900, height: 560 });
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () =>
      setSize({ width: Math.max(320, node.clientWidth), height: Math.max(420, node.clientHeight) });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { ref, size };
}

function OpportunityPlot({
  players,
  mode,
  selected,
  onSelect,
}: {
  players: MapPlayer[];
  mode: OpportunityViewState["mode"];
  selected?: string;
  onSelect: (player: MapPlayer) => void;
}) {
  const { ref, size } = usePlotSize();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const reduceMotion = useReducedMotion();
  const margin = { top: 38, right: 32, bottom: 62, left: 64 };
  const innerWidth = Math.max(1, size.width - margin.left - margin.right);
  const innerHeight = Math.max(1, size.height - margin.top - margin.bottom);
  const [hovered, setHovered] = useState<string>();
  const domain = useMemo(() => {
    const xs = players.map((player) => player.xValue);
    const ys = players.map((player) => player.yValue);
    const xMin = Math.min(...xs, 0);
    const xMax = Math.max(...xs, 1);
    const yMin = mode === "forecast" ? 0 : Math.min(...ys, mode === "opportunity" ? -1 : 0);
    const yMax = mode === "forecast" ? 1 : Math.max(...ys, 1);
    const xPad = Math.max(0.1, (xMax - xMin) * 0.12);
    const yPad = Math.max(mode === "forecast" ? 0.03 : 0.5, (yMax - yMin) * 0.12);
    return {
      x: [Math.max(0, xMin - xPad), xMax + xPad] as [number, number],
      y:
        mode === "forecast"
          ? ([0, 1] as [number, number])
          : ([yMin - yPad, yMax + yPad] as [number, number]),
    };
  }, [mode, players]);
  const xScale = useMemo(
    () =>
      scaleLinear()
        .domain(domain.x)
        .range([margin.left, margin.left + innerWidth])
        .nice(),
    [domain.x, innerWidth],
  );
  const yScale = useMemo(
    () =>
      scaleLinear()
        .domain(domain.y)
        .range([margin.top + innerHeight, margin.top])
        .nice(),
    [domain.y, innerHeight],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size.width * ratio;
    canvas.height = size.height * ratio;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.clearRect(0, 0, size.width, size.height);

    const active = selected ?? hovered;
    for (const player of players) {
      const x = xScale(player.xValue);
      const y = yScale(player.yValue);
      const radius = 4.5 + player.haulProbability * 8;
      const colour = positionColour[player.position];
      context.beginPath();
      context.arc(x, y, radius + 5 + player.sourceAgreement * 5, 0, Math.PI * 2);
      context.fillStyle = `${colour}${active === player.registrationKey ? "22" : "0c"}`;
      context.fill();
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fillStyle = active === player.registrationKey ? colour : `${colour}cc`;
      context.fill();
      context.strokeStyle = active === player.registrationKey ? "#edf5f5" : `${colour}88`;
      context.lineWidth = active === player.registrationKey ? 2 : 1;
      context.stroke();
    }
  }, [hovered, players, selected, size, xScale, yScale]);

  const labelled = players.find((player) => player.registrationKey === (hovered ?? selected));
  const xTicks = xScale.ticks(size.width < 560 ? 4 : 6);
  const yTicks = yScale.ticks(size.width < 560 ? 4 : 6);

  return (
    <div className="opportunity-plot" ref={ref}>
      <canvas ref={canvasRef} aria-hidden="true" />
      <svg
        ref={svgRef}
        viewBox={`0 0 ${size.width} ${size.height}`}
        aria-label={`${modes[mode].label} player map`}
        aria-describedby="opportunity-encoding-key"
      >
        <g className="opportunity-grid" aria-hidden="true">
          {xTicks.map((tick) => (
            <line
              key={`x-${tick}`}
              x1={xScale(tick)}
              x2={xScale(tick)}
              y1={margin.top}
              y2={margin.top + innerHeight}
            />
          ))}
          {yTicks.map((tick) => (
            <line
              key={`y-${tick}`}
              x1={margin.left}
              x2={margin.left + innerWidth}
              y1={yScale(tick)}
              y2={yScale(tick)}
            />
          ))}
        </g>
        <g className="opportunity-axis" aria-hidden="true">
          {xTicks.map((tick) => (
            <text key={`xt-${tick}`} x={xScale(tick)} y={size.height - 35} textAnchor="middle">
              {modes[mode].xFormat(tick)}
            </text>
          ))}
          {yTicks.map((tick) => (
            <text key={`yt-${tick}`} x={margin.left - 12} y={yScale(tick) + 3} textAnchor="end">
              {modes[mode].yFormat(tick)}
            </text>
          ))}
          <text
            className="axis-title"
            x={margin.left + innerWidth / 2}
            y={size.height - 9}
            textAnchor="middle"
          >
            {modes[mode].x}
          </text>
          <text
            className="axis-title"
            x={16}
            y={margin.top + innerHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90 16 ${margin.top + innerHeight / 2})`}
          >
            {modes[mode].y}
          </text>
        </g>
        <g className="opportunity-hit-targets">
          {players.map((player, index) => (
            <motion.circle
              key={player.registrationKey}
              role="button"
              tabIndex={
                player.registrationKey ===
                (players.some((candidate) => candidate.registrationKey === selected)
                  ? selected
                  : players[0]?.registrationKey)
                  ? 0
                  : -1
              }
              data-map-index={index}
              aria-label={`${player.name}, ${player.team}, ${player.displayExpectedPoints.toFixed(1)} projected points`}
              cx={xScale(player.xValue)}
              cy={yScale(player.yValue)}
              r={15}
              fill="transparent"
              initial={false}
              animate={{ cx: xScale(player.xValue), cy: yScale(player.yValue) }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 230, damping: 28, mass: 0.7 }
              }
              onMouseEnter={() => setHovered(player.registrationKey)}
              onMouseLeave={() => setHovered(undefined)}
              onFocus={() => setHovered(player.registrationKey)}
              onBlur={() => setHovered(undefined)}
              onClick={() => onSelect(player)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(player);
                  return;
                }
                const direction =
                  event.key === "ArrowRight" || event.key === "ArrowDown"
                    ? 1
                    : event.key === "ArrowLeft" || event.key === "ArrowUp"
                      ? -1
                      : 0;
                if (direction === 0 && event.key !== "Home" && event.key !== "End") return;
                event.preventDefault();
                const nextIndex =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? players.length - 1
                      : (index + direction + players.length) % players.length;
                const next = players[nextIndex];
                if (!next) return;
                onSelect(next);
                window.requestAnimationFrame(() => {
                  svgRef.current
                    ?.querySelector<SVGCircleElement>(`[data-map-index="${nextIndex}"]`)
                    ?.focus();
                });
              }}
            />
          ))}
        </g>
        {labelled ? (
          <g
            className="opportunity-point-label"
            transform={`translate(${Math.min(size.width - 180, xScale(labelled.xValue) + 14)} ${Math.max(32, yScale(labelled.yValue) - 17)})`}
            aria-hidden="true"
          >
            <rect width="166" height="38" rx="2" />
            <text x="9" y="15">
              {labelled.name}
            </text>
            <text className="point-label-value" x="9" y="29">
              {labelled.displayExpectedPoints.toFixed(1)} xP · {labelled.team}
            </text>
          </g>
        ) : null}
      </svg>
      {players.length === 0 ? (
        <div className="opportunity-empty">
          <IconSearch size={18} /> No players match these filters.
        </div>
      ) : null}
    </div>
  );
}

function PlayerList({
  players,
  selected,
  horizon,
  onSelect,
}: {
  players: MapPlayer[];
  selected?: string;
  horizon: 1 | 3 | 5;
  onSelect: (player: MapPlayer) => void;
}) {
  return (
    <div className="opportunity-list-wrap">
      <table className="opportunity-list">
        <thead>
          <tr>
            <th>Player</th>
            <th>{horizon}-GW xP</th>
            <th>Price</th>
            <th>Haul</th>
            <th>60+</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr
              key={player.registrationKey}
              data-selected={selected === player.registrationKey || undefined}
            >
              <th scope="row">
                <button type="button" onClick={() => onSelect(player)}>
                  <i style={{ backgroundColor: positionColour[player.position] }} />
                  <span>
                    {player.name}
                    <small>
                      {player.team} · {player.position} ·{" "}
                      {player.gameweeks[0]
                        ? gameweekFixtureLabel(player.gameweeks[0])
                        : "No fixture"}
                    </small>
                  </span>
                </button>
              </th>
              <td data-label={`${horizon}-GW xP`}>{player.displayExpectedPoints.toFixed(1)}</td>
              <td data-label="Price">{priceLabel(player)}</td>
              <td data-label="Haul">{Math.round(player.haulProbability * 100)}%</td>
              <td data-label="60+">{Math.round(player.sixtyMinuteProbability * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlayerInspector({
  player,
  compared,
  onCompare,
  onClose,
}: {
  player?: MapPlayer;
  compared: boolean;
  onCompare: () => void;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <AnimatePresence mode="wait">
      {player ? (
        <motion.aside
          key={player.registrationKey}
          className="opportunity-inspector"
          aria-label={`${player.name} forecast details`}
          initial={reduceMotion ? false : { opacity: 0, x: 22 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 14 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="inspector-head">
            <span>
              {player.position} / {player.team}
            </span>
            <button type="button" onClick={onClose} aria-label="Close player details">
              <IconX size={17} />
            </button>
          </div>
          <h2>{player.name}</h2>
          <p className="inspector-summary">
            <strong>{player.displayExpectedPoints.toFixed(1)}</strong>
            <span>projected points over {player.gameweeks.length} gameweeks</span>
          </p>
          <div className="inspector-stat-grid">
            <div>
              <span>Price</span>
              <b>{priceLabel(player)}</b>
              <small>
                {player.price.status === "estimated" ? "estimated band" : player.price.status}
              </small>
            </div>
            <div>
              <span>Ownership</span>
              <b>{ownershipLabel(player)}</b>
              <small>{player.ownership.status}</small>
            </div>
            <div>
              <span>Haul ≥10</span>
              <b>{Math.round(player.haulProbability * 100)}%</b>
              <small>model probability</small>
            </div>
            <div>
              <span>Starts 60+</span>
              <b>{Math.round(player.sixtyMinuteProbability * 100)}%</b>
              <small>minutes prior</small>
            </div>
          </div>
          <section className="inspector-range" aria-label="Forecast interval">
            <header>
              <span>Outcome range</span>
              <b>
                {player.p10} — {player.p90}
              </b>
            </header>
            <div>
              <i style={{ left: `${Math.max(0, (player.p10 / player.p90) * 100)}%` }} />
              <i
                className="median"
                style={{ left: `${Math.max(0, (player.p50 / player.p90) * 100)}%` }}
              />
              <i
                className="mean"
                style={{ left: `${Math.max(0, (player.expectedPoints / player.p90) * 100)}%` }}
              />
            </div>
            <footer>
              <span>P10</span>
              <span>Median</span>
              <span>Mean</span>
              <span>P90</span>
            </footer>
          </section>
          <section className="inspector-weeks">
            <h3>Gameweek shape</h3>
            {player.gameweeks.map((gameweek) => (
              <div key={gameweek.gameweek}>
                <span>
                  GW{gameweek.gameweek}
                  <small>{gameweekFixtureLabel(gameweek)}</small>
                </span>
                <i>
                  <b style={{ width: `${Math.min(100, gameweek.expectedPoints * 11)}%` }} />
                </i>
                <strong>{gameweek.expectedPoints.toFixed(1)}</strong>
              </div>
            ))}
          </section>
          {player.fpl?.news ? (
            <p className="inspector-news">
              <IconAlertTriangle size={14} />
              <span>
                <b>Availability note</b>
                {player.fpl.news}
              </span>
            </p>
          ) : null}
          <div className="inspector-confidence">
            <span>
              Market coverage <b>{Math.round(player.marketCoverage * 100)}%</b>
            </span>
            <span>
              Source agreement <b>{Math.round(player.sourceAgreement * 100)}%</b>
            </span>
          </div>
          <details>
            <summary>
              <IconDatabase size={15} /> Forecast provenance
            </summary>
            <dl>
              <div>
                <dt>Model</dt>
                <dd>
                  {player.provenance.modelKey} {player.provenance.modelVersion}
                </dd>
              </div>
              <div>
                <dt>Cut-off</dt>
                <dd>{new Date(player.provenance.cutoffAt).toLocaleString("en-GB")}</dd>
              </div>
              <div>
                <dt>Rules</dt>
                <dd>{player.provenance.rulesetStatus}</dd>
              </div>
              <div>
                <dt>Inputs</dt>
                <dd>{player.provenance.inputBatchIds.length} immutable batches</dd>
              </div>
            </dl>
          </details>
          <button className="inspector-compare" type="button" onClick={onCompare}>
            {compared ? "Remove from comparison" : "Add to comparison"}
          </button>
        </motion.aside>
      ) : (
        <aside className="opportunity-inspector inspector-placeholder">
          <IconChartDots3 size={24} />
          <h2>Select a player</h2>
          <p>Inspect the forecast range, availability, source coverage, and per-gameweek shape.</p>
        </aside>
      )}
    </AnimatePresence>
  );
}

function SourceHealth({ map }: { map: OpportunityMap }) {
  return (
    <details className="source-health">
      <summary>
        <IconActivity size={15} />
        Source health
        <span>
          {map.sourceHealth.filter((source) => source.status === "fresh").length}/
          {map.sourceHealth.length} fresh
        </span>
      </summary>
      <div>
        {map.sourceHealth.map((source) => (
          <article key={source.sourceKey} data-status={source.status}>
            {source.status === "fresh" ? (
              <IconCircleCheck size={15} />
            ) : source.status === "missing" ? (
              <IconAlertTriangle size={15} />
            ) : (
              <IconClock size={15} />
            )}
            <span>
              <b>{source.label}</b>
              <small>{source.detail ?? source.status}</small>
            </span>
            <strong>{Math.round(source.coverage * 100)}%</strong>
          </article>
        ))}
      </div>
    </details>
  );
}

export function OpportunityMapExperience({
  map,
  state,
  onStateChange,
}: {
  map: OpportunityMap;
  state: OpportunityViewState;
  onStateChange: (patch: ViewPatch) => void;
}) {
  const reduceMotion = useReducedMotion();
  const [playing, setPlaying] = useState(false);
  const compareKeys = useMemo(
    () => new Set((state.compare ?? "").split(",").filter(Boolean)),
    [state.compare],
  );
  const teams = useMemo(
    () => [...new Set(map.players.map((player) => player.team))].toSorted(),
    [map],
  );
  const snapshotTimes = useMemo(() => {
    const coverage = new Map<string, number>();
    for (const player of map.players) {
      for (const observedAt of new Set(player.trail.map((point) => point.observedAt))) {
        coverage.set(observedAt, (coverage.get(observedAt) ?? 0) + 1);
      }
    }
    const minimumCoverage = Math.max(1, Math.floor(map.players.length * 0.95));
    return [...coverage]
      .filter(([, count]) => count >= minimumCoverage)
      .map(([observedAt]) => observedAt)
      .toSorted()
      .slice(-11);
  }, [map.players]);
  const replayTimes = useMemo(() => [...snapshotTimes, "latest"], [snapshotTimes]);
  const selectedSnapshot =
    state.snapshot === "latest" || snapshotTimes.includes(state.snapshot)
      ? state.snapshot
      : "latest";

  const rankedOwnership = useMemo(() => {
    const ranks = new Map<string, number>();
    for (const position of ["GKP", "DEF", "MID", "FWD"] as const) {
      map.players
        .filter(
          (player) => player.position === position && player.ownership.status !== "unavailable",
        )
        .toSorted((left, right) => {
          const leftValue = left.ownership.status === "unavailable" ? 0 : left.ownership.value;
          const rightValue = right.ownership.status === "unavailable" ? 0 : right.ownership.value;
          return rightValue - leftValue;
        })
        .forEach((player, index) => ranks.set(player.registrationKey, index + 1));
    }
    return ranks;
  }, [map.players]);

  const players = useMemo<MapPlayer[]>(() => {
    const search = state.search?.trim().toLocaleLowerCase();
    return map.players
      .flatMap((player) => {
        const trailPoint =
          selectedSnapshot === "latest"
            ? undefined
            : player.trail.find((point) => point.observedAt === selectedSnapshot);
        if (selectedSnapshot !== "latest" && !trailPoint) return [];
        const displayExpectedPoints = Number(
          (trailPoint?.expectedPoints ?? player.expectedPoints).toFixed(2),
        );
        const price = playerPrice(player);
        const displayValue = price ? displayExpectedPoints / price : undefined;
        const ownershipRank = rankedOwnership.get(player.registrationKey);
        const provisionalOwnershipGap = ownershipRank
          ? ownershipRank - player.forecastRankWithinPosition
          : undefined;
        const xValue = state.mode === "forecast" ? displayExpectedPoints : (displayValue ?? 0);
        const yValue =
          state.mode === "forecast"
            ? player.haulProbability
            : state.mode === "value"
              ? displayExpectedPoints
              : (player.ownershipRankGap ?? provisionalOwnershipGap ?? 0);
        return [
          {
            ...player,
            displayExpectedPoints,
            displayValue,
            provisionalOwnershipGap,
            xValue,
            yValue,
          },
        ];
      })
      .filter(
        (player) =>
          (state.position === "ALL" || player.position === state.position) &&
          (!state.team || player.team === state.team) &&
          (state.maxPrice === undefined ||
            (playerPrice(player) ?? Number.POSITIVE_INFINITY) <= state.maxPrice) &&
          player.sixtyMinuteProbability >= state.minSixty &&
          (!search || `${player.name} ${player.team}`.toLocaleLowerCase().includes(search)),
      )
      .toSorted((left, right) => {
        if (state.mode === "value") {
          return (right.displayValue ?? 0) - (left.displayValue ?? 0);
        }
        if (state.mode === "opportunity") {
          return (
            (right.ownershipRankGap ?? right.provisionalOwnershipGap ?? 0) -
            (left.ownershipRankGap ?? left.provisionalOwnershipGap ?? 0)
          );
        }
        return right.displayExpectedPoints - left.displayExpectedPoints;
      });
  }, [map.players, rankedOwnership, selectedSnapshot, state]);

  const selected =
    players.find((player) => player.registrationKey === state.player) ??
    map.players.find((player) => player.registrationKey === state.player);
  const selectedMapPlayer = selected
    ? players.find((player) => player.registrationKey === selected.registrationKey)
    : undefined;

  useEffect(() => {
    if (!playing || reduceMotion) return;
    const timer = window.setInterval(() => {
      const currentIndex = Math.max(0, replayTimes.indexOf(selectedSnapshot));
      onStateChange({ snapshot: replayTimes[(currentIndex + 1) % replayTimes.length] });
    }, 1_400);
    return () => window.clearInterval(timer);
  }, [onStateChange, playing, reduceMotion, replayTimes, selectedSnapshot]);

  const selectPlayer = useCallback(
    (player: MapPlayer) => onStateChange({ player: player.registrationKey }),
    [onStateChange],
  );
  const toggleCompare = (key: string) => {
    const next = new Set(compareKeys);
    if (next.has(key)) next.delete(key);
    else if (next.size < 3) next.add(key);
    onStateChange({ compare: [...next].join(",") || undefined });
  };
  const selectedSnapshotAt = selectedSnapshot === "latest" ? map.observedAt : selectedSnapshot;
  const officialPrices = map.season.priceState === "official";
  const partialPrices = map.season.priceState === "partial";
  const priceValues = map.players.flatMap((player) => {
    const value = playerPrice(player);
    return value === undefined ? [] : [value];
  });
  const minimumPrice = Math.min(...priceValues, 4);
  const maximumPrice = Math.max(...priceValues, 15);

  return (
    <div className="opportunity-page" data-view={state.view}>
      <div className="opportunity-shell">
        <header className="opportunity-hero">
          <div>
            <p className="opportunity-kicker">{map.season.label} / Market intelligence</p>
            <h1 aria-label="Discovery Map">
              Discovery
              <br />
              Map
            </h1>
            <p className="opportunity-lede">
              Find price-point alternatives and ownership gaps, then move the players that matter
              into the Squad Lab.
            </p>
          </div>
          <div className="opportunity-hero-status">
            <span className="scenario-badge">
              <IconInfoCircle size={14} />
              {map.season.lifecycle === "active"
                ? "Live season"
                : `${map.season.label} pre-season · live data`}
            </span>
            <strong>{map.players.length}</strong>
            <small>players modelled</small>
            <strong>
              {map.sourceHealth.reduce((sum, source) => sum + source.coverage, 0).toFixed(1)}
            </strong>
            <small>source-equivalents</small>
          </div>
        </header>

        <section className="opportunity-notice" aria-label="Data availability note">
          <IconAlertTriangle size={17} />
          <p>
            <strong>
              {officialPrices
                ? "Official FPL prices and ownership are active."
                : partialPrices
                  ? "FPL prices are being published."
                  : "Prices and ownership are not official yet."}
            </strong>{" "}
            {officialPrices
              ? "Prices are locked until the GW1 deadline. Forecast uncertainty reflects minutes, roles, fixtures and market evidence—not price estimates."
              : partialPrices
                ? "Published values are used player by player; unavailable values remain visibly withheld."
                : `Value views use clearly marked estimates and will switch to live data when FPL publishes its ${map.season.label} player list.`}
          </p>
          <SourceHealth map={map} />
        </section>

        <div className="opportunity-controls">
          <div className="opportunity-segment" role="group" aria-label="Forecast horizon">
            {([1, 3, 5] as const).map((horizon) => (
              <button
                key={horizon}
                type="button"
                aria-pressed={state.horizon === horizon}
                onClick={() => onStateChange({ horizon, snapshot: "latest" })}
              >
                {horizon} GW
              </button>
            ))}
          </div>
          <div className="opportunity-segment" role="group" aria-label="Analysis mode">
            {(Object.keys(modes) as OpportunityViewState["mode"][]).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={state.mode === mode}
                onClick={() => onStateChange({ mode })}
              >
                {modes[mode].label}
              </button>
            ))}
          </div>
          <label className="opportunity-search">
            <IconSearch size={15} />
            <input
              value={state.search ?? ""}
              onChange={(event) => onStateChange({ search: event.target.value || undefined })}
              placeholder="Find a player"
              aria-label="Find a player"
              name="player-search"
              autoComplete="off"
            />
          </label>
          <div className="opportunity-segment view-toggle" role="group" aria-label="View">
            <button
              type="button"
              aria-label="Map view"
              aria-pressed={state.view === "map"}
              onClick={() => onStateChange({ view: "map" })}
            >
              <IconChartDots3 size={16} />
              <span>Map</span>
            </button>
            <button
              type="button"
              aria-label="List view"
              aria-pressed={state.view === "list"}
              onClick={() => onStateChange({ view: "list" })}
            >
              <IconList size={16} />
              <span>List</span>
            </button>
          </div>
        </div>

        <div className="opportunity-workbench">
          <aside className="opportunity-filter-rail" aria-label="Player filters">
            <fieldset>
              <legend>Position</legend>
              <div className="position-filter">
                {(["ALL", "GKP", "DEF", "MID", "FWD"] as const).map((position) => (
                  <button
                    key={position}
                    type="button"
                    aria-pressed={state.position === position}
                    onClick={() => onStateChange({ position })}
                  >
                    {position}
                  </button>
                ))}
              </div>
            </fieldset>
            <label>
              Team
              <select
                value={state.team ?? ""}
                onChange={(event) => onStateChange({ team: event.target.value || undefined })}
              >
                <option value="">All teams</option>
                {teams.map((team) => (
                  <option key={team}>{team}</option>
                ))}
              </select>
            </label>
            <label className="price-filter">
              Maximum price{" "}
              <output>{state.maxPrice ? `£${state.maxPrice.toFixed(1)}m` : "Any"}</output>
              <input
                type="range"
                min={minimumPrice}
                max={maximumPrice}
                step="0.1"
                value={state.maxPrice ?? maximumPrice}
                onChange={(event) =>
                  onStateChange({
                    maxPrice: Number(event.target.value),
                  })
                }
              />
              <button
                type="button"
                aria-pressed={state.maxPrice === undefined}
                onClick={() => onStateChange({ maxPrice: undefined })}
              >
                No price cap
              </button>
            </label>
            <label>
              60-minute chance <output>{Math.round(state.minSixty * 100)}%+</output>
              <input
                type="range"
                min="0"
                max="0.95"
                step="0.05"
                value={state.minSixty}
                onChange={(event) => onStateChange({ minSixty: Number(event.target.value) })}
              />
            </label>
            <button
              className="clear-filters"
              type="button"
              onClick={() =>
                onStateChange({
                  position: "ALL",
                  team: undefined,
                  maxPrice: undefined,
                  minSixty: 0,
                  search: undefined,
                })
              }
            >
              Clear filters
            </button>
            <div className="position-key">
              {(["GKP", "DEF", "MID", "FWD"] as const).map((position) => (
                <span key={position}>
                  <i style={{ backgroundColor: positionColour[position] }} />
                  {position}
                </span>
              ))}
              <span id="opportunity-encoding-key" className="encoding-key">
                Point size = haul chance · halo = source agreement
              </span>
            </div>
          </aside>

          <section className="opportunity-stage">
            <div className="stage-head">
              <div>
                <span>{modes[state.mode].label} view</span>
                <strong>{players.length} visible</strong>
              </div>
              <p>
                {state.mode === "forecast"
                  ? "High and right combines projected output with explosive upside."
                  : state.mode === "value"
                    ? "High and right combines volume with budget efficiency."
                    : "High and right surfaces forecast-backed players with low expected ownership."}
              </p>
            </div>
            <div className="map-view">
              <OpportunityPlot
                players={players}
                mode={state.mode}
                selected={state.player}
                onSelect={selectPlayer}
              />
            </div>
            <div className="list-view">
              <PlayerList
                players={players}
                selected={state.player}
                horizon={state.horizon}
                onSelect={selectPlayer}
              />
            </div>
            <div className="snapshot-rail">
              <button
                type="button"
                className="snapshot-play"
                onClick={() => setPlaying((value) => !value)}
                aria-label={playing ? "Pause snapshot replay" : "Play snapshot replay"}
              >
                {playing ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
              </button>
              <div>
                {replayTimes.map((observedAt, index) => (
                  <button
                    key={observedAt}
                    type="button"
                    aria-pressed={selectedSnapshot === observedAt}
                    onClick={() => {
                      setPlaying(false);
                      onStateChange({ snapshot: observedAt });
                    }}
                  >
                    <i />
                    <span>
                      {observedAt === "latest" ? "Current" : `T−${replayTimes.length - 1 - index}`}
                    </span>
                  </button>
                ))}
              </div>
              <time dateTime={selectedSnapshotAt}>
                {new Date(selectedSnapshotAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                })}
              </time>
            </div>
          </section>

          <PlayerInspector
            player={selectedMapPlayer}
            compared={
              selectedMapPlayer ? compareKeys.has(selectedMapPlayer.registrationKey) : false
            }
            onCompare={() => selectedMapPlayer && toggleCompare(selectedMapPlayer.registrationKey)}
            onClose={() => onStateChange({ player: undefined })}
          />
        </div>

        <AnimatePresence>
          {compareKeys.size > 0 ? (
            <motion.section
              className="compare-tray"
              initial={reduceMotion ? false : { opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              aria-label="Player comparison"
            >
              <header>
                <span>Compare / {compareKeys.size} of 3</span>
                <button type="button" onClick={() => onStateChange({ compare: undefined })}>
                  Clear
                </button>
              </header>
              <div>
                {map.players
                  .filter((player) => compareKeys.has(player.registrationKey))
                  .map((player) => (
                    <article key={player.registrationKey}>
                      <i style={{ backgroundColor: positionColour[player.position] }} />
                      <span>
                        <b>{player.name}</b>
                        <small>
                          {player.team} · {priceLabel(player)} ·{" "}
                          {player.gameweeks[0]
                            ? gameweekFixtureLabel(player.gameweeks[0])
                            : "No fixture"}
                        </small>
                      </span>
                      <strong>
                        {player.expectedPoints.toFixed(1)}
                        <small>xP</small>
                      </strong>
                      <button
                        type="button"
                        onClick={() => toggleCompare(player.registrationKey)}
                        aria-label={`Remove ${player.name}`}
                      >
                        <IconX size={14} />
                      </button>
                    </article>
                  ))}
              </div>
            </motion.section>
          ) : null}
        </AnimatePresence>

        <p className="sr-only" aria-live="polite">
          {players.length} players visible
          {selectedMapPlayer ? `. ${selectedMapPlayer.name} selected.` : "."}
        </p>

        <footer className="opportunity-method">
          <IconDatabase size={16} />
          <p>
            <strong>What this model knows.</strong> Fixture-level goal rates, player minutes and
            event priors are converted through a versioned FPL rules engine. The map preserves its
            cut-off and input batches so every result can be replayed.
          </p>
          <span>market-xp / v2</span>
        </footer>
      </div>
    </div>
  );
}
