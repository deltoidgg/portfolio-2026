import { z } from "zod";
import type { CaptureBatch, Observation } from "../contracts.ts";
import type { MarketSourceAdapter } from "../market-intelligence.ts";

const marketSchema = z
  .object({
    id: z.string().min(1),
    question: z.string().min(1),
    conditionId: z.string().optional(),
    outcomes: z.union([z.string(), z.array(z.string())]),
    outcomePrices: z.union([z.string(), z.array(z.union([z.string(), z.number()]))]),
    liquidityNum: z.number().nonnegative().optional(),
    volumeNum: z.number().nonnegative().optional(),
    endDate: z.string().optional(),
  })
  .passthrough();

const eventsSchema = z.array(
  z
    .object({
      id: z.string().min(1),
      title: z.string().min(1),
      slug: z.string().min(1),
      startDate: z.string().optional(),
      markets: z.array(marketSchema).default([]),
    })
    .passthrough(),
);

export type PolymarketFootballCaptureRequest = {
  seasonKey: string;
  capturedAt?: string;
  limit?: number;
};

function arrayValue(value: string | Array<string | number>): Array<string | number> {
  if (Array.isArray(value)) return value;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as Array<string | number>) : [];
  } catch {
    return [];
  }
}

function marketFamily(question: string): string {
  const normalized = question.toLocaleLowerCase();
  if (normalized.includes("score") || normalized.includes("goal")) return "goals";
  if (normalized.includes("assist")) return "assists";
  if (normalized.includes("clean sheet")) return "clean-sheet";
  if (normalized.includes("win")) return "match-winner";
  return "football-event";
}

export function createPolymarketFootballSource({
  fetcher = fetch,
}: {
  fetcher?: typeof fetch;
} = {}): MarketSourceAdapter<PolymarketFootballCaptureRequest> {
  return {
    key: "polymarket",
    async capture(request) {
      const capturedAt = request.capturedAt ?? new Date().toISOString();
      const endpoint = new URL("https://gamma-api.polymarket.com/events");
      endpoint.searchParams.set("active", "true");
      endpoint.searchParams.set("closed", "false");
      endpoint.searchParams.set("tag_slug", "soccer");
      endpoint.searchParams.set("limit", String(request.limit ?? 100));
      const response = await fetcher(endpoint, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Polymarket capture failed: ${response.status}`);
      const payload = await response.json();
      const events = eventsSchema.parse(payload);
      const observations: Observation[] = events.flatMap((event) =>
        event.markets.flatMap((market) => {
          const outcomes = arrayValue(market.outcomes).map(String);
          const prices = arrayValue(market.outcomePrices).map(Number);
          return outcomes.flatMap((outcome, index) => {
            const probability = prices[index];
            if (probability === undefined || !Number.isFinite(probability)) return [];
            return [
              {
                key: `polymarket:${market.id}:${outcome}:${capturedAt}`,
                entityKey: `polymarket:market:${market.id}`,
                metric: "probability",
                observedAt: capturedAt,
                numericValue: probability,
                unit: "probability",
                marketFamily: marketFamily(market.question),
                outcome,
                metadata: {
                  sourceEventId: event.id,
                  eventTitle: event.title,
                  question: market.question,
                  ...(market.conditionId ? { conditionId: market.conditionId } : {}),
                  ...(market.liquidityNum === undefined ? {} : { liquidity: market.liquidityNum }),
                  ...(market.volumeNum === undefined ? {} : { volume: market.volumeNum }),
                },
              },
            ];
          });
        }),
      );
      return {
        id: `polymarket:football:${capturedAt}`,
        source: {
          key: "polymarket",
          label: "Polymarket",
          kind: "prediction-market",
          metadata: { accessMode: "public-read-only", api: "gamma" },
        },
        capturedAt,
        fixtures: [],
        rawSnapshots: [
          {
            key: `polymarket:football:${capturedAt}`,
            endpoint: endpoint.toString(),
            observedAt: capturedAt,
            payload,
            statusCode: response.status,
          },
        ],
        observations,
        forecasts: [],
        annotations: [],
        entities: events.flatMap((event) =>
          event.markets.map((market) => ({
            key: `polymarket:market:${market.id}`,
            type: "market" as const,
            name: market.question,
            metadata: { sourceEventId: event.id, eventTitle: event.title },
          })),
        ),
        metadata: {
          datasetKey: "live",
          seasonKey: request.seasonKey,
          reconciliationStatus: "unmatched",
          eventCount: events.length,
          marketCount: events.reduce((sum, event) => sum + event.markets.length, 0),
        },
      } satisfies CaptureBatch;
    },
  };
}
