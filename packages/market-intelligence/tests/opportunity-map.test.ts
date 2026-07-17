import { describe, expect, test } from "vite-plus/test";
import {
  createMarketIntelligence,
  createMemoryStore,
  type OpportunitySnapshot,
} from "market-intelligence";

const provenance = {
  seasonKey: "epl:2026-27",
  rulesetKey: "fpl:2026-27:provisional-v1",
  rulesetStatus: "provisional" as const,
  modelKey: "market-xp",
  modelVersion: "2.0.0",
  cutoffAt: "2026-07-17T12:00:00.000Z",
  codeVersion: "test-sha",
  inputBatchIds: ["fpl:archive", "odds:gw1"],
};

function snapshot(
  observedAt: string,
  price: OpportunitySnapshot["players"][number]["price"],
  ownership: OpportunitySnapshot["players"][number]["ownership"],
): OpportunitySnapshot {
  return {
    key: `opportunity:${observedAt}`,
    datasetKey: "live",
    season: {
      key: "epl:2026-27",
      label: "2026/27",
      lifecycle: "prelaunch",
      priceState: price.status === "official" ? "official" : "unpublished",
      rulesetKey: provenance.rulesetKey,
      rulesetStatus: "provisional",
    },
    observedAt,
    fromGameweek: 1,
    horizon: 5,
    sourceHealth: [
      {
        sourceKey: "fpl",
        label: "Fantasy Premier League",
        status: "fresh",
        lastCapturedAt: observedAt,
        coverage: 1,
      },
    ],
    players: [
      {
        registrationKey: "epl:2026-27:registration:fpl-7",
        playerKey: "epl:person:opta:p223340",
        name: "Bukayo Saka",
        team: "ARS",
        position: "MID",
        registrationStatus: "provisional",
        price,
        ownership,
        expectedPoints: 29.4,
        p10: 12,
        p50: 27,
        p90: 51,
        haulProbability: 0.62,
        sixtyMinuteProbability: 0.83,
        marketCoverage: 0.75,
        sourceAgreement: 0.8,
        forecastRankWithinPosition: 1,
        gameweeks: [
          {
            gameweek: 1,
            expectedPoints: 6.4,
            p10: 2,
            p50: 5,
            p90: 13,
            fixtures: ["epl:2026-27:fixture:ars-liv"],
          },
        ],
        trail: [{ observedAt, expectedPoints: 29.4 }],
        provenance: { ...provenance, cutoffAt: observedAt },
      },
    ],
  };
}

describe("Opportunity Map read model", () => {
  test("keeps the same contract while official price and ownership unlock derived metrics", async () => {
    const store = createMemoryStore();
    const intelligence = createMarketIntelligence({ store });
    const prelaunch = snapshot(
      "2026-07-17T12:00:00.000Z",
      { status: "unpublished" },
      { status: "unavailable" },
    );
    const official = snapshot(
      "2026-08-01T12:00:00.000Z",
      { status: "official", value: 10, observedAt: "2026-08-01T12:00:00.000Z" },
      {
        status: "official",
        value: 31.2,
        rankWithinPosition: 8,
        observedAt: "2026-08-01T12:00:00.000Z",
      },
    );

    await intelligence.ingestOpportunitySnapshot(prelaunch);
    await intelligence.ingestOpportunitySnapshot(official);

    const earlier = await intelligence.getOpportunityMap({
      seasonKey: "epl:2026-27",
      fromGameweek: 1,
      horizon: 5,
      snapshotAt: "2026-07-31T23:59:59.000Z",
    });
    const latest = await intelligence.getOpportunityMap({
      seasonKey: "epl:2026-27",
      fromGameweek: 1,
      horizon: 5,
    });

    expect(earlier.players[0]).toMatchObject({
      price: { status: "unpublished" },
      ownership: { status: "unavailable" },
    });
    expect(earlier.players[0]?.expectedPointsPerMillion).toBeUndefined();
    expect(latest.players[0]).toMatchObject({
      price: { status: "official", value: 10 },
      expectedPointsPerMillion: 2.94,
      ownershipRankGap: 7,
    });
  });
});
