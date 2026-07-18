import { describe, expect, test } from "vite-plus/test";
import {
  createMemoryResultStore,
  evaluateForecasts,
  type EvaluationForecast,
  type PlayerGameweekResult,
} from "market-intelligence";

const result: PlayerGameweekResult = {
  key: "result:saka:gw1",
  seasonKey: "epl:2026-27",
  registrationKey: "registration:saka",
  gameweek: 1,
  status: "final",
  observedAt: "2026-08-23T20:00:00.000Z",
  totalPoints: 8,
  components: { appearance: 2, goals: 5, assists: 0, cleanSheet: 1, bonus: 0, other: 0 },
};

const forecasts: EvaluationForecast[] = [
  {
    runId: "old",
    seasonKey: "epl:2026-27",
    registrationKey: "registration:saka",
    gameweek: 1,
    cutoffAt: "2026-08-21T10:00:00.000Z",
    deadlineAt: "2026-08-21T17:30:00.000Z",
    expectedPoints: 5,
    p10: 1,
    p90: 12,
    haulProbability: 0.28,
  },
  {
    runId: "latest-before-deadline",
    seasonKey: "epl:2026-27",
    registrationKey: "registration:saka",
    gameweek: 1,
    cutoffAt: "2026-08-21T17:25:00.000Z",
    deadlineAt: "2026-08-21T17:30:00.000Z",
    expectedPoints: 6,
    p10: 2,
    p90: 13,
    haulProbability: 0.35,
  },
  {
    runId: "leaky-post-deadline",
    seasonKey: "epl:2026-27",
    registrationKey: "registration:saka",
    gameweek: 1,
    cutoffAt: "2026-08-22T12:00:00.000Z",
    deadlineAt: "2026-08-21T17:30:00.000Z",
    expectedPoints: 8,
    p10: 5,
    p90: 10,
    haulProbability: 0.5,
  },
];

describe("forecast results and evaluation", () => {
  test("updates provisional outcomes to final without duplicating the result", async () => {
    const store = createMemoryResultStore();
    await store.save([{ ...result, status: "provisional", totalPoints: 7 }, result]);

    expect(await store.list("epl:2026-27", 1)).toEqual([result]);
  });

  test("evaluates the latest forecast before the deadline and excludes later evidence", () => {
    const evaluation = evaluateForecasts({ forecasts, results: [result] });

    expect(evaluation.rows).toEqual([
      expect.objectContaining({ runId: "latest-before-deadline", error: -2 }),
    ]);
    expect(evaluation.metrics).toMatchObject({
      count: 1,
      mae: 2,
      rmse: 2,
      intervalCoverage: 1,
    });
  });
});
