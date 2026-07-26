import {
  IconArrowsExchange,
  IconChartDots3,
  IconChevronRight,
  IconCrown,
  IconLock,
  IconSearch,
  IconTrash,
  IconUsers,
  IconWand,
  IconX,
} from "@tabler/icons-react";
import { line, scaleLinear } from "d3";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import {
  buildSuggestedSquad,
  createEmptySquad,
  squadRulesFromSeason,
  squadStateSchema,
  validateSquad,
  type OpportunityMap,
  type OpportunityPlayer,
  type SquadPick,
  type SquadState,
} from "market-intelligence";

type Player = OpportunityMap["players"][number];
type Position = OpportunityPlayer["position"];

const positions = ["GKP", "DEF", "MID", "FWD"] as const;
const positionColour: Record<Position, string> = {
  GKP: "#7ea9ff",
  DEF: "#75e5d3",
  MID: "#f0c96b",
  FWD: "#ff7a73",
};

function playerPrice(player: Player): number | undefined {
  return player.price.status === "official" ? player.price.value : undefined;
}

function ownership(player: Player): number | undefined {
  return player.ownership.status === "unavailable" ? undefined : player.ownership.value;
}

function fixtureLabel(player: Player, gameweekIndex = 0): string {
  const details = player.gameweeks[gameweekIndex]?.fixtureDetails ?? [];
  if (details.length === 0) return "Blank";
  return details
    .map((fixture) => `${fixture.opponent} ${fixture.venue === "home" ? "(H)" : "(A)"}`)
    .join(" + ");
}

function captainScore(player: Player): number {
  return player.gameweeks[0]?.expectedPoints ?? player.expectedPoints;
}

function normalizeBench(picks: SquadPick[]): SquadPick[] {
  let order = 0;
  return picks.map((pick) => {
    if (pick.role === "starter") {
      const { benchOrder: _benchOrder, ...starter } = pick;
      return starter;
    }
    order += 1;
    return { ...pick, benchOrder: order };
  });
}

function PriceFrontier({
  players,
  selectedKeys,
  position,
}: {
  players: Player[];
  selectedKeys: Set<string>;
  position: Position;
}) {
  const candidates = players
    .filter((player) => player.position === position && playerPrice(player) !== undefined)
    .toSorted((left, right) => playerPrice(left)! - playerPrice(right)!);
  if (candidates.length === 0) return null;
  const minPrice = Math.min(...candidates.map((player) => playerPrice(player)!));
  const maxPrice = Math.max(...candidates.map((player) => playerPrice(player)!));
  const replacementLevel = Math.max(
    ...candidates
      .filter((player) => playerPrice(player)! <= minPrice + 0.5)
      .map((player) => player.expectedPoints),
    0,
  );
  const pointsAboveReplacement = (player: Player) =>
    Math.max(0, player.expectedPoints - replacementLevel);
  const maxPoints = Math.max(...candidates.map(pointsAboveReplacement), 1);
  const x = scaleLinear()
    .domain([minPrice, maxPrice === minPrice ? minPrice + 0.1 : maxPrice])
    .range([38, 502]);
  const y = scaleLinear().domain([0, maxPoints]).range([180, 18]);
  let frontierBest = Number.NEGATIVE_INFINITY;
  const frontier = candidates.filter((player) => {
    const adjustedPoints = pointsAboveReplacement(player);
    if (adjustedPoints <= frontierBest) return false;
    frontierBest = adjustedPoints;
    return true;
  });
  const frontierLine = line<Player>()
    .x((player) => x(playerPrice(player)!))
    .y((player) => y(pointsAboveReplacement(player)))(frontier);

  return (
    <figure className="price-frontier">
      <figcaption>
        <span>{position} price frontier</span>
        <small>
          The cyan edge marks xP above a £{minPrice.toFixed(1)}–£
          {(minPrice + 0.5).toFixed(1)}m replacement option.
        </small>
      </figcaption>
      <svg viewBox="0 0 520 205" role="img" aria-labelledby={`frontier-${position}`}>
        <title id={`frontier-${position}`}>
          {`${position} price versus projected points frontier`}
        </title>
        <g aria-hidden="true" className="frontier-grid">
          {[0.25, 0.5, 0.75, 1].map((step) => (
            <line key={step} x1="38" x2="502" y1={y(maxPoints * step)} y2={y(maxPoints * step)} />
          ))}
        </g>
        {frontierLine ? (
          <path className="frontier-line" d={frontierLine} aria-hidden="true" />
        ) : null}
        <g aria-hidden="true">
          {candidates.map((player) => (
            <circle
              key={player.registrationKey}
              cx={x(playerPrice(player)!)}
              cy={y(pointsAboveReplacement(player))}
              r={selectedKeys.has(player.registrationKey) ? 5 : 2.5}
              data-selected={selectedKeys.has(player.registrationKey) || undefined}
              style={{ "--point-colour": positionColour[position] } as React.CSSProperties}
            />
          ))}
        </g>
        <g className="frontier-axis" aria-hidden="true">
          <text x="38" y="199">
            £{minPrice.toFixed(1)}m
          </text>
          <text x="502" y="199" textAnchor="end">
            £{maxPrice.toFixed(1)}m
          </text>
          <text x="38" y="13">
            +{maxPoints.toFixed(1)} xP
          </text>
        </g>
      </svg>
    </figure>
  );
}

function SquadPlayerCard({
  player,
  pick,
  replacing,
  onReplace,
  onRemove,
  onToggleRole,
  onCaptain,
}: {
  player: Player;
  pick: SquadPick;
  replacing: boolean;
  onReplace: () => void;
  onRemove: () => void;
  onToggleRole: () => void;
  onCaptain: () => void;
}) {
  return (
    <motion.article
      layout
      className="squad-player-card"
      data-position={player.position}
      data-replacing={replacing || undefined}
      style={{ "--position-colour": positionColour[player.position] } as React.CSSProperties}
    >
      <button className="player-card-main" type="button" onClick={onReplace}>
        <span className="player-card-position">{player.position}</span>
        <strong>{player.name}</strong>
        <small>
          {player.team} · {fixtureLabel(player)}
        </small>
        <span className="player-card-numbers">
          <b>{player.expectedPoints.toFixed(1)} xP</b>
          <b>£{playerPrice(player)?.toFixed(1) ?? "—"}m</b>
        </span>
        <small className="player-card-confidence">
          {player.p10.toFixed(1)}–{player.p90.toFixed(1)} range ·{" "}
          {Math.round(player.sixtyMinuteProbability * 100)}% 60+ ·{" "}
          {ownership(player)?.toFixed(0) ?? "—"}% owned
        </small>
        <small className="player-card-confidence">
          {Math.round(player.marketCoverage * 100)}% market coverage ·{" "}
          {Math.round(player.sourceAgreement * 100)}% source agreement
        </small>
      </button>
      <div className="player-card-actions">
        <button type="button" onClick={onToggleRole}>
          {pick.role === "starter" ? "Bench" : "Start"}
        </button>
        {pick.role === "starter" ? (
          <button
            type="button"
            className="captain-button"
            data-active={pick.captain || undefined}
            onClick={onCaptain}
            aria-label={`${pick.captain ? "Remove captaincy from" : "Captain"} ${player.name}`}
          >
            <IconCrown size={14} />
          </button>
        ) : null}
        <button type="button" onClick={onRemove} aria-label={`Remove ${player.name}`}>
          <IconTrash size={14} />
        </button>
      </div>
    </motion.article>
  );
}

export function SquadLab({
  map,
  horizon,
  onHorizonChange,
}: {
  map: OpportunityMap;
  horizon: 1 | 3 | 5;
  onHorizonChange: (horizon: 1 | 3 | 5) => void;
}) {
  const reduceMotion = useReducedMotion();
  const squadRules = useMemo(
    () => squadRulesFromSeason(map.season.officialRules),
    [map.season.officialRules],
  );
  const storageKey = `fpl-squad:${map.season.key}`;
  const [squad, setSquad] = useState<SquadState>(() =>
    createEmptySquad(map.season.key, horizon, squadRules.budget),
  );
  const [hydrated, setHydrated] = useState(false);
  const [poolPosition, setPoolPosition] = useState<Position>("MID");
  const [search, setSearch] = useState("");
  const [replacing, setReplacing] = useState<string>();
  const [announcement, setAnnouncement] = useState("Squad Lab ready.");

  const playerByKey = useMemo(
    () => new Map(map.players.map((player) => [player.registrationKey, player])),
    [map.players],
  );
  const selectedKeys = useMemo(
    () => new Set(squad.picks.map((pick) => pick.registrationKey)),
    [squad.picks],
  );
  const validation = useMemo(
    () => validateSquad(squad, map.players, squadRules),
    [map.players, squad, squadRules],
  );

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      const parsed = squadStateSchema.safeParse(JSON.parse(stored));
      if (parsed.success && parsed.data.seasonKey === map.season.key) {
        setSquad({ ...parsed.data, horizon, budget: squadRules.budget });
      }
    }
    setHydrated(true);
  }, [horizon, map.season.key, squadRules.budget, storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify({ ...squad, horizon }));
  }, [horizon, hydrated, squad, storageKey]);

  useEffect(() => {
    setSquad((current) => ({ ...current, horizon }));
  }, [horizon]);

  const selected = squad.picks.flatMap((pick) => {
    const player = playerByKey.get(pick.registrationKey);
    return player ? [{ pick, player }] : [];
  });
  const starters = positions.map((position) => ({
    position,
    players: selected.filter(
      ({ pick, player }) => pick.role === "starter" && player.position === position,
    ),
  }));
  const bench = selected
    .filter(({ pick }) => pick.role === "bench")
    .toSorted((left, right) => (left.pick.benchOrder ?? 9) - (right.pick.benchOrder ?? 9));
  const pool = map.players
    .filter(
      (player) =>
        player.position === poolPosition &&
        !selectedKeys.has(player.registrationKey) &&
        `${player.name} ${player.team}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
    )
    .toSorted((left, right) => right.expectedPoints - left.expectedPoints);
  const replacingPlayer = replacing ? playerByKey.get(replacing) : undefined;

  function replacementIssue(player: Player): string | undefined {
    if (!replacingPlayer) return undefined;
    if (player.position !== replacingPlayer.position) {
      return `Choose another ${replacingPlayer.position}.`;
    }
    const incomingPrice = playerPrice(player);
    const outgoingPrice = playerPrice(replacingPlayer);
    if (
      incomingPrice !== undefined &&
      outgoingPrice !== undefined &&
      incomingPrice > outgoingPrice + validation.bank + 0.001
    ) {
      return `Needs £${(incomingPrice - outgoingPrice - validation.bank).toFixed(1)}m more bank.`;
    }
    const sameClub = player.team === replacingPlayer.team;
    if (!sameClub && (validation.clubCounts[player.team] ?? 0) >= squadRules.clubLimit) {
      return `${player.team} already has ${squadRules.clubLimit} players.`;
    }
    return undefined;
  }

  function choosePlayer(player: Player) {
    if (playerPrice(player) === undefined) {
      setAnnouncement(`${player.name} cannot be selected until an official price is available.`);
      return;
    }
    setSquad((current) => {
      if (replacing) {
        const replaced = current.picks.find((pick) => pick.registrationKey === replacing);
        if (!replaced || replaced.registrationKey === player.registrationKey) return current;
        const issue = replacementIssue(player);
        if (issue) {
          setAnnouncement(issue);
          return current;
        }
        setAnnouncement(
          `${player.name} replaces ${replacingPlayer?.name ?? "the selected player"}.`,
        );
        return {
          ...current,
          picks: current.picks.map((pick) =>
            pick.registrationKey === replacing
              ? { ...replaced, registrationKey: player.registrationKey }
              : pick,
          ),
        };
      }
      if (current.picks.length >= squadRules.squadSize) {
        setAnnouncement(
          `The squad already contains ${squadRules.squadSize} players. Select a player to replace.`,
        );
        return current;
      }
      const positionCount = current.picks.filter(
        (pick) => playerByKey.get(pick.registrationKey)?.position === player.position,
      ).length;
      if (positionCount >= squadRules.positionRules[player.position].squad) {
        setAnnouncement(
          `All ${squadRules.positionRules[player.position].squad} ${player.position} slots are filled.`,
        );
        return current;
      }
      const clubCount = current.picks.filter(
        (pick) => playerByKey.get(pick.registrationKey)?.team === player.team,
      ).length;
      if (clubCount >= squadRules.clubLimit) {
        setAnnouncement(`${player.team} already has ${squadRules.clubLimit} players in the squad.`);
        return current;
      }
      const starterCount = current.picks.filter((pick) => pick.role === "starter").length;
      const hasStartingKeeper = current.picks.some(
        (pick) =>
          pick.role === "starter" && playerByKey.get(pick.registrationKey)?.position === "GKP",
      );
      const role =
        starterCount < squadRules.startingSize && (player.position !== "GKP" || !hasStartingKeeper)
          ? ("starter" as const)
          : ("bench" as const);
      const benchOrder =
        role === "bench"
          ? current.picks.filter((pick) => pick.role === "bench").length + 1
          : undefined;
      setAnnouncement(
        `${player.name} added to the ${role === "starter" ? "starting XI" : "bench"}.`,
      );
      return {
        ...current,
        picks: [
          ...current.picks,
          {
            registrationKey: player.registrationKey,
            role,
            captain: false,
            ...(benchOrder === undefined ? {} : { benchOrder }),
          },
        ],
      };
    });
    setReplacing(undefined);
  }

  function removePlayer(key: string) {
    const player = playerByKey.get(key);
    setSquad((current) => ({
      ...current,
      picks: normalizeBench(current.picks.filter((pick) => pick.registrationKey !== key)),
    }));
    setReplacing(undefined);
    setAnnouncement(`${player?.name ?? "Player"} removed.`);
  }

  function toggleRole(key: string) {
    setSquad((current) => {
      const target = current.picks.find((pick) => pick.registrationKey === key);
      if (!target) return current;
      if (
        target.role === "bench" &&
        current.picks.filter((pick) => pick.role === "starter").length >= squadRules.startingSize
      ) {
        setAnnouncement("Move a starter to the bench before promoting another player.");
        return current;
      }
      const nextRole: SquadPick["role"] = target.role === "starter" ? "bench" : "starter";
      const next = current.picks.map((pick) =>
        pick.registrationKey === key
          ? {
              ...pick,
              role: nextRole,
              captain: nextRole === "starter" ? pick.captain : false,
            }
          : pick,
      );
      setAnnouncement(
        `${playerByKey.get(key)?.name ?? "Player"} moved to the ${nextRole === "starter" ? "starting XI" : "bench"}.`,
      );
      return { ...current, picks: normalizeBench(next) };
    });
  }

  function captain(key: string) {
    setSquad((current) => ({
      ...current,
      picks: current.picks.map((pick) => ({
        ...pick,
        captain: pick.registrationKey === key,
      })),
    }));
    setAnnouncement(`${playerByKey.get(key)?.name ?? "Player"} is captain.`);
  }

  function suggestSquad() {
    const suggested = buildSuggestedSquad(map.players, map.season.key, horizon, squadRules);
    setSquad(suggested);
    setReplacing(undefined);
    setAnnouncement(
      suggested.picks.length === squadRules.squadSize
        ? "A valid market-informed draft has been created."
        : "A complete draft could not be created from the available official prices.",
    );
  }

  const captaincy = selected
    .filter(({ pick }) => pick.role === "starter")
    .toSorted((left, right) => captainScore(right.player) - captainScore(left.player))
    .slice(0, 4);
  const ownershipRadar = map.players
    .filter((player) => ownership(player) !== undefined)
    .toSorted((left, right) => ownership(right)! - ownership(left)!)
    .slice(0, 5);
  const freshSources = map.sourceHealth.filter((source) => source.status === "fresh").length;
  const preDeadline = map.season.lifecycle !== "active" && map.fromGameweek === 1;
  const pressureStatus = map.players.some((player) => player.fpl?.pricePressureStatus === "active")
    ? "active"
    : map.players.some((player) => player.fpl?.pricePressureStatus === "calibrating")
      ? "calibrating"
      : map.players.every((player) => player.fpl?.pricePressureStatus === "locked")
        ? "locked"
        : "unavailable";
  const priceRadarLabel =
    pressureStatus === "locked"
      ? "Prices locked until GW1"
      : pressureStatus === "active"
        ? "Official predictor active"
        : "Predictor calibration pending";
  const lifecycleLabel =
    map.season.lifecycle === "active"
      ? "Active season"
      : map.season.lifecycle === "prelaunch"
        ? "Pre-season"
        : map.season.lifecycle;

  return (
    <div className="squad-lab">
      <div className="squad-lab-shell">
        <header className="squad-lab-hero">
          <div>
            <p className="squad-lab-kicker">
              {map.season.label} / {lifecycleLabel} / Official prices
            </p>
            <h1 aria-label={preDeadline ? "Build the edge." : "Plan the move."}>
              {preDeadline ? "Build the" : "Plan the"}
              <br />
              {preDeadline ? "edge." : "move."}
            </h1>
            <p>
              {preDeadline
                ? "Construct a valid GW1 squad at today’s exact prices. The model keeps performance uncertainty visible while the budget stays non-negotiable."
                : "Improve your squad at today’s prices. Replacement paths preserve position, club and affordability constraints while expected gains stay probabilistic."}
            </p>
          </div>
          <div className="launch-readout">
            <span>
              <IconLock size={14} />{" "}
              {pressureStatus === "locked" ? "Prices locked to GW1" : "Live prices & ownership"}
            </span>
            <strong>{map.players.length}</strong>
            <small>live players</small>
            <time dateTime={map.observedAt}>
              Captured{" "}
              {new Date(map.observedAt).toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
            <small className="source-freshness">
              {freshSources}/{map.sourceHealth.length} sources fresh · {map.season.rulesetStatus}{" "}
              rules
            </small>
          </div>
        </header>

        <section className="budget-rail" aria-label="Squad budget">
          <div>
            <span>Budget allocation</span>
            <strong data-negative={validation.bank < 0 || undefined}>
              £{validation.bank.toFixed(1)}m bank
            </strong>
          </div>
          <div className="budget-track">
            <motion.i
              initial={false}
              animate={{ width: `${Math.min(100, (validation.spent / squad.budget) * 100)}%` }}
              transition={
                reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 210, damping: 28 }
              }
              data-over={validation.bank < 0 || undefined}
            />
            {validation.spent > 0 ? (
              <span style={{ left: `${Math.min(100, (validation.spent / squad.budget) * 100)}%` }}>
                £{validation.spent.toFixed(1)}m
              </span>
            ) : null}
          </div>
          <div className="budget-steps" aria-hidden="true">
            {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
              <span key={fraction}>£{squadRules.budget * fraction}m</span>
            ))}
          </div>
        </section>

        <div className="squad-toolbar">
          <div className="horizon-control" role="group" aria-label="Forecast horizon">
            {([1, 3, 5] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={horizon === value}
                onClick={() => onHorizonChange(value)}
              >
                {value} GW
              </button>
            ))}
          </div>
          <p>
            {horizon === 1
              ? "Captaincy lens: the opening fixture carries the decision."
              : horizon === 3
                ? "Transfer lens: balance immediate output with the first fixture run."
                : "Squad lens: favour durable roles and multiweek flexibility."}
          </p>
          <button className="suggest-squad" type="button" onClick={suggestSquad}>
            <IconWand size={16} /> Suggest a valid squad
          </button>
        </div>

        <div className="squad-workbench">
          <section className="pitch-panel" aria-labelledby="pitch-heading">
            <header>
              <div>
                <span id="pitch-heading">My squad</span>
                <strong>
                  {squad.picks.length} / {squadRules.squadSize} selected
                </strong>
              </div>
              <span data-valid={validation.valid || undefined}>
                {validation.valid ? "Ready for GW1" : `${validation.errors.length} checks remain`}
              </span>
            </header>
            <div className="squad-pitch">
              <div className="pitch-centre-circle" aria-hidden="true" />
              {starters.map(({ position, players }) => (
                <section className="pitch-row" key={position} aria-label={`Starting ${position}`}>
                  <span>{position}</span>
                  <div>
                    <AnimatePresence mode="popLayout">
                      {players.map(({ pick, player }) => (
                        <SquadPlayerCard
                          key={player.registrationKey}
                          player={player}
                          pick={pick}
                          replacing={replacing === player.registrationKey}
                          onReplace={() => {
                            setReplacing(
                              replacing === player.registrationKey
                                ? undefined
                                : player.registrationKey,
                            );
                            setPoolPosition(player.position);
                          }}
                          onRemove={() => removePlayer(player.registrationKey)}
                          onToggleRole={() => toggleRole(player.registrationKey)}
                          onCaptain={() => captain(player.registrationKey)}
                        />
                      ))}
                    </AnimatePresence>
                    {players.length === 0 ? (
                      <button
                        type="button"
                        className="empty-position"
                        onClick={() => setPoolPosition(position)}
                      >
                        Choose {position} <IconChevronRight size={14} />
                      </button>
                    ) : null}
                  </div>
                </section>
              ))}
            </div>
            <section className="bench-strip" aria-label="Bench">
              <header>
                <span>Bench</span>
                <small>Order 1–4</small>
              </header>
              <div>
                <AnimatePresence mode="popLayout">
                  {bench.map(({ pick, player }) => (
                    <SquadPlayerCard
                      key={player.registrationKey}
                      player={player}
                      pick={pick}
                      replacing={replacing === player.registrationKey}
                      onReplace={() => {
                        setReplacing(
                          replacing === player.registrationKey ? undefined : player.registrationKey,
                        );
                        setPoolPosition(player.position);
                      }}
                      onRemove={() => removePlayer(player.registrationKey)}
                      onToggleRole={() => toggleRole(player.registrationKey)}
                      onCaptain={() => captain(player.registrationKey)}
                    />
                  ))}
                </AnimatePresence>
                {bench.length === 0 ? <p>Bench players will appear here.</p> : null}
              </div>
            </section>
          </section>

          <aside className="player-pool" aria-label="Player selection">
            <header>
              <div>
                <span>{replacingPlayer ? "Choose replacement" : "Player pool"}</span>
                <strong>
                  {replacingPlayer
                    ? `${replacingPlayer.name} · £${playerPrice(replacingPlayer)?.toFixed(1)}m`
                    : `${pool.length} ${poolPosition}`}
                </strong>
              </div>
              {replacingPlayer ? (
                <button
                  type="button"
                  onClick={() => setReplacing(undefined)}
                  aria-label="Cancel replacement"
                >
                  <IconX size={16} />
                </button>
              ) : null}
            </header>
            <div className="pool-position-tabs" role="group" aria-label="Player position">
              {positions.map((position) => (
                <button
                  key={position}
                  type="button"
                  aria-pressed={poolPosition === position}
                  disabled={Boolean(replacingPlayer && position !== replacingPlayer.position)}
                  onClick={() => setPoolPosition(position)}
                >
                  {position}
                </button>
              ))}
            </div>
            <label className="pool-search">
              <IconSearch size={15} />
              <span className="sr-only">Find a player</span>
              <input
                name="player-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find a player…"
                autoComplete="off"
              />
            </label>
            <PriceFrontier
              players={map.players}
              selectedKeys={selectedKeys}
              position={poolPosition}
            />
            <div className="pool-list">
              {pool.slice(0, 80).map((player) => {
                const issue = replacementIssue(player);
                const priceDelta =
                  replacingPlayer &&
                  playerPrice(player) !== undefined &&
                  playerPrice(replacingPlayer) !== undefined
                    ? playerPrice(player)! - playerPrice(replacingPlayer)!
                    : undefined;
                const pointsDelta = replacingPlayer
                  ? player.expectedPoints - replacingPlayer.expectedPoints
                  : undefined;
                return (
                  <button
                    key={player.registrationKey}
                    type="button"
                    onClick={() => choosePlayer(player)}
                    disabled={Boolean(issue)}
                    title={issue}
                  >
                    <i style={{ background: positionColour[player.position] }} />
                    <span>
                      <b>{player.name}</b>
                      <small>
                        {player.team} · {fixtureLabel(player)}
                      </small>
                    </span>
                    <span>
                      <b>{player.expectedPoints.toFixed(1)} xP</b>
                      <small>
                        {priceDelta === undefined || pointsDelta === undefined
                          ? `£${playerPrice(player)?.toFixed(1) ?? "—"}m · ${ownership(player)?.toFixed(1) ?? "—"}% · ${Math.round(player.sixtyMinuteProbability * 100)}% 60+`
                          : `${priceDelta >= 0 ? "+" : "−"}£${Math.abs(priceDelta).toFixed(1)}m · ${pointsDelta >= 0 ? "+" : "−"}${Math.abs(pointsDelta).toFixed(1)} xP`}
                      </small>
                    </span>
                    {replacingPlayer ? (
                      <IconArrowsExchange size={15} />
                    ) : (
                      <IconChevronRight size={15} />
                    )}
                  </button>
                );
              })}
            </div>
          </aside>
        </div>

        <section className="squad-validation" aria-label="Squad checks">
          <div>
            <IconUsers size={17} />
            <span>
              <b>{validation.valid ? "Squad valid" : "Squad checks"}</b>
              <small>
                {validation.valid
                  ? "Budget, formation, club limits and captaincy all pass."
                  : validation.errors[0]}
              </small>
            </span>
          </div>
          <div className="position-counts">
            {positions.map((position) => (
              <span key={position}>
                {position}{" "}
                <b>
                  {validation.positionCounts[position]}/{squadRules.positionRules[position].squad}
                </b>
              </span>
            ))}
          </div>
        </section>

        <div className="decision-grid">
          <section className="decision-panel captaincy-lab">
            <header>
              <span>Captaincy lab</span>
              <small>GW{map.fromGameweek} projection</small>
            </header>
            {captaincy.length ? (
              captaincy.map(({ pick, player }, index) => (
                <button
                  key={player.registrationKey}
                  type="button"
                  onClick={() => captain(player.registrationKey)}
                >
                  <span>{index + 1}</span>
                  <b>{player.name}</b>
                  <small>{fixtureLabel(player)}</small>
                  <strong>{captainScore(player).toFixed(1)} xP</strong>
                  {pick.captain ? <IconCrown size={14} /> : null}
                </button>
              ))
            ) : (
              <p>Select a starting XI to compare captaincy options.</p>
            )}
          </section>

          <section className="decision-panel ownership-radar">
            <header>
              <span>Price &amp; ownership radar</span>
              <small>{priceRadarLabel}</small>
            </header>
            {ownershipRadar.map((player) => (
              <div key={player.registrationKey}>
                <span>
                  <b>{player.name}</b>
                  <small>{player.team}</small>
                </span>
                <i>
                  <b style={{ width: `${ownership(player)}%` }} />
                </i>
                <strong>{ownership(player)?.toFixed(1)}%</strong>
                <small>£{playerPrice(player)?.toFixed(1)}m</small>
              </div>
            ))}
            <footer>
              <IconLock size={13} />
              {pressureStatus === "locked"
                ? "Transfer pressure activates only after the GW1 deadline and API verification."
                : pressureStatus === "active"
                  ? "Pressure is directional evidence, not a guaranteed price change."
                  : "Price-pressure semantics remain hidden until the post-GW1 API is verified."}
            </footer>
          </section>

          <section className="decision-panel fixture-run">
            <header>
              <span>Fixture run</span>
              <small>{horizon} gameweek horizon</small>
            </header>
            {selected.slice(0, 6).map(({ player }) => (
              <div key={player.registrationKey}>
                <b>{player.name}</b>
                {player.gameweeks.slice(0, horizon).map((gameweek) => (
                  <span key={gameweek.gameweek} title={`GW${gameweek.gameweek}`}>
                    {fixtureLabel(player, gameweek.gameweek - map.fromGameweek)}
                    <small>{gameweek.expectedPoints.toFixed(1)}</small>
                  </span>
                ))}
              </div>
            ))}
            {selected.length === 0 ? <p>Your squad’s opponents will appear here.</p> : null}
          </section>
        </div>

        <footer className="squad-method">
          <IconChartDots3 size={17} />
          <p>
            <strong>Known versus uncertain.</strong> Official FPL prices and squad constraints are
            exact. Minutes, roles and returns remain probabilistic, built from season-labelled
            history, fixture markets and current availability.
          </p>
          <span>market-xp / {map.players[0]?.provenance.modelVersion ?? "—"}</span>
        </footer>

        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
      </div>
    </div>
  );
}
