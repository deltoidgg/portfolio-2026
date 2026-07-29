import { describe, expect, test } from "vite-plus/test";
import {
  createOpportunityReplayArtifact,
  createPublishedOpportunityBundle,
  publishedOpportunityBundleSchema,
  selectOpportunityMap,
  type OpportunitySnapshot,
} from "market-intelligence";
import { createDemoOpportunitySnapshot } from "market-intelligence/demo";

function snapshot(horizon: 1 | 3 | 5, expectedPoints: number): OpportunitySnapshot {
  const demo = createDemoOpportunitySnapshot();
  return {
    ...demo,
    key: `run:h${horizon}`,
    horizon,
    players: demo.players.map((player) => ({
      ...player,
      expectedPoints,
      fpl: {
        ...player.fpl,
        pricePressureStatus: "unavailable",
        transfersIn: 999,
      },
    })),
  };
}

describe("published opportunity artifacts", () => {
  test("stores common player state once and projects the selected horizon", () => {
    const snapshots = {
      1: snapshot(1, 4),
      3: snapshot(3, 11),
      5: snapshot(5, 17),
    } as const;

    const bundle = createPublishedOpportunityBundle({
      publicationId: "publication-1",
      runId: "run-1",
      snapshots,
    });
    const parsed = publishedOpportunityBundleSchema.parse(bundle);
    const selected = selectOpportunityMap(parsed, 3);

    expect(parsed.availableHorizons).toEqual([1, 3, 5]);
    expect(parsed.players[0]?.horizons["3"].expectedPoints).toBe(11);
    expect(selected.horizon).toBe(3);
    expect(selected.players[0]?.expectedPoints).toBe(11);
    expect(selected.players[0]?.trail).toEqual([]);
    expect(selected.players[0]?.fpl).not.toHaveProperty("transfersIn");
  });

  test("keeps replay outside the serving bundle and caps it at twelve points", () => {
    const snapshots = {
      1: snapshot(1, 4),
      3: snapshot(3, 11),
      5: snapshot(5, 17),
    } as const;
    snapshots[3].players[0]!.trail = Array.from({ length: 15 }, (_, index) => ({
      observedAt: new Date(Date.UTC(2026, 6, index + 1)).toISOString(),
      expectedPoints: index,
    }));

    const bundle = createPublishedOpportunityBundle({
      publicationId: "publication-1",
      runId: "run-1",
      snapshots,
    });
    const replay = createOpportunityReplayArtifact({
      publicationId: bundle.publicationId,
      snapshots,
    });
    const selected = selectOpportunityMap(bundle, 3, replay);

    expect(selected.players[0]?.trail).toHaveLength(12);
    expect(selected.players[0]?.trail[0]?.expectedPoints).toBe(3);
    expect(selected.players[0]?.trail.at(-1)?.expectedPoints).toBe(14);
  });
});
