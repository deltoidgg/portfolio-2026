const londonParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function partsAt(value: Date) {
  const parts = Object.fromEntries(
    londonParts
      .formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: parts.year!,
    month: parts.month!,
    day: parts.day!,
    hour: parts.hour!,
    minute: parts.minute!,
    second: parts.second!,
  };
}

function londonLocalToUtc(year: number, month: number, day: number, hour: number): Date {
  const target = Date.UTC(year, month - 1, day, hour);
  let guess = target;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const local = partsAt(new Date(guess));
    const representedAsUtc = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second,
    );
    guess += target - representedAsUtc;
  }
  return new Date(guess);
}

export function fplGameweekFinalisationAt(lastKickoffAt: string): string {
  const kickoff = new Date(lastKickoffAt);
  if (!Number.isFinite(kickoff.getTime())) throw new Error("lastKickoffAt must be an ISO date");
  const local = partsAt(kickoff);
  const nextDay = new Date(Date.UTC(local.year, local.month - 1, local.day + 1));
  return londonLocalToUtc(
    nextDay.getUTCFullYear(),
    nextDay.getUTCMonth() + 1,
    nextDay.getUTCDate(),
    9,
  ).toISOString();
}
