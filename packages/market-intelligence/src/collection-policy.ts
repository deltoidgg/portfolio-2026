import type { SeasonFixture } from "./season-domain.ts";

export type DeadlineContext = {
  gameweek: number;
  deadlineAt: string;
  hoursUntilDeadline: number;
};

export type ScheduledSource =
  | "fpl"
  | "fpl-element-summary"
  | "odds-api"
  | "polymarket"
  | "fpl-live"
  | "season-schedule";

export function nextDeadlineContext(
  fixtures: SeasonFixture[],
  now: string,
): DeadlineContext | null {
  const nowTime = Date.parse(now);
  const next = fixtures
    .filter((fixture) => Date.parse(fixture.deadlineAt) >= nowTime)
    .toSorted((left, right) => left.deadlineAt.localeCompare(right.deadlineAt))[0];
  if (!next) return null;
  return {
    gameweek: next.gameweek,
    deadlineAt: next.deadlineAt,
    hoursUntilDeadline: Number(((Date.parse(next.deadlineAt) - nowTime) / 3_600_000).toFixed(2)),
  };
}

function isPriceChangeWindow(now: string): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(now));
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  return (hour === 23 && minute >= 30) || (hour === 0 && minute <= 10);
}

function cadenceMinutes(source: ScheduledSource, context: DeadlineContext, now: string): number {
  if (source === "season-schedule") return context.hoursUntilDeadline <= 48 ? 360 : 1_440;
  if (source === "fpl-element-summary") return 1_440;
  if (source === "fpl-live") return 10;
  if (source === "fpl") {
    if (context.gameweek > 1) return isPriceChangeWindow(now) ? 5 : 15;
    return context.hoursUntilDeadline <= 48 ? 15 : 60;
  }
  return context.hoursUntilDeadline <= 48 ? 5 : 30;
}

export function collectionSlot(
  source: ScheduledSource,
  context: DeadlineContext,
  now: string,
): { cadenceMinutes: number; scheduledFor: string } {
  const cadence = cadenceMinutes(source, context, now);
  const milliseconds = cadence * 60_000;
  const slot = Math.floor(Date.parse(now) / milliseconds) * milliseconds;
  return { cadenceMinutes: cadence, scheduledFor: new Date(slot).toISOString() };
}
