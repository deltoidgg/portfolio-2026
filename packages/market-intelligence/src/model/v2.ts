import {
  opportunitySnapshotSchema,
  type OpportunityPlayer,
  type OpportunitySeasonContext,
  type OpportunitySnapshot,
  type OpportunityTrailPoint,
  type OwnershipState,
  type PriceState,
  type SourceHealth,
} from "../opportunity-map.ts";
import type { ForecastComponents } from "../contracts.ts";

export type FplPosition = "GKP" | "DEF" | "MID" | "FWD";

export type FplRuleset = {
  key: string;
  appearance: { underSixty: number; sixtyPlus: number };
  goal: Record<FplPosition, number>;
  assist: number;
  cleanSheet: Record<FplPosition, number>;
  savesPerPoint: number;
  goalsConcededPerPenalty: number;
  defensiveContributions: {
    threshold: Record<FplPosition, number>;
    points: number;
  };
  yellowCard: number;
  redCard: number;
  ownGoal: number;
  penaltyMiss: number;
  penaltySave: number;
};

export const defaultFplRuleset: FplRuleset = {
  key: "fpl:2025-26:official-v1",
  appearance: { underSixty: 1, sixtyPlus: 2 },
  goal: { GKP: 10, DEF: 6, MID: 5, FWD: 4 },
  assist: 3,
  cleanSheet: { GKP: 4, DEF: 4, MID: 1, FWD: 0 },
  savesPerPoint: 3,
  goalsConcededPerPenalty: 2,
  defensiveContributions: {
    threshold: { GKP: 10, DEF: 10, MID: 12, FWD: 12 },
    points: 2,
  },
  yellowCard: -1,
  redCard: -3,
  ownGoal: -2,
  penaltyMiss: -2,
  penaltySave: 5,
};

export type FplFixtureEvent = {
  position: FplPosition;
  minutes: number;
  goals?: number;
  assists?: number;
  cleanSheet?: boolean;
  saves?: number;
  goalsConceded?: number;
  defensiveContributions?: number;
  bonus?: number;
  yellowCards?: number;
  redCards?: number;
  ownGoals?: number;
  penaltiesMissed?: number;
  penaltiesSaved?: number;
};

export function scoreFplFixture(rules: FplRuleset, event: FplFixtureEvent): number {
  if (event.minutes <= 0) return 0;
  const appearedForSixty = event.minutes >= 60;
  let points = appearedForSixty ? rules.appearance.sixtyPlus : rules.appearance.underSixty;
  points += (event.goals ?? 0) * rules.goal[event.position];
  points += (event.assists ?? 0) * rules.assist;
  if (appearedForSixty && event.cleanSheet) points += rules.cleanSheet[event.position];
  if (event.position === "GKP") {
    points += Math.floor((event.saves ?? 0) / rules.savesPerPoint);
    points += (event.penaltiesSaved ?? 0) * rules.penaltySave;
  }
  if (appearedForSixty && (event.position === "GKP" || event.position === "DEF")) {
    points -= Math.floor((event.goalsConceded ?? 0) / rules.goalsConcededPerPenalty);
  }
  if (
    (event.defensiveContributions ?? 0) >= rules.defensiveContributions.threshold[event.position]
  ) {
    points += rules.defensiveContributions.points;
  }
  points += event.bonus ?? 0;
  points += (event.yellowCards ?? 0) * rules.yellowCard;
  points += (event.redCards ?? 0) * rules.redCard;
  points += (event.ownGoals ?? 0) * rules.ownGoal;
  points += (event.penaltiesMissed ?? 0) * rules.penaltyMiss;
  return points;
}

export type ForecastInputBatch = {
  id: string;
  role: string;
  capturedAt: string;
  publishedAt?: string;
};

export type ForecastFixtureInput = {
  key: string;
  gameweek: number;
  homeTeam: string;
  awayTeam: string;
  homeGoalRate: number;
  awayGoalRate: number;
  kickoffAt: string;
  marketCoverage: number;
};

export type ForecastPlayerInput = {
  registrationKey: string;
  playerKey: string;
  name: string;
  team: string;
  position: FplPosition;
  registrationStatus: OpportunityPlayer["registrationStatus"];
  price: PriceState;
  ownership: OwnershipState;
  playProbability: number;
  sixtyMinuteProbability: number;
  goalsPer90: number;
  assistsPer90: number;
  sourceAgreement: number;
  savesPer90?: number;
  defensiveContributionsPer90?: number;
  cardsPer90?: number;
};

export type ForecastRunRequest = {
  runId: string;
  datasetKey: string;
  season: OpportunitySeasonContext;
  fromGameweek: number;
  horizon: 1 | 3 | 5;
  cutoffAt: string;
  modelKey: string;
  modelVersion: string;
  codeVersion: string;
  inputBatches: ForecastInputBatch[];
  sourceHealth?: SourceHealth[];
  playerTrails?: Record<string, OpportunityTrailPoint[]>;
  fixtures: ForecastFixtureInput[];
  players: ForecastPlayerInput[];
  ruleset?: FplRuleset;
};

type ProbabilityMass = Map<number, number>;

function round(value: number): number {
  return Number(value.toFixed(2));
}

function clampProbability(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function poissonBins(rate: number, lastBin: number): Array<[number, number]> {
  const bins: Array<[number, number]> = [];
  let probability = Math.exp(-Math.max(0, rate));
  let assigned = 0;
  for (let count = 0; count < lastBin; count += 1) {
    if (count > 0) probability = (probability * rate) / count;
    bins.push([count, probability]);
    assigned += probability;
  }
  bins.push([lastBin, Math.max(0, 1 - assigned)]);
  return bins;
}

function addMass(target: ProbabilityMass, points: number, probability: number) {
  target.set(points, (target.get(points) ?? 0) + probability);
}

function normalized(mass: ProbabilityMass): ProbabilityMass {
  const total = [...mass.values()].reduce((sum, probability) => sum + probability, 0);
  if (total <= 0) return new Map([[0, 1]]);
  return new Map([...mass].map(([points, probability]) => [points, probability / total]));
}

function convolve(left: ProbabilityMass, right: ProbabilityMass): ProbabilityMass {
  const result = new Map<number, number>();
  for (const [leftPoints, leftProbability] of left) {
    for (const [rightPoints, rightProbability] of right) {
      addMass(result, leftPoints + rightPoints, leftProbability * rightProbability);
    }
  }
  return normalized(result);
}

function expectedValue(mass: ProbabilityMass): number {
  return [...mass].reduce((total, [points, probability]) => total + points * probability, 0);
}

function quantile(mass: ProbabilityMass, target: number): number {
  let cumulative = 0;
  for (const [points, probability] of [...mass].toSorted((a, b) => a[0] - b[0])) {
    cumulative += probability;
    if (cumulative >= target) return points;
  }
  return [...mass.keys()].toSorted((a, b) => a - b).at(-1) ?? 0;
}

function probabilityAtLeast(mass: ProbabilityMass, threshold: number): number {
  return [...mass].reduce(
    (total, [points, probability]) => total + (points >= threshold ? probability : 0),
    0,
  );
}

function fixtureDistribution(
  rules: FplRuleset,
  player: ForecastPlayerInput,
  fixture: ForecastFixtureInput,
): ProbabilityMass {
  const isHome = fixture.homeTeam === player.team;
  const teamGoalRate = isHome ? fixture.homeGoalRate : fixture.awayGoalRate;
  const opponentGoalRate = isHome ? fixture.awayGoalRate : fixture.homeGoalRate;
  const playProbability = clampProbability(player.playProbability);
  const sixtyProbability = Math.min(
    playProbability,
    clampProbability(player.sixtyMinuteProbability),
  );
  const expectedMinutes = playProbability * 30 + sixtyProbability * 45;
  const teamStrength = Math.max(0.45, Math.min(1.8, teamGoalRate / 1.45));
  const unconditionalGoalRate = player.goalsPer90 * (expectedMinutes / 90) * teamStrength;
  const unconditionalAssistRate = player.assistsPer90 * (expectedMinutes / 90) * teamStrength;
  const conditionalGoalRate = playProbability > 0 ? unconditionalGoalRate / playProbability : 0;
  const conditionalAssistRate = playProbability > 0 ? unconditionalAssistRate / playProbability : 0;
  const goalBins = poissonBins(conditionalGoalRate, 4);
  const assistBins = poissonBins(conditionalAssistRate, 3);
  const minuteScenarios = [
    { minutes: 0, probability: 1 - playProbability },
    { minutes: 45, probability: playProbability - sixtyProbability },
    { minutes: 80, probability: sixtyProbability },
  ];
  const result = new Map<number, number>();

  for (const minutes of minuteScenarios) {
    if (minutes.probability <= 0) continue;
    if (minutes.minutes === 0) {
      addMass(result, 0, minutes.probability);
      continue;
    }
    const concededScenarios =
      minutes.minutes >= 60
        ? poissonBins(opponentGoalRate, 5).map(([goalsConceded, probability]) => ({
            cleanSheet: goalsConceded === 0,
            goalsConceded,
            probability,
          }))
        : [{ cleanSheet: false, goalsConceded: 0, probability: 1 }];
    for (const [goals, goalProbability] of goalBins) {
      for (const [assists, assistProbability] of assistBins) {
        for (const conceded of concededScenarios) {
          const bonus = goals >= 2 ? 3 : goals === 1 ? 1 : assists >= 2 ? 1 : 0;
          const defensiveContributions =
            (player.defensiveContributionsPer90 ?? 0) * (minutes.minutes / 90);
          const saves = (player.savesPer90 ?? 0) * (minutes.minutes / 90);
          const yellowCards = (player.cardsPer90 ?? 0) * (minutes.minutes / 90) >= 0.5 ? 1 : 0;
          const points = scoreFplFixture(rules, {
            position: player.position,
            minutes: minutes.minutes,
            goals,
            assists,
            cleanSheet: conceded.cleanSheet,
            goalsConceded: conceded.goalsConceded,
            saves: Math.floor(saves),
            defensiveContributions: Math.floor(defensiveContributions),
            bonus,
            yellowCards,
          });
          addMass(
            result,
            points,
            minutes.probability * goalProbability * assistProbability * conceded.probability,
          );
        }
      }
    }
  }
  return normalized(result);
}

export interface MarketXpForecastRunner {
  run(request: ForecastRunRequest): OpportunitySnapshot;
  runArtifact(request: ForecastRunRequest): ForecastRunArtifact;
}

export type PlayerFixtureForecastArtifact = {
  runId: string;
  fixtureKey: string;
  registrationKey: string;
  expectedPoints: number;
  distribution: Array<[number, number]>;
  components: ForecastComponents;
  marketCoverage: number;
};

export type ForecastRunArtifact = {
  request: ForecastRunRequest;
  snapshot: OpportunitySnapshot;
  fixtureForecasts: PlayerFixtureForecastArtifact[];
};

function executeForecastRun(request: ForecastRunRequest): ForecastRunArtifact {
  for (const batch of request.inputBatches) {
    if (
      batch.capturedAt > request.cutoffAt ||
      (batch.publishedAt ?? batch.capturedAt) > request.cutoffAt
    ) {
      throw new Error(`Input batch ${batch.id} is after cutoff ${request.cutoffAt}`);
    }
  }
  const rules = request.ruleset ?? { ...defaultFplRuleset, key: request.season.rulesetKey };
  const fixtureForecasts: PlayerFixtureForecastArtifact[] = [];
  const provisionalPlayers = request.players.map((player) => {
    const gameweeks = [];
    let horizonMass: ProbabilityMass = new Map([[0, 1]]);
    let noHaulProbability = 1;
    const usedFixtures: ForecastFixtureInput[] = [];
    for (
      let gameweek = request.fromGameweek;
      gameweek < request.fromGameweek + request.horizon;
      gameweek += 1
    ) {
      const fixtures = request.fixtures.filter(
        (fixture) =>
          fixture.gameweek === gameweek &&
          (fixture.homeTeam === player.team || fixture.awayTeam === player.team),
      );
      let gameweekMass: ProbabilityMass = new Map([[0, 1]]);
      for (const fixture of fixtures) {
        const distribution = fixtureDistribution(rules, player, fixture);
        const fixtureExpectedPoints = expectedValue(distribution);
        const isHome = fixture.homeTeam === player.team;
        const opponentGoalRate = isHome ? fixture.awayGoalRate : fixture.homeGoalRate;
        const sixtyProbability = Math.min(
          clampProbability(player.playProbability),
          clampProbability(player.sixtyMinuteProbability),
        );
        const expectedMinutes =
          clampProbability(player.playProbability) * 30 + sixtyProbability * 45;
        const teamGoalRate = isHome ? fixture.homeGoalRate : fixture.awayGoalRate;
        const teamStrength = Math.max(0.45, Math.min(1.8, teamGoalRate / 1.45));
        const goalPoints =
          player.goalsPer90 * (expectedMinutes / 90) * teamStrength * rules.goal[player.position];
        const assistPoints =
          player.assistsPer90 * (expectedMinutes / 90) * teamStrength * rules.assist;
        const appearancePoints = clampProbability(player.playProbability) + sixtyProbability;
        const cleanSheetPoints =
          sixtyProbability * Math.exp(-opponentGoalRate) * rules.cleanSheet[player.position];
        const explained = appearancePoints + goalPoints + assistPoints + cleanSheetPoints;
        fixtureForecasts.push({
          runId: request.runId,
          fixtureKey: fixture.key,
          registrationKey: player.registrationKey,
          expectedPoints: round(fixtureExpectedPoints),
          distribution: [...distribution]
            .toSorted((left, right) => left[0] - right[0])
            .map(([points, probability]) => [points, Number(probability.toFixed(10))]),
          components: {
            appearance: round(appearancePoints),
            goals: round(goalPoints),
            assists: round(assistPoints),
            cleanSheet: round(cleanSheetPoints),
            bonus: round(Math.max(0, fixtureExpectedPoints - explained)),
            other: round(Math.min(0, fixtureExpectedPoints - explained)),
          },
          marketCoverage: clampProbability(fixture.marketCoverage),
        });
        gameweekMass = convolve(gameweekMass, distribution);
        usedFixtures.push(fixture);
      }
      horizonMass = convolve(horizonMass, gameweekMass);
      noHaulProbability *= 1 - probabilityAtLeast(gameweekMass, 10);
      gameweeks.push({
        gameweek,
        expectedPoints: round(expectedValue(gameweekMass)),
        p10: quantile(gameweekMass, 0.1),
        p50: quantile(gameweekMass, 0.5),
        p90: quantile(gameweekMass, 0.9),
        fixtures: fixtures.map((fixture) => fixture.key),
      });
    }
    const marketCoverage =
      usedFixtures.length === 0
        ? 0
        : usedFixtures.reduce((sum, fixture) => sum + fixture.marketCoverage, 0) /
          usedFixtures.length;
    return {
      ...player,
      expectedPoints: round(expectedValue(horizonMass)),
      p10: quantile(horizonMass, 0.1),
      p50: quantile(horizonMass, 0.5),
      p90: quantile(horizonMass, 0.9),
      haulProbability: round(1 - noHaulProbability),
      sixtyMinuteProbability: clampProbability(player.sixtyMinuteProbability),
      marketCoverage: round(marketCoverage),
      gameweeks,
      trail: [
        ...(request.playerTrails?.[player.registrationKey] ?? []).filter(
          (point) => point.observedAt < request.cutoffAt,
        ),
        { observedAt: request.cutoffAt, expectedPoints: round(expectedValue(horizonMass)) },
      ].slice(-12),
      provenance: {
        seasonKey: request.season.key,
        rulesetKey: rules.key,
        rulesetStatus: request.season.rulesetStatus,
        modelKey: request.modelKey,
        modelVersion: request.modelVersion,
        cutoffAt: request.cutoffAt,
        codeVersion: request.codeVersion,
        inputBatchIds: request.inputBatches.map((batch) => batch.id),
      },
    };
  });
  const ranks = new Map<string, number>();
  for (const position of ["GKP", "DEF", "MID", "FWD"] as const) {
    provisionalPlayers
      .filter((player) => player.position === position)
      .toSorted((a, b) => b.expectedPoints - a.expectedPoints)
      .forEach((player, index) => ranks.set(player.registrationKey, index + 1));
  }
  const snapshot: OpportunitySnapshot = {
    key: request.runId,
    datasetKey: request.datasetKey,
    season: request.season,
    observedAt: request.cutoffAt,
    fromGameweek: request.fromGameweek,
    horizon: request.horizon,
    sourceHealth: request.sourceHealth ?? [],
    players: provisionalPlayers.map((player) => ({
      registrationKey: player.registrationKey,
      playerKey: player.playerKey,
      name: player.name,
      team: player.team,
      position: player.position,
      registrationStatus: player.registrationStatus,
      price: player.price,
      ownership: player.ownership,
      expectedPoints: player.expectedPoints,
      p10: player.p10,
      p50: player.p50,
      p90: player.p90,
      haulProbability: player.haulProbability,
      sixtyMinuteProbability: player.sixtyMinuteProbability,
      marketCoverage: player.marketCoverage,
      sourceAgreement: clampProbability(player.sourceAgreement),
      forecastRankWithinPosition: ranks.get(player.registrationKey) ?? 1,
      gameweeks: player.gameweeks,
      trail: player.trail,
      provenance: player.provenance,
    })),
  };
  return {
    request,
    snapshot: opportunitySnapshotSchema.parse(snapshot),
    fixtureForecasts,
  };
}

export function createMarketXpForecastRunner(): MarketXpForecastRunner {
  return {
    run(request) {
      return executeForecastRun(request).snapshot;
    },
    runArtifact(request) {
      return executeForecastRun(request);
    },
  };
}
