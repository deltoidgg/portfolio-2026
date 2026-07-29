import { describe, expect, it } from "vitest";
import type { CaptureBatch, Observation } from "../src/contracts.ts";
import {
  projectFplCurrentState,
  projectFplPlayerPriors,
  projectOddsConsensus,
} from "../src/hot-cold/projectors.ts";

const observedAt = "2026-07-29T10:00:00.000Z";
const seasonKey = "epl:2026-27";

function batch(sourceKey: string, observations: Observation[]): CaptureBatch {
  return {
    id: `${sourceKey}:${observedAt}`,
    source: { key: sourceKey, label: sourceKey, kind: "fpl" },
    capturedAt: observedAt,
    fixtures: [],
    rawSnapshots: [],
    observations,
    forecasts: [],
    annotations: [],
  };
}

function numberObservation(
  metric: string,
  numericValue: number,
  metadata: Observation["metadata"] = {},
): Observation {
  return {
    key: `${metric}:${numericValue}`,
    entityKey: "epl:person:fpl-code:100",
    metric,
    observedAt,
    numericValue,
    metadata,
  };
}

describe("compact hot-state projectors", () => {
  it("whitelists model-ready FPL current state and ignores transfer telemetry semantically", async () => {
    const metadata = { registrationKey: `${seasonKey}:registration:fpl-1` };
    const base = batch("fpl", [
      numberObservation("availability_probability", 0.75, metadata),
      numberObservation("minutes", 900, metadata),
      numberObservation("starts", 10, metadata),
      numberObservation("price", 7.5, metadata),
      numberObservation("ownership", 12.3, metadata),
      numberObservation("expected_goals", 6.1, metadata),
      numberObservation("expected_assists_per_90", 0.22, metadata),
      numberObservation("expected_points_next", 5.8, metadata),
      numberObservation("transfers_in_event", 123_456, metadata),
    ]);
    const transferOnlyChange = {
      ...base,
      observations: base.observations.map((row) =>
        row.metric === "transfers_in_event" ? { ...row, numericValue: 999_999 } : row,
      ),
    };

    const first = await projectFplCurrentState(base, seasonKey);
    const second = await projectFplCurrentState(transferOnlyChange, seasonKey);

    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({
      registrationKey: `${seasonKey}:registration:fpl-1`,
      seasonKey,
      availabilityProbability: 0.75,
      minutes: 900,
      starts: 10,
      price: 7.5,
      ownership: 12.3,
      expectedGoals: 6.1,
      expectedAssistsPer90: 0.22,
      expectedPointsNext: 5.8,
    });
    expect(first[0]).not.toHaveProperty("transfersInEvent");
    expect(first[0]?.rowHash).toBe(second[0]?.rowHash);
  });

  it("projects three-season weighted FPL priors with the legacy weights", async () => {
    const registrationKey = `${seasonKey}:registration:fpl-1`;
    const historical = (
      sourceSeason: string,
      metric: string,
      numericValue: number,
    ): Observation => ({
      ...numberObservation(`historical_${metric}`, numericValue, {
        registrationKey,
        sourceSeason,
      }),
      key: `${sourceSeason}:${metric}`,
    });
    const source = batch("fpl-element-summary", [
      historical("2025/26", "minutes", 900),
      historical("2025/26", "expected_goals", 10),
      historical("2025/26", "expected_assists", 5),
      historical("2024/25", "minutes", 800),
      historical("2024/25", "goals_scored", 6),
      historical("2024/25", "assists", 4),
      historical("2023/24", "minutes", 700),
      historical("2023/24", "goals_scored", 4),
      historical("2023/24", "assists", 3),
    ]);

    const [prior] = await projectFplPlayerPriors(source, seasonKey);

    expect(prior).toMatchObject({
      registrationKey,
      weightedMinutes: 1700,
      goalsPer90: 0.820588,
      assistsPer90: 0.465882,
      calculationVersion: "fpl-prior-v1",
      sourceSeasons: [
        { season: "2025/26", weight: 1 },
        { season: "2024/25", weight: 0.65 },
        { season: "2023/24", weight: 0.4 },
      ],
    });
  });

  it("stores one odds consensus per fixture instead of individual quotes", async () => {
    const quote = (
      marketFamily: "h2h" | "totals",
      outcome: string,
      odds: number,
      point?: number,
    ): Observation => ({
      key: `${marketFamily}:${outcome}`,
      fixtureKey: `${seasonKey}:fixture:1`,
      entityKey: `${seasonKey}:fixture:1:market`,
      metric: "decimal_odds",
      observedAt,
      numericValue: odds,
      marketFamily,
      outcome,
      metadata: {
        bookmakerKey: "book-a",
        ...(point === undefined ? {} : { point }),
      },
    });
    const source = batch("odds-api", [
      quote("h2h", "Arsenal", 2),
      quote("h2h", "Draw", 3),
      quote("h2h", "Liverpool", 4),
      quote("totals", "Over", 1.9, 2.5),
      quote("totals", "Under", 1.9, 2.5),
    ]);
    source.fixtures = [
      {
        key: `${seasonKey}:fixture:1`,
        competition: "EPL",
        season: "2026/27",
        gameweek: 1,
        homeTeam: "ARS",
        awayTeam: "LIV",
        kickoffAt: "2026-08-21T19:00:00.000Z",
        deadlineAt: "2026-08-21T17:30:00.000Z",
      },
    ];

    const [consensus] = await projectOddsConsensus(source, seasonKey);

    expect(consensus).toMatchObject({
      sourceKey: "odds-api",
      fixtureKey: `${seasonKey}:fixture:1`,
      homeGoalRate: 1.667,
      awayGoalRate: 0.833,
      marketCoverage: 1,
      sourceAgreement: 0.7,
      bookmakerCount: 1,
      projectionVersion: "odds-consensus-v1",
    });
  });
});
