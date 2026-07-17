import { describe, expect, test } from "vite-plus/test";
import { createPolymarketFootballSource } from "market-intelligence/sources";

describe("Polymarket football source", () => {
  test("captures public read-only outcome probabilities without requiring fixture guesses", async () => {
    const batch = await createPolymarketFootballSource({
      fetcher: async () =>
        Response.json([
          {
            id: "event-1",
            title: "Arsenal vs Coventry City",
            slug: "arsenal-coventry",
            markets: [
              {
                id: "market-1",
                question: "Will Arsenal win?",
                conditionId: "0xabc",
                outcomes: '["Yes", "No"]',
                outcomePrices: '["0.71", "0.29"]',
                liquidityNum: 12500,
                volumeNum: 84000,
              },
            ],
          },
        ]),
    }).capture({
      seasonKey: "epl:2026-27",
      capturedAt: "2026-08-20T12:00:00.000Z",
    });

    expect(batch.fixtures).toEqual([]);
    expect(batch.observations).toEqual([
      expect.objectContaining({
        entityKey: "polymarket:market:market-1",
        outcome: "Yes",
        numericValue: 0.71,
      }),
      expect.objectContaining({ outcome: "No", numericValue: 0.29 }),
    ]);
    expect(batch.metadata).toEqual(expect.objectContaining({ reconciliationStatus: "unmatched" }));
  });
});
