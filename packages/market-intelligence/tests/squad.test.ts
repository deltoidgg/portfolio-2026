import { describe, expect, test } from "vite-plus/test";
import {
  buildSuggestedSquad,
  createEmptySquad,
  squadRulesFromSeason,
  validateSquad,
  type OpportunityMap,
} from "market-intelligence";

const positions = ["GKP", "DEF", "MID", "FWD"] as const;
const required = { GKP: 8, DEF: 18, MID: 18, FWD: 12 } as const;

function player(position: (typeof positions)[number], index: number) {
  const priceBase = { GKP: 4, DEF: 4, MID: 4.5, FWD: 4.5 }[position];
  return {
    registrationKey: `registration:${position}:${index}`,
    playerKey: `player:${position}:${index}`,
    name: `${position} ${index}`,
    team: `T${index % 10}`,
    position,
    registrationStatus: "active" as const,
    price: {
      status: "official" as const,
      value: priceBase + (index % 5) * 0.5,
      observedAt: "2026-07-26T20:00:00.000Z",
    },
    ownership: {
      status: "official" as const,
      value: index,
      rankWithinPosition: index + 1,
      observedAt: "2026-07-26T20:00:00.000Z",
    },
    expectedPoints: 4 + index / 3,
    p10: 1,
    p50: 4,
    p90: 10,
    haulProbability: 0.2,
    sixtyMinuteProbability: 0.8,
    marketCoverage: 0.5,
    sourceAgreement: 0.7,
    forecastRankWithinPosition: index + 1,
    gameweeks: [],
    trail: [],
    provenance: {
      seasonKey: "epl:2026-27",
      rulesetKey: "fpl:2026-27:official-v1",
      rulesetStatus: "official" as const,
      modelKey: "test",
      modelVersion: "1",
      cutoffAt: "2026-07-26T20:00:00.000Z",
      codeVersion: "test",
      inputBatchIds: ["fpl"],
    },
  };
}

const players = positions.flatMap((position) =>
  Array.from({ length: required[position] }, (_, index) => player(position, index)),
) satisfies OpportunityMap["players"];

describe("squad lab domain", () => {
  test("creates a valid suggested squad under the official constraints", () => {
    const squad = buildSuggestedSquad(players, "epl:2026-27", 3);
    const result = validateSquad(squad, players);

    expect(squad.picks).toHaveLength(15);
    expect(result).toMatchObject({
      valid: true,
      positionCounts: { GKP: 2, DEF: 5, MID: 5, FWD: 3 },
    });
    expect(result.spent).toBeLessThanOrEqual(100);
    expect(squad.picks.filter((pick) => pick.role === "starter")).toHaveLength(11);
    expect(squad.picks.filter((pick) => pick.captain)).toHaveLength(1);
    expect(Math.max(...Object.values(result.clubCounts))).toBeLessThanOrEqual(3);
  });

  test("reports partial squads and exact missing slots", () => {
    const result = validateSquad(createEmptySquad("epl:2026-27"), players);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Select 15 more players.");
    expect(result.warnings).toContain("Partial squads are saved locally while you build.");
  });

  test("uses the checksummed season rules supplied by FPL game_config", () => {
    const rules = squadRulesFromSeason({
      source: "fpl-game-config",
      checksum: "test",
      observedAt: "2026-07-26T20:00:00.000Z",
      budget: 101,
      squadSize: 15,
      startingSize: 11,
      clubLimit: 3,
      positionRules: {
        GKP: { squad: 2, minStart: 1, maxStart: 1 },
        DEF: { squad: 5, minStart: 3, maxStart: 5 },
        MID: { squad: 5, minStart: 2, maxStart: 5 },
        FWD: { squad: 3, minStart: 1, maxStart: 3 },
      },
    });
    const squad = buildSuggestedSquad(players, "epl:2026-27", 3, rules);
    expect(squad.budget).toBe(101);
    expect(validateSquad(squad, players, rules).valid).toBe(true);
  });
});
