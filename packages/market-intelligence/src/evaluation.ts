import type { ForecastComponents } from "./contracts.ts";

export type PlayerGameweekResult = {
  key: string;
  seasonKey: string;
  registrationKey: string;
  gameweek: number;
  status: "provisional" | "final";
  observedAt: string;
  totalPoints: number;
  components: Required<ForecastComponents>;
};

export interface ResultStore {
  save(results: PlayerGameweekResult[]): Promise<void>;
  list(seasonKey: string, gameweek: number): Promise<PlayerGameweekResult[]>;
}

export function createMemoryResultStore(): ResultStore {
  const results = new Map<string, PlayerGameweekResult>();
  return {
    async save(input) {
      for (const result of input) {
        const current = results.get(result.key);
        if (!current || current.status === "provisional" || result.status === "final") {
          results.set(result.key, structuredClone(result));
        }
      }
    },
    async list(seasonKey, gameweek) {
      return [...results.values()]
        .filter((result) => result.seasonKey === seasonKey && result.gameweek === gameweek)
        .toSorted((a, b) => a.registrationKey.localeCompare(b.registrationKey))
        .map((result) => structuredClone(result));
    },
  };
}

export type EvaluationForecast = {
  runId: string;
  seasonKey: string;
  registrationKey: string;
  gameweek: number;
  cutoffAt: string;
  deadlineAt: string;
  expectedPoints: number;
  p10: number;
  p90: number;
  haulProbability: number;
};

export type EvaluationRow = {
  runId: string;
  seasonKey: string;
  registrationKey: string;
  gameweek: number;
  cutoffAt: string;
  expectedPoints: number;
  actualPoints: number;
  error: number;
  absoluteError: number;
  squaredError: number;
  intervalCovered: boolean;
  haulProbability: number;
  actualHaul: boolean;
};

export type EvaluationResult = {
  rows: EvaluationRow[];
  metrics: {
    count: number;
    mae: number;
    rmse: number;
    intervalCoverage: number;
    haulBrier: number;
  };
};

function round(value: number): number {
  return Number(value.toFixed(4));
}

export function evaluateForecasts({
  forecasts,
  results,
}: {
  forecasts: EvaluationForecast[];
  results: PlayerGameweekResult[];
}): EvaluationResult {
  const rows: EvaluationRow[] = [];
  for (const result of results.filter((candidate) => candidate.status === "final")) {
    const forecast = forecasts
      .filter(
        (candidate) =>
          candidate.seasonKey === result.seasonKey &&
          candidate.registrationKey === result.registrationKey &&
          candidate.gameweek === result.gameweek &&
          candidate.cutoffAt <= candidate.deadlineAt,
      )
      .toSorted((a, b) => a.cutoffAt.localeCompare(b.cutoffAt))
      .at(-1);
    if (!forecast) continue;
    const error = forecast.expectedPoints - result.totalPoints;
    rows.push({
      runId: forecast.runId,
      seasonKey: result.seasonKey,
      registrationKey: result.registrationKey,
      gameweek: result.gameweek,
      cutoffAt: forecast.cutoffAt,
      expectedPoints: forecast.expectedPoints,
      actualPoints: result.totalPoints,
      error,
      absoluteError: Math.abs(error),
      squaredError: error ** 2,
      intervalCovered: result.totalPoints >= forecast.p10 && result.totalPoints <= forecast.p90,
      haulProbability: forecast.haulProbability,
      actualHaul: result.totalPoints >= 10,
    });
  }
  if (rows.length === 0) {
    return {
      rows,
      metrics: { count: 0, mae: 0, rmse: 0, intervalCoverage: 0, haulBrier: 0 },
    };
  }
  const mean = (selector: (row: EvaluationRow) => number) =>
    rows.reduce((total, row) => total + selector(row), 0) / rows.length;
  return {
    rows,
    metrics: {
      count: rows.length,
      mae: round(mean((row) => row.absoluteError)),
      rmse: round(Math.sqrt(mean((row) => row.squaredError))),
      intervalCoverage: round(mean((row) => (row.intervalCovered ? 1 : 0))),
      haulBrier: round(mean((row) => (row.haulProbability - (row.actualHaul ? 1 : 0)) ** 2)),
    },
  };
}
