import { appendFile, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const FIFTEEN_MINUTES = 15 * 60_000;
const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;

export function validateCalendar(value) {
  if (
    !value ||
    value.schemaVersion !== "collection-calendar/v1" ||
    typeof value.seasonKey !== "string" ||
    !Number.isFinite(Date.parse(value.startsAt)) ||
    !Number.isFinite(Date.parse(value.endsAt)) ||
    !Array.isArray(value.gameweeks) ||
    value.gameweeks.length === 0
  ) {
    return null;
  }
  const gameweeks = value.gameweeks.flatMap((gameweek) =>
    Number.isInteger(gameweek?.gameweek) &&
    gameweek.gameweek > 0 &&
    Number.isFinite(Date.parse(gameweek.deadlineAt)) &&
    Number.isFinite(Date.parse(gameweek.lastKickoffAt))
      ? [
          {
            gameweek: gameweek.gameweek,
            deadlineAt: new Date(gameweek.deadlineAt).toISOString(),
            lastKickoffAt: new Date(gameweek.lastKickoffAt).toISOString(),
          },
        ]
      : [],
  );
  if (gameweeks.length !== value.gameweeks.length) return null;
  return {
    schemaVersion: value.schemaVersion,
    seasonKey: value.seasonKey,
    startsAt: new Date(value.startsAt).toISOString(),
    endsAt: new Date(value.endsAt).toISOString(),
    gameweeks: gameweeks.toSorted((left, right) => left.gameweek - right.gameweek),
  };
}

function londonParts(value) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
}

function londonLocalToUtc(year, month, day, hour) {
  const target = Date.UTC(year, month - 1, day, hour);
  let guess = target;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const local = londonParts(new Date(guess));
    guess +=
      target -
      Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
  }
  return new Date(guess);
}

export function finalisationAt(lastKickoffAt) {
  const local = londonParts(new Date(lastKickoffAt));
  const nextDay = new Date(Date.UTC(local.year, local.month - 1, local.day + 1));
  return londonLocalToUtc(
    nextDay.getUTCFullYear(),
    nextDay.getUTCMonth() + 1,
    nextDay.getUTCDate(),
    9,
  ).toISOString();
}

function dueAt(slotMs, cadenceMinutes) {
  return slotMs % (cadenceMinutes * 60_000) === 0;
}

export function decideGate({ calendar, now, enabled, mode = "auto", calendarHealth = "healthy" }) {
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs)) throw new Error("Gate time must be an ISO date-time");
  const slotMs = Math.floor(nowMs / FIFTEEN_MINUTES) * FIFTEEN_MINUTES;
  const nominalSlot = new Date(slotMs).toISOString();
  if (!enabled) {
    return {
      run: false,
      nominalSlot,
      dueSources: [],
      finalisationDue: false,
      retentionDue: false,
      verificationDue: false,
      calendarHealth,
      reason: "MI_COLLECTION_ENABLED is false",
    };
  }
  if (mode !== "auto") {
    return {
      run: true,
      nominalSlot,
      dueSources:
        mode === "force-collect"
          ? ["premier-league-schedule", "fpl", "fpl-element-summary", "odds-api"]
          : [],
      finalisationDue: mode === "finalise",
      retentionDue: mode === "retention",
      verificationDue: mode === "verify",
      calendarHealth,
      reason: `manual ${mode}`,
    };
  }
  if (!calendar) {
    const hourly = dueAt(slotMs, 60);
    return {
      run: hourly,
      nominalSlot,
      dueSources: hourly ? ["fpl", "odds-api"] : [],
      finalisationDue: false,
      retentionDue: false,
      verificationDue: false,
      calendarHealth: "unhealthy",
      reason: hourly
        ? "both calendars invalid; conservative hourly collection"
        : "both calendars invalid; waiting for the conservative hourly slot",
    };
  }
  const next = calendar.gameweeks
    .filter((gameweek) => Date.parse(gameweek.deadlineAt) >= nowMs)
    .toSorted((left, right) => left.deadlineAt.localeCompare(right.deadlineAt))[0];
  const insideDeadlineWindow = next && Date.parse(next.deadlineAt) - nowMs <= 48 * HOUR;
  const currentCadence = insideDeadlineWindow ? 15 : 60;
  const dueSources = [];
  if (next && dueAt(slotMs, currentCadence)) dueSources.push("fpl", "odds-api");
  const scheduleCadence = insideDeadlineWindow ? 360 : 1_440;
  if (next && dueAt(slotMs, scheduleCadence)) dueSources.unshift("premier-league-schedule");
  if (next && dueAt(slotMs, 1_440)) {
    dueSources.push("fpl-element-summary");
  }
  const finalisationDue = calendar.gameweeks.some((gameweek) => {
    const finalAt = Date.parse(finalisationAt(gameweek.lastKickoffAt));
    return nowMs >= finalAt && nowMs <= finalAt + DAY && dueAt(slotMs, 60);
  });
  const minuteOfDay = Math.floor((slotMs % DAY) / 60_000);
  const retentionDue = minuteOfDay === 180;
  const verificationDue = minuteOfDay === 240;
  const run = dueSources.length > 0 || finalisationDue || retentionDue || verificationDue;
  return {
    run,
    nominalSlot,
    dueSources,
    finalisationDue,
    retentionDue,
    verificationDue,
    calendarHealth,
    reason: run
      ? `${insideDeadlineWindow ? "deadline-window" : "standard"} cadence`
      : "no work is due in this nominal slot",
  };
}

async function loadCalendar() {
  const remoteUrl =
    process.env.MI_CALENDAR_URL ??
    "https://data.fpl.wasimarif.com/control/v1/epl-2026-27/calendar.json";
  try {
    const response = await fetch(remoteUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });
    if (response.ok) {
      const remote = validateCalendar(await response.json());
      if (remote) return { calendar: remote, health: "healthy", source: "remote" };
    }
  } catch {
    // The checked-in calendar is the intentional offline fallback.
  }
  try {
    const fallback = validateCalendar(
      JSON.parse(await readFile(new URL("../fpl-season-calendar.json", import.meta.url), "utf8")),
    );
    if (fallback) return { calendar: fallback, health: "fallback", source: "checked-in" };
  } catch {
    // The unhealthy policy below is deliberately conservative.
  }
  return { calendar: null, health: "unhealthy", source: "none" };
}

async function main() {
  const loaded = await loadCalendar();
  const decision = decideGate({
    calendar: loaded.calendar,
    calendarHealth: loaded.health,
    now: process.env.MI_GATE_AT ?? new Date().toISOString(),
    enabled: /^(1|true)$/i.test(process.env.MI_COLLECTION_ENABLED ?? ""),
    mode: process.env.MI_PIPELINE_MODE ?? "auto",
  });
  const output = {
    run: String(decision.run),
    nominal_slot: decision.nominalSlot,
    due_sources: decision.dueSources.join(","),
    finalisation_due: String(decision.finalisationDue),
    retention_due: String(decision.retentionDue),
    verification_due: String(decision.verificationDue),
    calendar_health: decision.calendarHealth,
    calendar_source: loaded.source,
    reason: decision.reason,
  };
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `${Object.entries(output)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n")}\n`,
    );
  }
  console.log(JSON.stringify(output));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
