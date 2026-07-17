import type {
  Annotation,
  DeadlineRoom,
  DeadlineRoomQuery,
  Fixture,
  Forecast,
  RoomPlayer,
  RoomSource,
  Source,
} from "./contracts.ts";

export type SourceCapture = {
  source: Source;
  capturedAt: string;
};

export type DeadlineRoomProjection = {
  query: DeadlineRoomQuery;
  dataMode: DeadlineRoom["dataMode"];
  fixtures: Fixture[];
  forecasts: Forecast[];
  sourceCaptures: SourceCapture[];
  annotations: Annotation[];
};

export function projectDeadlineRoom(input: DeadlineRoomProjection): DeadlineRoom | null {
  if (input.forecasts.length === 0) return null;

  const deadlineAt = input.forecasts[0]?.deadlineAt;
  if (!deadlineAt) return null;

  const fixtureByKey = new Map(input.fixtures.map((fixture) => [fixture.key, fixture]));
  const annotationByKey = new Map(
    input.annotations.map((annotation) => [annotation.key, annotation]),
  );
  const sourceByKey = new Map<string, RoomSource>();
  for (const { source, capturedAt } of input.sourceCaptures) {
    const current = sourceByKey.get(source.key);
    sourceByKey.set(source.key, {
      ...source,
      lastCapturedAt:
        !current || capturedAt > current.lastCapturedAt ? capturedAt : current.lastCapturedAt,
      captureCount: (current?.captureCount ?? 0) + 1,
      captureTimes: [...(current?.captureTimes ?? []), capturedAt].toSorted((a, b) =>
        a.localeCompare(b),
      ),
    });
  }

  const playerByKey = new Map<string, RoomPlayer>();
  for (const forecast of input.forecasts) {
    const player = playerByKey.get(forecast.playerKey) ?? {
      playerKey: forecast.playerKey,
      playerName: forecast.playerName,
      teamKey: forecast.teamKey,
      position: forecast.position,
      series: [],
    };
    player.series.push({
      observedAt: forecast.observedAt,
      expectedPoints: forecast.expectedPoints,
      p10: forecast.p10,
      p50: forecast.p50,
      p90: forecast.p90,
      rank: forecast.rank,
      components: forecast.components,
      evidence: forecast.evidence,
    });
    playerByKey.set(forecast.playerKey, player);
  }

  const observedTimes = [
    ...new Set(input.forecasts.map((forecast) => forecast.observedAt)),
  ].toSorted((a, b) => a.localeCompare(b));

  return {
    ...input.query,
    dataMode: input.dataMode,
    deadlineAt,
    generatedAt: observedTimes.at(-1) ?? deadlineAt,
    fixtures: [...fixtureByKey.values()].toSorted((a, b) => a.kickoffAt.localeCompare(b.kickoffAt)),
    sources: [...sourceByKey.values()].toSorted((a, b) => a.label.localeCompare(b.label)),
    timeline: observedTimes.map((observedAt) => ({
      observedAt,
      label: observedAt.slice(11, 16),
      minutesToDeadline: Math.max(
        0,
        Math.round((Date.parse(deadlineAt) - Date.parse(observedAt)) / 60_000),
      ),
    })),
    players: [...playerByKey.values()]
      .map((player) => ({
        ...player,
        series: player.series.toSorted((a, b) => a.observedAt.localeCompare(b.observedAt)),
      }))
      .toSorted(
        (a, b) =>
          (a.series.at(-1)?.rank ?? Number.MAX_SAFE_INTEGER) -
          (b.series.at(-1)?.rank ?? Number.MAX_SAFE_INTEGER),
      ),
    annotations: [...annotationByKey.values()].toSorted((a, b) =>
      a.observedAt.localeCompare(b.observedAt),
    ),
  };
}

export function sourceStatusAt(
  source: RoomSource,
  observedAt: string,
): Pick<RoomSource, "captureCount" | "lastCapturedAt"> | null {
  const captureTimes = source.captureTimes.filter((capturedAt) => capturedAt <= observedAt);
  const lastCapturedAt = captureTimes.at(-1);
  return lastCapturedAt ? { captureCount: captureTimes.length, lastCapturedAt } : null;
}
