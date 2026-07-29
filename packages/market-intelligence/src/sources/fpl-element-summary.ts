import { z } from "zod";
import type { CaptureBatch, Observation, RawSnapshot } from "../contracts.ts";
import type { MarketSourceAdapter } from "../market-intelligence.ts";

const numericString = z.union([z.number(), z.string()]);
const historySchema = z
  .object({
    round: z.number().int().positive(),
    fixture: z.number().int().positive(),
    minutes: z.number().int().nonnegative(),
    total_points: z.number().int(),
  })
  .catchall(numericString.nullable());
const pastHistorySchema = z
  .object({
    season_name: z.string().min(1),
  })
  .catchall(numericString.nullable());
const summarySchema = z.object({
  history: z.array(historySchema),
  fixtures: z.array(
    z
      .object({
        id: z.number().int().positive(),
        event: z.number().int().positive().nullable(),
        is_home: z.boolean(),
        kickoff_time: z.string().nullable(),
      })
      .passthrough(),
  ),
  history_past: z.array(pastHistorySchema).default([]),
});

export type FplElementSummaryCaptureRequest = {
  seasonKey: string;
  season: string;
  playerIds: number[];
  entityKeys?: Record<number, string>;
  capturedAt?: string;
};

function finiteValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return undefined;
}

async function mapConcurrent<Input, Output>(
  values: Input[],
  concurrency: number,
  operation: (value: Input) => Promise<Output>,
): Promise<Output[]> {
  const results = Array.from<Output>({ length: values.length });
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, async () => {
      for (;;) {
        const index = next;
        next += 1;
        if (index >= values.length) return;
        results[index] = await operation(values[index]!);
      }
    }),
  );
  return results;
}

export function createFplElementSummarySource({
  fetcher = fetch,
}: {
  fetcher?: typeof fetch;
} = {}): MarketSourceAdapter<FplElementSummaryCaptureRequest> {
  return {
    key: "fpl-element-summary",
    async capture(request) {
      const capturedAt = request.capturedAt ?? new Date().toISOString();
      const playerIds = [...new Set(request.playerIds)].toSorted((left, right) => left - right);
      const captures = await mapConcurrent(playerIds, 12, async (playerId) => {
        const endpoint = `https://fantasy.premierleague.com/api/element-summary/${playerId}/`;
        const response = await fetcher(endpoint, { headers: { Accept: "application/json" } });
        if (!response.ok)
          throw new Error(`FPL element ${playerId} capture failed: ${response.status}`);
        const rawBody = await response.text();
        const payload = JSON.parse(rawBody);
        const summary = summarySchema.parse(payload);
        const entityKey =
          request.entityKeys?.[playerId] ?? `${request.seasonKey}:registration:fpl-${playerId}`;
        const playerObservations: Observation[] = [];
        for (const history of summary.history) {
          for (const [metric, rawValue] of Object.entries(history)) {
            if (metric === "round" || metric === "fixture") continue;
            const numericValue = finiteValue(rawValue);
            if (numericValue === undefined) continue;
            playerObservations.push({
              key: `${entityKey}:gw${history.round}:fixture${history.fixture}:${metric}:${capturedAt}`,
              entityKey,
              metric: `history_${metric}`,
              observedAt: capturedAt,
              numericValue,
              metadata: { gameweek: history.round, fplFixtureId: history.fixture },
            });
          }
        }
        for (const fixture of summary.fixtures) {
          playerObservations.push({
            key: `${entityKey}:upcoming:${fixture.id}:${capturedAt}`,
            entityKey,
            metric: "upcoming_fixture",
            observedAt: capturedAt,
            stringValue: String(fixture.id),
            metadata: {
              fplFixtureId: fixture.id,
              ...(fixture.event === null ? {} : { gameweek: fixture.event }),
              isHome: fixture.is_home,
              ...(fixture.kickoff_time === null ? {} : { kickoffAt: fixture.kickoff_time }),
            },
          });
        }
        for (const history of summary.history_past) {
          const sourceSeason = history.season_name;
          const seasonSlug = sourceSeason.replaceAll(/[^0-9a-z]+/gi, "-").toLocaleLowerCase();
          playerObservations.push({
            key: `${entityKey}:historical:${seasonSlug}:season:${capturedAt}`,
            entityKey,
            metric: "historical_season",
            observedAt: capturedAt,
            stringValue: sourceSeason,
            metadata: { sourceSeason },
          });
          for (const [metric, rawValue] of Object.entries(history)) {
            if (metric === "season_name" || metric === "element_code") continue;
            const numericValue = finiteValue(rawValue);
            if (numericValue === undefined) continue;
            playerObservations.push({
              key: `${entityKey}:historical:${seasonSlug}:${metric}:${capturedAt}`,
              entityKey,
              metric: `historical_${metric}`,
              observedAt: capturedAt,
              numericValue,
              metadata: { sourceSeason },
            });
          }
        }
        return {
          playerId,
          endpoint,
          payload,
          rawBody,
          statusCode: response.status,
          observations: playerObservations,
        };
      });
      const rawSnapshots: RawSnapshot[] = captures.map((capture) => ({
        key: `fpl-element-summary:${capture.playerId}:${capturedAt}`,
        endpoint: capture.endpoint,
        observedAt: capturedAt,
        payload: capture.payload,
        rawBody: capture.rawBody,
        statusCode: capture.statusCode,
      }));
      const observations = captures.flatMap((capture) => capture.observations);
      return {
        id: `fpl-element-summary:${request.seasonKey}:${capturedAt}`,
        source: { key: "fpl-element-summary", label: "FPL player history", kind: "fpl" },
        capturedAt,
        fixtures: [],
        rawSnapshots,
        observations,
        forecasts: [],
        annotations: [],
        metadata: {
          datasetKey: "live",
          seasonKey: request.seasonKey,
          season: request.season,
          playerCount: playerIds.length,
        },
      } satisfies CaptureBatch;
    },
  };
}
