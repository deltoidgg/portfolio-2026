import type {
  ForecastFixtureInput,
  ForecastHorizonsRequest,
  ForecastPlayerInput,
  FplPosition,
} from "../model/v2.ts";
import type { SourceHealth } from "../opportunity-map.ts";
import { canonicalJson, sha256Hex } from "./artifact-store.ts";
import type { ForecastInputState, SourceHead } from "./hot-state.ts";

const priors: Record<
  FplPosition,
  { goalsPer90: number; assistsPer90: number; sixtyProbability: number }
> = {
  GKP: { goalsPer90: 0, assistsPer90: 0.01, sixtyProbability: 0.92 },
  DEF: { goalsPer90: 0.08, assistsPer90: 0.1, sixtyProbability: 0.8 },
  MID: { goalsPer90: 0.24, assistsPer90: 0.18, sixtyProbability: 0.78 },
  FWD: { goalsPer90: 0.38, assistsPer90: 0.16, sixtyProbability: 0.76 },
};

function clamp(value: number, low = 0, high = 1): number {
  return Math.min(high, Math.max(low, value));
}

function mean(values: number[]): number | undefined {
  return values.length === 0
    ? undefined
    : values.reduce((total, value) => total + value, 0) / values.length;
}

function sourceLabel(sourceKey: string): string {
  return (
    {
      "premier-league-schedule": "Premier League schedule",
      fpl: "Fantasy Premier League",
      "fpl-element-summary": "FPL player history",
      "odds-api": "Bookmaker consensus",
    }[sourceKey] ?? sourceKey
  );
}

function sourceHealth(head: SourceHead, cutoffAt: string): SourceHealth {
  const coverageValue = head.healthMetadata.coverage;
  const coverage =
    typeof coverageValue === "number" ? clamp(coverageValue) : head.stateRowCount > 0 ? 1 : 0;
  const capturedAt = head.lastSuccessfulCapturedAt;
  const ageMinutes = capturedAt
    ? Math.max(0, Date.parse(cutoffAt) - Date.parse(capturedAt)) / 60_000
    : Number.POSITIVE_INFINITY;
  const freshMinutes =
    head.sourceKey === "premier-league-schedule"
      ? 2_160
      : head.sourceKey === "fpl-element-summary"
        ? 525_600
        : 90;
  const status =
    head.lastAttemptStatus === "failed"
      ? ("failed" as const)
      : !capturedAt
        ? ("missing" as const)
        : ageMinutes > freshMinutes
          ? ("stale" as const)
          : coverage < 0.85
            ? ("partial" as const)
            : ("fresh" as const);
  return {
    sourceKey: head.sourceKey,
    label: sourceLabel(head.sourceKey),
    status,
    ...(capturedAt ? { lastCapturedAt: capturedAt } : {}),
    coverage,
    detail:
      typeof head.healthMetadata.detail === "string"
        ? head.healthMetadata.detail
        : `${head.stateRowCount} compact state rows`,
  };
}

function currentRate(
  total: number | undefined,
  per90: number | undefined,
  minutes: number,
  fallback: number,
): number {
  if (per90 !== undefined) return per90;
  if (total !== undefined && minutes > 0) return (total * 90) / minutes;
  return fallback;
}

function semanticHeads(state: ForecastInputState) {
  const modelSources = new Set([
    "premier-league-schedule",
    "fpl",
    "fpl-element-summary",
    "odds-api",
  ]);
  return state.sourceHeads
    .filter((head) => head.modelInputHash && modelSources.has(head.sourceKey))
    .map((head) => ({ sourceKey: head.sourceKey, modelInputHash: head.modelInputHash! }))
    .toSorted((left, right) => left.sourceKey.localeCompare(right.sourceKey));
}

export type CompactForecastPreparation =
  | { status: "skipped"; reason: string }
  | {
      status: "ready";
      runId: string;
      modelInputHash: string;
      request: ForecastHorizonsRequest;
      inputHeads: Array<{
        sourceKey: string;
        materialHash: string;
        rawObjectKeys: string[];
        capturedAt: string;
      }>;
    };

export async function prepareCompactForecast(
  state: ForecastInputState,
  input: { cutoffAt: string; codeVersion: string },
): Promise<CompactForecastPreparation> {
  if (!state.season) return { status: "skipped", reason: "Season state is missing" };
  const registrations = state.registrations ?? [];
  if (registrations.length === 0) {
    return { status: "skipped", reason: "Player registrations are missing" };
  }
  const futureFixtures = (state.fixtures ?? [])
    .filter((fixture) => fixture.deadlineAt > input.cutoffAt)
    .toSorted(
      (left, right) =>
        left.deadlineAt.localeCompare(right.deadlineAt) || left.key.localeCompare(right.key),
    );
  const fromGameweek = futureFixtures[0]?.gameweek;
  if (!fromGameweek) return { status: "skipped", reason: "No future gameweek is available" };
  const horizonFixtures = futureFixtures.filter(
    (fixture) => fixture.gameweek >= fromGameweek && fixture.gameweek < fromGameweek + 5,
  );
  const marketByFixture = new Map(
    state.fixtureMarkets.map((market) => [market.fixtureKey, market]),
  );
  const fixtures: ForecastFixtureInput[] = horizonFixtures.map((fixture) => {
    const market = marketByFixture.get(fixture.key);
    return {
      key: fixture.key,
      gameweek: fixture.gameweek,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      homeGoalRate: market?.homeGoalRate ?? 1.458,
      awayGoalRate: market?.awayGoalRate ?? 1.192,
      kickoffAt: fixture.kickoffAt,
      marketCoverage: market?.marketCoverage ?? 0,
      ...(fixture.homeDifficulty === undefined ? {} : { homeDifficulty: fixture.homeDifficulty }),
      ...(fixture.awayDifficulty === undefined ? {} : { awayDifficulty: fixture.awayDifficulty }),
    };
  });
  const stateByRegistration = new Map(
    state.playerStates.map((player) => [player.registrationKey, player]),
  );
  const priorByRegistration = new Map(
    state.playerPriors.map((player) => [player.registrationKey, player]),
  );
  const ownershipRank = new Map<string, number>();
  for (const position of ["GKP", "DEF", "MID", "FWD"] as const) {
    registrations
      .filter((registration) => registration.position === position)
      .flatMap((registration) => {
        const ownership = stateByRegistration.get(registration.registrationKey)?.ownership;
        return ownership === undefined ? [] : [{ key: registration.registrationKey, ownership }];
      })
      .toSorted((left, right) => right.ownership - left.ownership)
      .forEach((entry, index) => ownershipRank.set(entry.key, index + 1));
  }
  const completedGameweeks = Math.max(0, fromGameweek - 1);
  const players: ForecastPlayerInput[] = registrations
    .filter((registration) => registration.status !== "departed")
    .toSorted((left, right) => left.registrationKey.localeCompare(right.registrationKey))
    .map((registration) => {
      const current = stateByRegistration.get(registration.registrationKey);
      const historical = priorByRegistration.get(registration.registrationKey);
      const positionPrior = priors[registration.position];
      const minutes = completedGameweeks > 0 ? (current?.minutes ?? 0) : 0;
      const historyWeight = clamp((historical?.weightedMinutes ?? 0) / 900, 0, 0.8);
      const sampleWeight = completedGameweeks > 0 ? clamp(minutes / 450) : historyWeight;
      const fallbackGoals = historical?.goalsPer90 ?? positionPrior.goalsPer90;
      const fallbackAssists = historical?.assistsPer90 ?? positionPrior.assistsPer90;
      const observedGoals = currentRate(
        current?.expectedGoals,
        current?.expectedGoalsPer90,
        minutes,
        fallbackGoals,
      );
      const observedAssists = currentRate(
        current?.expectedAssists,
        current?.expectedAssistsPer90,
        minutes,
        fallbackAssists,
      );
      const availability = clamp(current?.availabilityProbability ?? 1);
      const starts = completedGameweeks > 0 ? (current?.starts ?? 0) : 0;
      const substituteAppearances = Math.max(0, minutes - starts * 75) / 25;
      const observedPlayProbability =
        completedGameweeks > 0
          ? clamp((starts + substituteAppearances) / completedGameweeks, 0.05, 0.99)
          : undefined;
      const preseasonRoleProbability =
        current?.expectedPointsNext !== undefined
          ? clamp(current.expectedPointsNext / 4.5, 0.08, 0.99)
          : current?.ownership !== undefined
            ? clamp(0.35 + Math.log1p(current.ownership) / 5, 0.35, 0.95)
            : 0.65;
      const playProbability = availability * (observedPlayProbability ?? preseasonRoleProbability);
      const sixtyMinuteProbability =
        starts > 0 && minutes > 0
          ? clamp(minutes / starts / 75, 0.55, 0.98)
          : positionPrior.sixtyProbability;
      const teamMarket = horizonFixtures.flatMap((fixture) =>
        fixture.homeTeam === registration.team || fixture.awayTeam === registration.team
          ? [marketByFixture.get(fixture.key)]
          : [],
      );
      const agreement = mean(
        teamMarket.flatMap((market) => (market ? [market.sourceAgreement] : [])),
      );
      const rank = ownershipRank.get(registration.registrationKey);
      return {
        registrationKey: registration.registrationKey,
        playerKey: registration.playerKey,
        name: registration.name,
        team: registration.team,
        position: registration.position,
        registrationStatus: registration.status,
        price:
          current?.price === undefined
            ? { status: "unpublished" as const }
            : {
                status: "official" as const,
                value: current.price,
                observedAt: current.observedAt,
              },
        ownership:
          current?.ownership === undefined
            ? { status: "unavailable" as const }
            : state.season!.priceState === "official" && rank
              ? {
                  status: "official" as const,
                  value: clamp(current.ownership, 0, 100),
                  rankWithinPosition: rank,
                  observedAt: current.observedAt,
                }
              : {
                  status: "provisional" as const,
                  value: clamp(current.ownership, 0, 100),
                },
        playProbability,
        sixtyMinuteProbability,
        goalsPer90: fallbackGoals * (1 - sampleWeight) + observedGoals * sampleWeight,
        assistsPer90: fallbackAssists * (1 - sampleWeight) + observedAssists * sampleWeight,
        sourceAgreement: agreement ?? 0.4,
        fpl: {
          pricePressureStatus: fromGameweek <= 1 ? ("locked" as const) : ("unavailable" as const),
          ...(current?.chanceOfPlayingThisRound === undefined
            ? {}
            : { chanceOfPlayingThisRound: current.chanceOfPlayingThisRound }),
          ...(current?.news ? { news: current.news } : {}),
          ...(current?.newsAddedAt ? { newsAddedAt: current.newsAddedAt } : {}),
        },
        ...(current?.savesPer90 === undefined ? {} : { savesPer90: current.savesPer90 }),
        ...(current?.defensiveContributionsPer90 === undefined
          ? {}
          : { defensiveContributionsPer90: current.defensiveContributionsPer90 }),
        ...(current?.cardsPer90 === undefined ? {} : { cardsPer90: current.cardsPer90 }),
      };
    });

  const modelInputHash = await sha256Hex(canonicalJson(semanticHeads(state)));
  const runSemantic = {
    seasonKey: state.seasonKey,
    fromGameweek,
    modelKey: "market-xp",
    modelVersion: "2.0.0",
    rulesetKey: state.season.rulesetKey,
    codeVersion: input.codeVersion,
    horizons: [1, 3, 5],
    modelInputHash,
  };
  const runHash = await sha256Hex(canonicalJson(runSemantic));
  const runId = `run:${state.seasonKey.replaceAll(":", "-")}:gw${fromGameweek}:${runHash.slice(0, 20)}`;
  const modelSources = new Set([
    "premier-league-schedule",
    "fpl",
    "fpl-element-summary",
    "odds-api",
  ]);
  const inputHeads = state.sourceHeads
    .flatMap((head) =>
      modelSources.has(head.sourceKey) &&
      head.modelInputHash &&
      head.lastSuccessfulCapturedAt &&
      head.rawObjects.length > 0
        ? [
            {
              sourceKey: head.sourceKey,
              materialHash: head.modelInputHash,
              rawObjectKeys: head.rawObjects.map((object) => object.key).toSorted(),
              capturedAt: head.lastSuccessfulCapturedAt,
            },
          ]
        : [],
    )
    .toSorted((left, right) => left.sourceKey.localeCompare(right.sourceKey));
  return {
    status: "ready",
    runId,
    modelInputHash,
    inputHeads,
    request: {
      runId,
      datasetKey: "live",
      season: state.season,
      fromGameweek,
      horizons: [1, 3, 5],
      cutoffAt: input.cutoffAt,
      modelKey: "market-xp",
      modelVersion: "2.0.0",
      codeVersion: input.codeVersion,
      inputBatches: inputHeads.map((head) => ({
        id: `${head.sourceKey}:${head.materialHash.slice(0, 16)}`,
        role: head.sourceKey,
        capturedAt: head.capturedAt,
      })),
      sourceHealth: state.sourceHeads
        .filter((head) => modelSources.has(head.sourceKey))
        .map((head) => sourceHealth(head, input.cutoffAt))
        .toSorted((left, right) => left.sourceKey.localeCompare(right.sourceKey)),
      ...(state.ruleset ? { ruleset: state.ruleset } : {}),
      fixtures,
      players,
    },
  };
}
