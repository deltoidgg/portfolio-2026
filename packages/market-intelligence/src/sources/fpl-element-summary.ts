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
  history_past: z.array(z.unknown()).default([]),
});

export type FplElementSummaryCaptureRequest = {
  seasonKey: string;
  season: string;
  playerIds: number[];
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

export function createFplElementSummarySource({
  fetcher = fetch,
}: {
  fetcher?: typeof fetch;
} = {}): MarketSourceAdapter<FplElementSummaryCaptureRequest> {
  return {
    key: "fpl-element-summary",
    async capture(request) {
      const capturedAt = request.capturedAt ?? new Date().toISOString();
      const rawSnapshots: RawSnapshot[] = [];
      const observations: Observation[] = [];
      for (const playerId of [...new Set(request.playerIds)].toSorted(
        (left, right) => left - right,
      )) {
        const endpoint = `https://fantasy.premierleague.com/api/element-summary/${playerId}/`;
        const response = await fetcher(endpoint, { headers: { Accept: "application/json" } });
        if (!response.ok)
          throw new Error(`FPL element ${playerId} capture failed: ${response.status}`);
        const payload = await response.json();
        const summary = summarySchema.parse(payload);
        const entityKey = `${request.seasonKey}:registration:fpl-${playerId}`;
        rawSnapshots.push({
          key: `fpl-element-summary:${playerId}:${capturedAt}`,
          endpoint,
          observedAt: capturedAt,
          payload,
          statusCode: response.status,
        });
        for (const history of summary.history) {
          for (const [metric, rawValue] of Object.entries(history)) {
            if (metric === "round" || metric === "fixture") continue;
            const numericValue = finiteValue(rawValue);
            if (numericValue === undefined) continue;
            observations.push({
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
          observations.push({
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
      }
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
          playerCount: request.playerIds.length,
        },
      } satisfies CaptureBatch;
    },
  };
}
