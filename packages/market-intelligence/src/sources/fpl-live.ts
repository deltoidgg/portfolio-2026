import { z } from "zod";
import type { CaptureBatch, Observation } from "../contracts.ts";
import type { PlayerGameweekResult } from "../evaluation.ts";
import type { MarketSourceAdapter } from "../market-intelligence.ts";
import type { FplPosition } from "../model/v2.ts";

const liveStatsSchema = z
  .object({
    minutes: z.number().int().nonnegative(),
    total_points: z.number().int(),
    goals_scored: z.number().int().nonnegative(),
    assists: z.number().int().nonnegative(),
    clean_sheets: z.number().int().nonnegative(),
    goals_conceded: z.number().int().nonnegative(),
    own_goals: z.number().int().nonnegative(),
    penalties_saved: z.number().int().nonnegative(),
    penalties_missed: z.number().int().nonnegative(),
    yellow_cards: z.number().int().nonnegative(),
    red_cards: z.number().int().nonnegative(),
    saves: z.number().int().nonnegative(),
    bonus: z.number().int().nonnegative(),
    bps: z.number().int(),
    defensive_contribution: z.number().int().nonnegative().optional(),
  })
  .passthrough();

const liveResponseSchema = z.object({
  elements: z.array(
    z.object({
      id: z.number().int().positive(),
      stats: liveStatsSchema,
      explain: z.array(z.unknown()).default([]),
    }),
  ),
});

export type FplLiveCaptureRequest = {
  seasonKey: string;
  season: string;
  gameweek: number;
  capturedAt?: string;
};

export function createFplLiveSource({
  fetcher = fetch,
}: {
  fetcher?: typeof fetch;
} = {}): MarketSourceAdapter<FplLiveCaptureRequest> {
  return {
    key: "fpl-live",
    async capture(request) {
      const capturedAt = request.capturedAt ?? new Date().toISOString();
      const endpoint = `https://fantasy.premierleague.com/api/event/${request.gameweek}/live/`;
      const response = await fetcher(endpoint, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`FPL live capture failed: ${response.status}`);
      const payload = await response.json();
      const live = liveResponseSchema.parse(payload);
      const observations: Observation[] = live.elements.flatMap((element) => {
        const entityKey = `${request.seasonKey}:registration:fpl-${element.id}`;
        return Object.entries(element.stats).flatMap(([metric, value]) =>
          typeof value === "number"
            ? [
                {
                  key: `${entityKey}:${request.gameweek}:${metric}:${capturedAt}`,
                  entityKey,
                  metric,
                  observedAt: capturedAt,
                  numericValue: value,
                  metadata: { gameweek: request.gameweek, fplElementId: element.id },
                },
              ]
            : [],
        );
      });
      return {
        id: `fpl-live:${request.seasonKey}:gw${request.gameweek}:${capturedAt}`,
        source: { key: "fpl-live", label: "FPL live", kind: "fpl" },
        capturedAt,
        fixtures: [],
        rawSnapshots: [
          {
            key: `fpl-live:${request.gameweek}:${capturedAt}`,
            endpoint,
            observedAt: capturedAt,
            payload,
            statusCode: response.status,
          },
        ],
        observations,
        forecasts: [],
        annotations: [],
        metadata: {
          datasetKey: "live",
          seasonKey: request.seasonKey,
          season: request.season,
          gameweek: request.gameweek,
        },
      } satisfies CaptureBatch;
    },
  };
}

export function extractFplGameweekResults(
  batch: CaptureBatch,
  {
    seasonKey,
    gameweek,
    status,
    positions = {},
  }: {
    seasonKey: string;
    gameweek: number;
    status: PlayerGameweekResult["status"];
    positions?: Record<string, FplPosition>;
  },
): PlayerGameweekResult[] {
  const byRegistration = new Map<string, Map<string, number>>();
  for (const observation of batch.observations) {
    if (observation.numericValue === undefined) continue;
    const values = byRegistration.get(observation.entityKey) ?? new Map<string, number>();
    values.set(observation.metric, observation.numericValue);
    byRegistration.set(observation.entityKey, values);
  }
  return [...byRegistration]
    .filter(([, values]) => values.has("total_points"))
    .map(([registrationKey, values]) => {
      const totalPoints = values.get("total_points") ?? 0;
      const minutes = values.get("minutes") ?? 0;
      const position = positions[registrationKey];
      const appearance = minutes >= 60 ? 2 : minutes > 0 ? 1 : 0;
      const goals =
        (values.get("goals_scored") ?? 0) *
        (position ? { GKP: 10, DEF: 6, MID: 5, FWD: 4 }[position] : 0);
      const assists = (values.get("assists") ?? 0) * 3;
      const cleanSheet =
        minutes >= 60 && (values.get("clean_sheets") ?? 0) > 0 && position
          ? { GKP: 4, DEF: 4, MID: 1, FWD: 0 }[position]
          : 0;
      const bonus = values.get("bonus") ?? 0;
      return {
        key: `${seasonKey}:gw${gameweek}:${registrationKey}`,
        seasonKey,
        registrationKey,
        gameweek,
        status,
        observedAt: batch.capturedAt,
        totalPoints,
        components: {
          appearance,
          goals,
          assists,
          cleanSheet,
          bonus,
          other: totalPoints - appearance - goals - assists - cleanSheet - bonus,
        },
      };
    })
    .toSorted((left, right) => left.registrationKey.localeCompare(right.registrationKey));
}
