import { resolvePremierLeagueTeam } from "./entity-resolution.ts";
import type { JsonValue } from "./contracts.ts";
import type { ForecastFixtureInput, ForecastRunRequest, FplPosition } from "./model/v2.ts";
import type {
  OpportunitySeasonContext,
  OpportunityTrailPoint,
  OwnershipState,
  PriceState,
  SourceHealth,
} from "./opportunity-map.ts";

export type AutomatedForecastBatch = {
  id: string;
  sourceKey: string;
  capturedAt: string;
  publishedAt?: string;
};

export type AutomatedForecastAttempt = {
  sourceKey: string;
  scheduledFor: string;
  status: "running" | "succeeded" | "partial" | "failed" | "skipped";
  error?: string;
};

export type AutomatedForecastObservation = {
  batchId: string;
  sourceKey: string;
  entityKey: string;
  fixtureKey?: string;
  metric: string;
  observedAt: string;
  publishedAt?: string;
  numericValue?: number;
  marketFamily?: string;
  outcome?: string;
  metadata?: Record<string, JsonValue>;
};

export type AutomatedForecastFixture = {
  key: string;
  gameweek: number;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
};

export type AutomatedForecastRegistration = {
  registrationKey: string;
  playerKey: string;
  name: string;
  team: string;
  position: FplPosition;
  status: "provisional" | "active" | "departed" | "unresolved";
};

export type AutomatedForecastInput = {
  datasetKey: string;
  season: OpportunitySeasonContext;
  fromGameweek: number;
  horizon: 1 | 3 | 5;
  cutoffAt: string;
  codeVersion: string;
  batches: AutomatedForecastBatch[];
  attempts?: AutomatedForecastAttempt[];
  fixtures: AutomatedForecastFixture[];
  registrations: AutomatedForecastRegistration[];
  observations: AutomatedForecastObservation[];
  playerTrails?: Record<string, OpportunityTrailPoint[]>;
};

export type AutomatedForecastPreparation =
  | { status: "ready"; request: ForecastRunRequest }
  | { status: "skipped"; reason: string };

type FixtureMarketEstimate = ForecastFixtureInput & { agreement: number };

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
  if (values.length === 0) return undefined;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function deviation(values: number[]): number {
  const average = mean(values);
  if (average === undefined || values.length < 2) return 0.1;
  return Math.sqrt(
    values.reduce((total, value) => total + (value - average) ** 2, 0) / values.length,
  );
}

function sourceOutcomeTeam(outcome: string): string | undefined {
  try {
    return resolvePremierLeagueTeam(outcome);
  } catch {
    return undefined;
  }
}

function bookmakerKey(observation: AutomatedForecastObservation): string {
  const value = observation.metadata?.bookmakerKey;
  return typeof value === "string" ? value : "market";
}

function groupByBook(observations: AutomatedForecastObservation[]) {
  const grouped = new Map<string, AutomatedForecastObservation[]>();
  for (const observation of observations) {
    const key = bookmakerKey(observation);
    grouped.set(key, [...(grouped.get(key) ?? []), observation]);
  }
  return grouped;
}

function estimateFixture(
  fixture: AutomatedForecastFixture,
  observations: AutomatedForecastObservation[],
): FixtureMarketEstimate {
  const rows = observations.filter(
    (observation) =>
      observation.fixtureKey === fixture.key && observation.numericValue !== undefined,
  );
  const h2hByBook = groupByBook(rows.filter((row) => row.marketFamily === "h2h"));
  const homeProbabilities: number[] = [];
  const awayProbabilities: number[] = [];
  for (const bookRows of h2hByBook.values()) {
    const implied = bookRows.flatMap((row) => {
      const team = row.outcome ? sourceOutcomeTeam(row.outcome) : undefined;
      const probability = row.numericValue ? 1 / row.numericValue : undefined;
      return probability === undefined ? [] : [{ team, outcome: row.outcome, probability }];
    });
    const total = implied.reduce((sum, row) => sum + row.probability, 0);
    if (total <= 0) continue;
    const home = implied.find((row) => row.team === fixture.homeTeam);
    const away = implied.find((row) => row.team === fixture.awayTeam);
    if (home && away) {
      homeProbabilities.push(home.probability / total);
      awayProbabilities.push(away.probability / total);
    }
  }

  const totalsByBook = groupByBook(rows.filter((row) => row.marketFamily === "totals"));
  const totalGoalRates: number[] = [];
  for (const bookRows of totalsByBook.values()) {
    const availablePoints = bookRows
      .map((row) => row.metadata?.point)
      .filter((point): point is number => typeof point === "number");
    const selectedPoint = availablePoints.toSorted(
      (left, right) => Math.abs(left - 2.5) - Math.abs(right - 2.5),
    )[0];
    if (selectedPoint === undefined) continue;
    const atPoint = bookRows.filter((row) => row.metadata?.point === selectedPoint);
    const over = atPoint.find((row) => row.outcome?.toLocaleLowerCase() === "over");
    const under = atPoint.find((row) => row.outcome?.toLocaleLowerCase() === "under");
    if (!over?.numericValue || !under?.numericValue) continue;
    const overImplied = 1 / over.numericValue;
    const underImplied = 1 / under.numericValue;
    const overProbability = overImplied / (overImplied + underImplied);
    totalGoalRates.push(clamp(selectedPoint + (overProbability - 0.5) * 1.4, 1.5, 4.5));
  }

  const totalGoalRate = mean(totalGoalRates) ?? 2.65;
  const homeProbability = mean(homeProbabilities);
  const awayProbability = mean(awayProbabilities);
  const homeShare =
    homeProbability !== undefined && awayProbability !== undefined
      ? clamp(homeProbability / (homeProbability + awayProbability), 0.35, 0.7)
      : 0.55;
  const familyCoverage = Number(homeProbabilities.length > 0) + Number(totalGoalRates.length > 0);
  const marketCoverage = familyCoverage / 2;
  const agreement =
    familyCoverage === 0
      ? 0.4
      : clamp(
          1 -
            (deviation(homeProbabilities) + deviation(totalGoalRates.map((rate) => rate / 4.5))) *
              1.5,
          0.4,
          1,
        );

  return {
    ...fixture,
    homeGoalRate: Number((totalGoalRate * homeShare).toFixed(3)),
    awayGoalRate: Number((totalGoalRate * (1 - homeShare)).toFixed(3)),
    marketCoverage,
    agreement,
  };
}

function metricMap(observations: AutomatedForecastObservation[]) {
  const byPlayer = new Map<string, Map<string, number>>();
  for (const observation of observations) {
    if (observation.sourceKey !== "fpl" || observation.numericValue === undefined) continue;
    const metrics = byPlayer.get(observation.entityKey) ?? new Map<string, number>();
    metrics.set(observation.metric, observation.numericValue);
    byPlayer.set(observation.entityKey, metrics);
  }
  return byPlayer;
}

function sourceHealth(
  input: AutomatedForecastInput,
  fixtureEstimates: FixtureMarketEstimate[],
  playerMetricCount: number,
  observedAt: string,
): SourceHealth[] {
  const specs = [
    {
      key: "premier-league-schedule",
      label: "Premier League schedule",
      freshMinutes: 2_160,
      coverage: clamp(fixtureEstimates.length / Math.max(1, input.horizon * 10)),
      detail: `${fixtureEstimates.length} fixtures in the selected horizon`,
    },
    {
      key: "fpl",
      label: "Fantasy Premier League",
      freshMinutes: 90,
      coverage: clamp(playerMetricCount / Math.max(1, input.registrations.length)),
      detail: `${playerMetricCount} of ${input.registrations.length} registrations observed`,
    },
    {
      key: "odds-api",
      label: "Bookmaker consensus",
      freshMinutes: 60,
      coverage: mean(fixtureEstimates.map((fixture) => fixture.marketCoverage)) ?? 0,
      detail: "H2H and totals markets are de-vigged before conversion to goal rates",
    },
    {
      key: "polymarket",
      label: "Polymarket",
      freshMinutes: 60,
      coverage: 0,
      detail: "Captured for research; unmatched markets do not influence player forecasts",
    },
  ] as const;
  const cutoff = Date.parse(observedAt);
  return specs.map((spec) => {
    const batch = input.batches.find((candidate) => candidate.sourceKey === spec.key);
    const attempt = input.attempts?.find((candidate) => candidate.sourceKey === spec.key);
    const failedAfterBatch =
      attempt?.status === "failed" &&
      (!batch || Date.parse(attempt.scheduledFor) >= Date.parse(batch.capturedAt));
    if (failedAfterBatch) {
      return {
        sourceKey: spec.key,
        label: spec.label,
        status: "failed" as const,
        ...(batch ? { lastCapturedAt: batch.capturedAt } : {}),
        coverage: spec.coverage,
        detail: attempt.error ? `Latest attempt failed: ${attempt.error}` : "Latest attempt failed",
      };
    }
    if (!batch) {
      return {
        sourceKey: spec.key,
        label: spec.label,
        status: "missing" as const,
        coverage: spec.coverage,
        detail: spec.detail,
      };
    }
    const ageMinutes = Math.max(0, cutoff - Date.parse(batch.capturedAt)) / 60_000;
    const status =
      ageMinutes > spec.freshMinutes
        ? ("stale" as const)
        : spec.coverage < 0.85
          ? ("partial" as const)
          : ("fresh" as const);
    return {
      sourceKey: spec.key,
      label: spec.label,
      status,
      lastCapturedAt: batch.capturedAt,
      coverage: spec.coverage,
      detail: spec.detail,
    };
  });
}

function shortHash(value: string): string {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

export function prepareAutomatedForecast(
  input: AutomatedForecastInput,
): AutomatedForecastPreparation {
  const fplBatch = input.batches.find((batch) => batch.sourceKey === "fpl");
  if (!fplBatch) {
    return { status: "skipped", reason: "No current-season FPL capture is available" };
  }
  if (input.registrations.length === 0) {
    return { status: "skipped", reason: "No current-season player registrations are available" };
  }
  const horizonFixtures = input.fixtures.filter(
    (fixture) =>
      fixture.gameweek >= input.fromGameweek &&
      fixture.gameweek < input.fromGameweek + input.horizon,
  );
  if (horizonFixtures.length === 0) {
    return { status: "skipped", reason: "No fixtures are available in the forecast horizon" };
  }

  const metricsByPlayer = metricMap(input.observations);
  const fixtureEstimates = horizonFixtures.map((fixture) =>
    estimateFixture(fixture, input.observations),
  );
  const ownershipRank = new Map<string, number>();
  for (const position of ["GKP", "DEF", "MID", "FWD"] as const) {
    input.registrations
      .filter((registration) => registration.position === position)
      .map((registration) => ({
        key: registration.registrationKey,
        value: metricsByPlayer.get(registration.playerKey)?.get("ownership"),
      }))
      .filter((entry): entry is { key: string; value: number } => entry.value !== undefined)
      .toSorted((left, right) => right.value - left.value)
      .forEach((entry, index) => ownershipRank.set(entry.key, index + 1));
  }

  let observedPlayers = 0;
  const modelCutoffAt = [
    ...input.batches.map((batch) => batch.capturedAt),
    ...(input.attempts ?? []).map((attempt) => attempt.scheduledFor),
  ]
    .toSorted()
    .at(-1)!;
  const players = input.registrations
    .filter((registration) => registration.status !== "departed")
    .map((registration) => {
      const metrics = metricsByPlayer.get(registration.playerKey) ?? new Map<string, number>();
      if (metrics.size > 0) observedPlayers += 1;
      const prior = priors[registration.position];
      const minutes = metrics.get("minutes") ?? 0;
      const sampleWeight = clamp(minutes / 450);
      const rawGoalsPer90 =
        metrics.get("expected_goals_per_90") ??
        (minutes > 0 ? ((metrics.get("expected_goals") ?? 0) * 90) / minutes : prior.goalsPer90);
      const rawAssistsPer90 =
        metrics.get("expected_assists_per_90") ??
        (minutes > 0
          ? ((metrics.get("expected_assists") ?? 0) * 90) / minutes
          : prior.assistsPer90);
      const availability = clamp(metrics.get("availability_probability") ?? 1);
      const starts = metrics.get("starts") ?? 0;
      const completedGameweeks = Math.max(0, input.fromGameweek - 1);
      const substituteAppearances = Math.max(0, minutes - starts * 75) / 25;
      const observedPlayProbability =
        completedGameweeks > 0
          ? clamp((starts + substituteAppearances) / completedGameweeks, 0.05, 0.99)
          : undefined;
      const expectedPointsSignal = metrics.get("expected_points_next");
      const ownershipSignal = metrics.get("ownership");
      const preseasonRoleProbability =
        expectedPointsSignal !== undefined
          ? clamp(expectedPointsSignal / 4.5, 0.08, 0.99)
          : ownershipSignal !== undefined
            ? clamp(0.35 + Math.log1p(ownershipSignal) / 5, 0.35, 0.95)
            : 0.65;
      const playProbability = availability * (observedPlayProbability ?? preseasonRoleProbability);
      const empiricalSixty =
        starts > 0 && minutes > 0
          ? clamp(minutes / starts / 75, 0.55, 0.98)
          : prior.sixtyProbability;
      const observedStartProbability =
        completedGameweeks > 0 ? clamp(starts / completedGameweeks) : undefined;
      const teamFixtures = fixtureEstimates.filter(
        (fixture) =>
          fixture.homeTeam === registration.team || fixture.awayTeam === registration.team,
      );
      const sourceAgreement = mean(teamFixtures.map((fixture) => fixture.agreement)) ?? 0.4;
      const priceValue = metrics.get("price");
      const price: PriceState =
        priceValue === undefined
          ? { status: "unpublished" }
          : input.season.priceState === "official" || input.season.priceState === "partial"
            ? { status: "official", value: priceValue, observedAt: fplBatch.capturedAt }
            : { status: "unpublished" };
      const ownershipValue = metrics.get("ownership");
      const rank = ownershipRank.get(registration.registrationKey);
      const ownership: OwnershipState =
        ownershipValue === undefined
          ? { status: "unavailable" }
          : input.season.priceState === "official" && rank
            ? {
                status: "official",
                value: clamp(ownershipValue, 0, 100),
                rankWithinPosition: rank,
                observedAt: fplBatch.capturedAt,
              }
            : { status: "provisional", value: clamp(ownershipValue, 0, 100) };
      return {
        registrationKey: registration.registrationKey,
        playerKey: registration.playerKey,
        name: registration.name,
        team: registration.team,
        position: registration.position,
        registrationStatus: registration.status,
        price,
        ownership,
        playProbability,
        sixtyMinuteProbability: clamp(
          availability *
            (observedStartProbability === undefined
              ? preseasonRoleProbability * prior.sixtyProbability
              : observedStartProbability * empiricalSixty),
          0,
          playProbability,
        ),
        goalsPer90: prior.goalsPer90 * (1 - sampleWeight) + rawGoalsPer90 * sampleWeight,
        assistsPer90: prior.assistsPer90 * (1 - sampleWeight) + rawAssistsPer90 * sampleWeight,
        savesPer90: metrics.get("saves_per_90"),
        defensiveContributionsPer90: metrics.get("defensive_contributions_per_90"),
        cardsPer90: metrics.get("cards_per_90"),
        sourceAgreement,
      };
    });

  const inputBatches = input.batches
    .toSorted((left, right) => left.sourceKey.localeCompare(right.sourceKey))
    .map((batch) => ({
      id: batch.id,
      role: batch.sourceKey,
      capturedAt: batch.capturedAt,
      ...(batch.publishedAt ? { publishedAt: batch.publishedAt } : {}),
    }));
  const identity = JSON.stringify({
    season: input.season.key,
    fromGameweek: input.fromGameweek,
    horizon: input.horizon,
    batches: inputBatches.map((batch) => batch.id),
    cutoffAt: modelCutoffAt,
    codeVersion: input.codeVersion,
  });
  const playerTrails = Object.fromEntries(
    Object.entries(input.playerTrails ?? {}).flatMap(([registrationKey, points]) => {
      const priorPoints = points.filter((point) => point.observedAt < modelCutoffAt);
      return priorPoints.length > 0 ? [[registrationKey, priorPoints]] : [];
    }),
  );
  return {
    status: "ready",
    request: {
      runId: `market-xp-v2:${input.season.key}:gw${input.fromGameweek}:h${input.horizon}:${shortHash(identity)}`,
      datasetKey: input.datasetKey,
      season: input.season,
      fromGameweek: input.fromGameweek,
      horizon: input.horizon,
      modelKey: "market-xp",
      modelVersion: "2.0.0",
      codeVersion: input.codeVersion,
      inputBatches,
      cutoffAt: modelCutoffAt,
      sourceHealth: sourceHealth(input, fixtureEstimates, observedPlayers, modelCutoffAt),
      ...(Object.keys(playerTrails).length > 0 ? { playerTrails } : {}),
      fixtures: fixtureEstimates.map(({ agreement: _agreement, ...fixture }) => fixture),
      players,
    },
  };
}
