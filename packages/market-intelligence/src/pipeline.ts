import {
  captureBatchSchema,
  type CaptureBatch,
  type DeadlineRoom,
  type DeadlineRoomQuery,
  type IngestReceipt,
  type Observation,
  type SourceEntityAlias,
} from "./contracts.ts";
import { resolvePremierLeagueTeam } from "./entity-resolution.ts";
import { createMarketIntelligence, type MarketSourceAdapter } from "./market-intelligence.ts";
import {
  createBaselineForecastBatch,
  devigDecimalOdds,
  type BaselineForecastInput,
} from "./model/index.ts";
import type { FplCaptureRequest, OddsApiCaptureRequest } from "./sources/index.ts";
import type { MarketIntelligenceStore } from "./store.ts";

type MarketQuote = {
  sourceKey: string;
  label: string;
  marketFamily: "goal" | "assist" | "clean-sheet" | "team-win";
  decimalOdds: number;
  adjustedProbability?: number;
};

type PlayerEvidence = {
  playerKey: string;
  playerName: string;
  teamKey: string;
  position: "GKP" | "DEF" | "MID" | "FWD";
  metrics: Map<string, number>;
};

function metadataString(observation: Observation, key: string): string | undefined {
  const value = observation.metadata?.[key];
  return typeof value === "string" ? value : undefined;
}

function normalizedName(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]/g, "");
}

function marketFamily(value: string | undefined): MarketQuote["marketFamily"] | undefined {
  const normalized = value?.toLocaleLowerCase().replaceAll("-", "_");
  if (!normalized) return undefined;
  if (normalized.includes("goal_scorer") || normalized.includes("goalscorer")) return "goal";
  if (normalized.includes("assist")) return "assist";
  if (normalized.includes("clean_sheet")) return "clean-sheet";
  return undefined;
}

function playerEvidence(batch: CaptureBatch): PlayerEvidence[] {
  const players = new Map<string, PlayerEvidence>();
  for (const observation of batch.observations) {
    const playerName = metadataString(observation, "playerName");
    const teamKey = metadataString(observation, "teamKey");
    const position = metadataString(observation, "position");
    if (!playerName || !teamKey || !position || !["GKP", "DEF", "MID", "FWD"].includes(position)) {
      continue;
    }
    const player = players.get(observation.entityKey) ?? {
      playerKey: observation.entityKey,
      playerName,
      teamKey,
      position: position as PlayerEvidence["position"],
      metrics: new Map<string, number>(),
    };
    if (observation.numericValue !== undefined) {
      player.metrics.set(observation.metric, observation.numericValue);
    }
    players.set(observation.entityKey, player);
  }
  return [...players.values()];
}

function uniquePlayerForLabel(
  players: PlayerEvidence[],
  label: string,
): PlayerEvidence | undefined {
  const candidate = normalizedName(label);
  if (!candidate) return undefined;
  const matches = players.filter((player) => {
    const playerName = normalizedName(player.playerName);
    return (
      candidate === playerName || candidate.endsWith(playerName) || playerName.endsWith(candidate)
    );
  });
  return matches.length === 1 ? matches[0] : undefined;
}

function bookmakerDetails(observation: Observation): { key: string; label: string } {
  return {
    key: metadataString(observation, "bookmakerKey") ?? "odds-api",
    label: metadataString(observation, "bookmakerName") ?? "The Odds API",
  };
}

function pairedProbability(
  observation: Observation,
  observations: Observation[],
): number | undefined {
  const description = metadataString(observation, "description");
  if (!description || !observation.outcome || observation.numericValue === undefined)
    return undefined;
  const opposite = observation.outcome.toLocaleLowerCase() === "yes" ? "no" : "yes";
  const bookmaker = metadataString(observation, "bookmakerKey");
  const complement = observations.find(
    (candidate) =>
      candidate !== observation &&
      candidate.marketFamily === observation.marketFamily &&
      metadataString(candidate, "description") === description &&
      metadataString(candidate, "bookmakerKey") === bookmaker &&
      candidate.outcome?.toLocaleLowerCase() === opposite &&
      candidate.numericValue !== undefined,
  );
  if (!complement?.numericValue) return undefined;
  const prices =
    observation.outcome.toLocaleLowerCase() === "yes"
      ? [observation.numericValue, complement.numericValue]
      : [complement.numericValue, observation.numericValue];
  return devigDecimalOdds(prices)[0];
}

function playerPropQuotes(
  players: PlayerEvidence[],
  oddsBatch: CaptureBatch,
): { byPlayer: Map<string, MarketQuote[]>; aliases: SourceEntityAlias[] } {
  const byPlayer = new Map<string, MarketQuote[]>();
  const aliases = new Map<string, SourceEntityAlias>();
  for (const observation of oddsBatch.observations) {
    const family = marketFamily(observation.marketFamily);
    if (!family || observation.numericValue === undefined || observation.numericValue <= 1)
      continue;
    const description = metadataString(observation, "description");
    const label = description ?? observation.outcome;
    if (!label) continue;
    if (description && observation.outcome?.toLocaleLowerCase() === "no") continue;
    const player = uniquePlayerForLabel(players, label);
    if (!player) continue;
    const bookmaker = bookmakerDetails(observation);
    const quote: MarketQuote = {
      sourceKey: bookmaker.key,
      label: bookmaker.label,
      marketFamily: family,
      decimalOdds: observation.numericValue,
      ...(pairedProbability(observation, oddsBatch.observations) === undefined
        ? {}
        : { adjustedProbability: pairedProbability(observation, oddsBatch.observations) }),
    };
    byPlayer.set(player.playerKey, [...(byPlayer.get(player.playerKey) ?? []), quote]);
    aliases.set(`${family}:${label}`, {
      sourceKey: oddsBatch.source.key,
      sourceEntityKey: `player-name:${label}`,
      entityKey: player.playerKey,
      matchMethod: "deterministic-alias",
      confidence: 1,
      effectiveFrom: oddsBatch.capturedAt,
      metadata: { marketFamily: family },
    });
  }
  return { byPlayer, aliases: [...aliases.values()] };
}

function teamWinQuotes(oddsBatch: CaptureBatch): Map<string, MarketQuote[]> {
  const byTeam = new Map<string, MarketQuote[]>();
  const h2h = oddsBatch.observations.filter(
    (observation) =>
      observation.marketFamily === "h2h" &&
      observation.numericValue !== undefined &&
      observation.numericValue > 1,
  );
  const groups = new Map<string, Observation[]>();
  for (const observation of h2h) {
    const bookmaker = metadataString(observation, "bookmakerKey") ?? "odds-api";
    const groupKey = `${observation.fixtureKey ?? "unknown"}:${bookmaker}`;
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), observation]);
  }
  for (const observations of groups.values()) {
    if (observations.length < 2) continue;
    const probabilities = devigDecimalOdds(observations.map((item) => item.numericValue ?? 0));
    observations.forEach((observation, index) => {
      if (!observation.outcome || observation.numericValue === undefined) return;
      let teamKey: string;
      try {
        teamKey = resolvePremierLeagueTeam(observation.outcome);
      } catch {
        return;
      }
      const bookmaker = bookmakerDetails(observation);
      byTeam.set(teamKey, [
        ...(byTeam.get(teamKey) ?? []),
        {
          sourceKey: bookmaker.key,
          label: bookmaker.label,
          marketFamily: "team-win",
          decimalOdds: observation.numericValue,
          adjustedProbability: probabilities[index],
        },
      ]);
    });
  }
  return byTeam;
}

function averageProbability(quotes: MarketQuote[]): number | undefined {
  if (quotes.length === 0) return undefined;
  return (
    quotes.reduce(
      (total, quote) => total + (quote.adjustedProbability ?? 1 / quote.decimalOdds),
      0,
    ) / quotes.length
  );
}

export function createLiveBaselineForecastBatch(input: {
  fplBatch: CaptureBatch;
  oddsBatch: CaptureBatch;
}): CaptureBatch {
  const fplBatch = captureBatchSchema.parse(input.fplBatch);
  const oddsBatch = captureBatchSchema.parse(input.oddsBatch);
  const players = playerEvidence(fplBatch);
  if (players.length === 0) throw new Error("The FPL capture contains no model-ready players");
  const props = playerPropQuotes(players, oddsBatch);
  const wins = teamWinQuotes(oddsBatch);
  const scopeFixture = fplBatch.fixtures[0] ?? oddsBatch.fixtures[0];
  const deadlineAt = scopeFixture?.deadlineAt;
  if (!deadlineAt) throw new Error("A captured fixture is required to determine the FPL deadline");
  const gameweek = scopeFixture.gameweek;
  const completedGameweeks = Math.max(0, gameweek - 1);
  const fixtures = new Map(
    [...fplBatch.fixtures, ...oddsBatch.fixtures].map((fixture) => [fixture.key, fixture]),
  );

  const modelInput: BaselineForecastInput = {
    competition: scopeFixture.competition,
    season: scopeFixture.season,
    gameweek,
    observedAt: oddsBatch.capturedAt,
    deadlineAt,
    fixtures: [...fixtures.values()],
    players: players.map((player) => {
      const playerQuotes = [
        ...(props.byPlayer.get(player.playerKey) ?? []),
        ...(wins.get(player.teamKey) ?? []),
      ];
      const minutes = player.metrics.get("minutes") ?? 0;
      const starts = player.metrics.get("starts") ?? 0;
      const playProbability = player.metrics.get("availability_probability") ?? 1;
      const startRate = completedGameweeks === 0 ? 0.78 : Math.min(1, starts / completedGameweeks);
      const sixtyMinuteProbability = playProbability * (0.35 + startRate * 0.6);
      const rate = (metric: string) => {
        const expected = player.metrics.get(metric) ?? 0;
        return minutes > 0 ? (expected * 90) / minutes : expected;
      };
      const teamQuotes = playerQuotes.filter((quote) => quote.marketFamily === "team-win");
      return {
        playerKey: player.playerKey,
        playerName: player.playerName,
        teamKey: player.teamKey,
        position: player.position,
        playProbability,
        sixtyMinuteProbability: Math.min(playProbability, sixtyMinuteProbability),
        ownershipPercent: player.metrics.get("ownership"),
        price: player.metrics.get("price"),
        market: {
          teamWinProbability: averageProbability(teamQuotes),
          sourceKeys: [...new Set(["fpl", ...playerQuotes.map((quote) => quote.sourceKey)])],
          quotes: playerQuotes,
        },
        history: {
          goalsPer90: rate("expected_goals"),
          assistsPer90: rate("expected_assists"),
        },
      };
    }),
  };
  const modelBatch = createBaselineForecastBatch(modelInput);
  return captureBatchSchema.parse({
    ...modelBatch,
    entities: fplBatch.entities,
    entityAliases: [
      ...(fplBatch.entityAliases ?? []),
      ...(oddsBatch.entityAliases ?? []),
      ...props.aliases,
    ],
    metadata: {
      ...modelBatch.metadata,
      inputBatchIds: [fplBatch.id, oddsBatch.id],
      pipeline: "live-fpl-odds-baseline-v1",
    },
  });
}

export type DeadlineCaptureRun = {
  receipts: { fpl: IngestReceipt; odds: IngestReceipt; model: IngestReceipt };
  room: DeadlineRoom;
};

export async function captureDeadlineIntelligence(input: {
  store: MarketIntelligenceStore;
  fplSource: MarketSourceAdapter<FplCaptureRequest>;
  oddsSource: MarketSourceAdapter<OddsApiCaptureRequest>;
  query: DeadlineRoomQuery;
  capturedAt?: string;
  regions?: string[];
  markets?: string[];
}): Promise<DeadlineCaptureRun> {
  const intelligence = createMarketIntelligence({ store: input.store });
  const fplBatch = await input.fplSource.capture({
    season: input.query.season,
    gameweek: input.query.gameweek,
    capturedAt: input.capturedAt,
  });
  const deadlineAt = fplBatch.fixtures[0]?.deadlineAt;
  if (!deadlineAt) throw new Error("FPL capture returned no fixture deadline for this gameweek");
  const oddsBatch = await input.oddsSource.capture({
    season: input.query.season,
    gameweek: input.query.gameweek,
    deadlineAt,
    capturedAt: fplBatch.capturedAt,
    regions: input.regions,
    markets: input.markets,
  });
  const modelBatch = createLiveBaselineForecastBatch({ fplBatch, oddsBatch });
  const fpl = await intelligence.ingest(fplBatch);
  const odds = await intelligence.ingest(oddsBatch);
  const model = await intelligence.ingest(modelBatch);
  return {
    receipts: { fpl, odds, model },
    room: await intelligence.getDeadlineRoom(input.query),
  };
}
