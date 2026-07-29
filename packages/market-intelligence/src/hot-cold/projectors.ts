import type { CaptureBatch, Observation } from "../contracts.ts";
import { resolvePremierLeagueTeam } from "../entity-resolution.ts";
import { canonicalJson, sha256Hex } from "./artifact-store.ts";
import type {
  CurrentFixtureMarketState,
  CurrentPlayerPrior,
  CurrentPlayerState,
} from "./hot-state.ts";

const FPL_NUMERIC_FIELDS = {
  availability_probability: "availabilityProbability",
  chance_of_playing_this_round: "chanceOfPlayingThisRound",
  minutes: "minutes",
  starts: "starts",
  price: "price",
  ownership: "ownership",
  expected_goals: "expectedGoals",
  expected_assists: "expectedAssists",
  expected_goals_per_90: "expectedGoalsPer90",
  expected_assists_per_90: "expectedAssistsPer90",
  saves_per_90: "savesPer90",
  defensive_contributions_per_90: "defensiveContributionsPer90",
  cards_per_90: "cardsPer90",
  expected_points_next: "expectedPointsNext",
} as const;

type FplNumericField = (typeof FPL_NUMERIC_FIELDS)[keyof typeof FPL_NUMERIC_FIELDS];

function registrationKey(
  observation: Observation,
  entityRegistrationKeys?: Readonly<Record<string, string>>,
): string | undefined {
  const metadataKey = observation.metadata?.registrationKey;
  if (typeof metadataKey === "string") return metadataKey;
  const mapped = entityRegistrationKeys?.[observation.entityKey];
  if (mapped) return mapped;
  return observation.entityKey.includes(":registration:") ? observation.entityKey : undefined;
}

function round(value: number, places = 6): number {
  return Number(value.toFixed(places));
}

function groupByRegistration(
  observations: Observation[],
  entityRegistrationKeys?: Readonly<Record<string, string>>,
): Map<string, Observation[]> {
  const grouped = new Map<string, Observation[]>();
  for (const observation of observations) {
    const key = registrationKey(observation, entityRegistrationKeys);
    if (!key) continue;
    grouped.set(key, [...(grouped.get(key) ?? []), observation]);
  }
  return grouped;
}

export async function projectFplCurrentState(
  batch: CaptureBatch,
  seasonKey: string,
  entityRegistrationKeys?: Readonly<Record<string, string>>,
): Promise<CurrentPlayerState[]> {
  if (batch.source.key !== "fpl") {
    throw new Error(`Expected an fpl capture, received ${batch.source.key}`);
  }
  const grouped = groupByRegistration(batch.observations, entityRegistrationKeys);
  const result: CurrentPlayerState[] = [];
  for (const [key, observations] of grouped) {
    const numeric = new Map<FplNumericField, number>();
    let news: string | undefined;
    let newsAddedAt: string | undefined;
    for (const observation of observations) {
      const target = FPL_NUMERIC_FIELDS[observation.metric as keyof typeof FPL_NUMERIC_FIELDS] as
        | FplNumericField
        | undefined;
      if (target && observation.numericValue !== undefined) {
        numeric.set(target, observation.numericValue);
      } else if (observation.metric === "news") {
        news = observation.stringValue;
      } else if (observation.metric === "news_added_at") {
        newsAddedAt = observation.stringValue;
      }
    }
    const semantic = {
      registrationKey: key,
      seasonKey,
      availabilityProbability: numeric.get("availabilityProbability") ?? 0,
      minutes: numeric.get("minutes") ?? 0,
      starts: numeric.get("starts") ?? 0,
      ...(numeric.get("price") === undefined ? {} : { price: numeric.get("price") }),
      ...(numeric.get("ownership") === undefined ? {} : { ownership: numeric.get("ownership") }),
      ...(numeric.get("chanceOfPlayingThisRound") === undefined
        ? {}
        : { chanceOfPlayingThisRound: numeric.get("chanceOfPlayingThisRound") }),
      ...(numeric.get("expectedGoals") === undefined
        ? {}
        : { expectedGoals: numeric.get("expectedGoals") }),
      ...(numeric.get("expectedAssists") === undefined
        ? {}
        : { expectedAssists: numeric.get("expectedAssists") }),
      ...(numeric.get("expectedGoalsPer90") === undefined
        ? {}
        : { expectedGoalsPer90: numeric.get("expectedGoalsPer90") }),
      ...(numeric.get("expectedAssistsPer90") === undefined
        ? {}
        : { expectedAssistsPer90: numeric.get("expectedAssistsPer90") }),
      ...(numeric.get("savesPer90") === undefined ? {} : { savesPer90: numeric.get("savesPer90") }),
      ...(numeric.get("defensiveContributionsPer90") === undefined
        ? {}
        : { defensiveContributionsPer90: numeric.get("defensiveContributionsPer90") }),
      ...(numeric.get("cardsPer90") === undefined ? {} : { cardsPer90: numeric.get("cardsPer90") }),
      ...(numeric.get("expectedPointsNext") === undefined
        ? {}
        : { expectedPointsNext: numeric.get("expectedPointsNext") }),
      ...(news ? { news } : {}),
      ...(newsAddedAt ? { newsAddedAt } : {}),
    };
    result.push({
      ...semantic,
      observedAt: batch.capturedAt,
      rowHash: await sha256Hex(canonicalJson(semantic)),
    });
  }
  return result.toSorted((left, right) =>
    left.registrationKey.localeCompare(right.registrationKey),
  );
}

type HistoricalSeason = {
  season: string;
  metrics: Map<string, number>;
};

export async function projectFplPlayerPriors(
  batch: CaptureBatch,
  seasonKey: string,
  entityRegistrationKeys?: Readonly<Record<string, string>>,
): Promise<CurrentPlayerPrior[]> {
  if (batch.source.key !== "fpl-element-summary") {
    throw new Error(`Expected an fpl-element-summary capture, received ${batch.source.key}`);
  }
  const byRegistration = groupByRegistration(batch.observations, entityRegistrationKeys);
  const result: CurrentPlayerPrior[] = [];
  for (const [key, observations] of byRegistration) {
    const bySeason = new Map<string, Map<string, number>>();
    for (const observation of observations) {
      const sourceSeason = observation.metadata?.sourceSeason;
      if (
        !observation.metric.startsWith("historical_") ||
        observation.metric === "historical_season" ||
        observation.numericValue === undefined ||
        typeof sourceSeason !== "string"
      ) {
        continue;
      }
      const metrics = bySeason.get(sourceSeason) ?? new Map<string, number>();
      metrics.set(observation.metric.slice("historical_".length), observation.numericValue);
      bySeason.set(sourceSeason, metrics);
    }
    const seasons: HistoricalSeason[] = [...bySeason.entries()]
      .toSorted(([left], [right]) => right.localeCompare(left))
      .slice(0, 3)
      .map(([season, metrics]) => ({ season, metrics }));
    if (seasons.length === 0) continue;
    let weightedMinutes = 0;
    let weightedGoals = 0;
    let weightedAssists = 0;
    let goalMinutes = 0;
    let assistMinutes = 0;
    const sourceSeasons = seasons.map(({ season, metrics }, index) => {
      const weight = [1, 0.65, 0.4][index] ?? 0;
      const minutes = metrics.get("minutes") ?? 0;
      const goals = metrics.get("expected_goals") ?? metrics.get("goals_scored");
      const assists = metrics.get("expected_assists") ?? metrics.get("assists");
      weightedMinutes += minutes * weight;
      if (goals !== undefined) {
        weightedGoals += goals * weight;
        goalMinutes += minutes * weight;
      }
      if (assists !== undefined) {
        weightedAssists += assists * weight;
        assistMinutes += minutes * weight;
      }
      return { season, weight };
    });
    const semantic = {
      registrationKey: key,
      seasonKey,
      weightedMinutes: round(weightedMinutes),
      goalsPer90: round(goalMinutes > 0 ? (weightedGoals * 90) / goalMinutes : 0),
      assistsPer90: round(assistMinutes > 0 ? (weightedAssists * 90) / assistMinutes : 0),
      sourceSeasons,
      calculationVersion: "fpl-prior-v1",
    };
    result.push({
      ...semantic,
      observedAt: batch.capturedAt,
      rowHash: await sha256Hex(canonicalJson(semantic)),
    });
  }
  return result.toSorted((left, right) =>
    left.registrationKey.localeCompare(right.registrationKey),
  );
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function mean(values: number[]): number | undefined {
  return values.length === 0
    ? undefined
    : values.reduce((total, value) => total + value, 0) / values.length;
}

function deviation(values: number[]): number {
  const average = mean(values);
  if (average === undefined || values.length < 2) return 0.1;
  return Math.sqrt(
    values.reduce((total, value) => total + (value - average) ** 2, 0) / values.length,
  );
}

function bookmakerKey(observation: Observation): string {
  const key = observation.metadata?.bookmakerKey;
  return typeof key === "string" ? key : "market";
}

function groupByBook(observations: Observation[]): Map<string, Observation[]> {
  const grouped = new Map<string, Observation[]>();
  for (const observation of observations) {
    const key = bookmakerKey(observation);
    grouped.set(key, [...(grouped.get(key) ?? []), observation]);
  }
  return grouped;
}

function outcomeTeam(outcome: string): string | undefined {
  try {
    return resolvePremierLeagueTeam(outcome);
  } catch {
    return undefined;
  }
}

export async function projectOddsConsensus(
  batch: CaptureBatch,
  seasonKey: string,
): Promise<CurrentFixtureMarketState[]> {
  if (batch.source.key !== "odds-api") {
    throw new Error(`Expected an odds-api capture, received ${batch.source.key}`);
  }
  const result: CurrentFixtureMarketState[] = [];
  for (const fixture of batch.fixtures) {
    const rows = batch.observations.filter(
      (observation) =>
        observation.fixtureKey === fixture.key &&
        observation.metric === "decimal_odds" &&
        observation.numericValue !== undefined,
    );
    const homeProbabilities: number[] = [];
    const awayProbabilities: number[] = [];
    for (const bookRows of groupByBook(rows.filter((row) => row.marketFamily === "h2h")).values()) {
      const implied = bookRows.flatMap((row) => {
        if (!row.numericValue || !row.outcome) return [];
        return [{ team: outcomeTeam(row.outcome), probability: 1 / row.numericValue }];
      });
      const total = implied.reduce((sum, row) => sum + row.probability, 0);
      const home = implied.find((row) => row.team === fixture.homeTeam);
      const away = implied.find((row) => row.team === fixture.awayTeam);
      if (total > 0 && home && away) {
        homeProbabilities.push(home.probability / total);
        awayProbabilities.push(away.probability / total);
      }
    }
    const totalGoalRates: number[] = [];
    for (const bookRows of groupByBook(
      rows.filter((row) => row.marketFamily === "totals"),
    ).values()) {
      const selectedPoint = bookRows
        .map((row) => row.metadata?.point)
        .filter((point): point is number => typeof point === "number")
        .toSorted((left, right) => Math.abs(left - 2.5) - Math.abs(right - 2.5))[0];
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
    const sourceAgreement =
      familyCoverage === 0
        ? 0.4
        : clamp(
            1 -
              (deviation(homeProbabilities) + deviation(totalGoalRates.map((rate) => rate / 4.5))) *
                1.5,
            0.4,
            1,
          );
    const semantic = {
      sourceKey: batch.source.key,
      fixtureKey: fixture.key,
      seasonKey,
      homeGoalRate: round(totalGoalRate * homeShare, 3),
      awayGoalRate: round(totalGoalRate * (1 - homeShare), 3),
      marketCoverage,
      sourceAgreement,
      bookmakerCount: new Set(rows.map(bookmakerKey)).size,
      projectionVersion: "odds-consensus-v1",
    };
    result.push({
      ...semantic,
      observedAt: batch.capturedAt,
      rowHash: await sha256Hex(canonicalJson(semantic)),
    });
  }
  return result.toSorted((left, right) => left.fixtureKey.localeCompare(right.fixtureKey));
}
