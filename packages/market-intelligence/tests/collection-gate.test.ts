import { describe, expect, it } from "vitest";
import {
  decideGate,
  finalisationAt,
  validateCalendar,
} from "../../../.github/scripts/fpl-collection-gate.mjs";

const calendar = validateCalendar({
  schemaVersion: "collection-calendar/v1",
  seasonKey: "epl:2026-27",
  startsAt: "2026-08-21T00:00:00.000Z",
  endsAt: "2027-05-30T23:59:59.000Z",
  gameweeks: [
    {
      gameweek: 1,
      deadlineAt: "2026-08-21T17:30:00.000Z",
      lastKickoffAt: "2026-08-24T19:00:00.000Z",
    },
  ],
});

describe("pre-database collection gate", () => {
  it("normalizes delayed cron delivery and uses 15-minute cadence inside 48 hours", () => {
    expect(
      decideGate({
        calendar,
        now: "2026-08-20T17:37:00.000Z",
        enabled: true,
      }),
    ).toMatchObject({
      run: true,
      nominalSlot: "2026-08-20T17:30:00.000Z",
      dueSources: ["fpl", "odds-api"],
    });
  });

  it("uses hourly current/odds collection outside the deadline window", () => {
    expect(
      decideGate({
        calendar,
        now: "2026-08-18T17:30:00.000Z",
        enabled: true,
      }).dueSources,
    ).toEqual([]);
    expect(
      decideGate({
        calendar,
        now: "2026-08-18T18:00:00.000Z",
        enabled: true,
      }).dueSources,
    ).toContain("fpl");
  });

  it("checks daily for newly registered players missing historical priors", () => {
    expect(
      decideGate({
        calendar,
        now: "2026-08-18T00:00:00.000Z",
        enabled: true,
      }).dueSources,
    ).toContain("fpl-element-summary");
  });

  it("schedules finalisation at 09:00 London and retries hourly for 24 hours", () => {
    expect(finalisationAt("2027-01-02T17:30:00.000Z")).toBe("2027-01-03T09:00:00.000Z");
    expect(
      decideGate({
        calendar: validateCalendar({
          schemaVersion: "collection-calendar/v1",
          seasonKey: "epl:2026-27",
          startsAt: "2026-08-21T00:00:00.000Z",
          endsAt: "2027-05-30T23:59:59.000Z",
          gameweeks: [
            {
              gameweek: 19,
              deadlineAt: "2027-01-02T13:30:00.000Z",
              lastKickoffAt: "2027-01-02T17:30:00.000Z",
            },
          ],
        }),
        now: "2027-01-03T10:00:00.000Z",
        enabled: true,
      }).finalisationDue,
    ).toBe(true);
  });

  it("converts the 09:00 London finalisation time across daylight saving", () => {
    expect(finalisationAt("2026-08-24T19:00:00.000Z")).toBe("2026-08-25T08:00:00.000Z");
  });

  it("waits for the last fixture in a postponed or double gameweek", () => {
    const postponed = validateCalendar({
      schemaVersion: "collection-calendar/v1",
      seasonKey: "epl:2026-27",
      startsAt: "2026-08-21T00:00:00.000Z",
      endsAt: "2027-05-30T23:59:59.000Z",
      gameweeks: [
        {
          gameweek: 8,
          deadlineAt: "2026-10-24T12:30:00.000Z",
          lastKickoffAt: "2026-11-04T20:00:00.000Z",
        },
      ],
    });

    expect(
      decideGate({
        calendar: postponed,
        now: "2026-10-25T09:00:00.000Z",
        enabled: true,
      }).finalisationDue,
    ).toBe(false);
    expect(
      decideGate({
        calendar: postponed,
        now: "2026-11-05T09:00:00.000Z",
        enabled: true,
      }).finalisationDue,
    ).toBe(true);
  });

  it("stops source collection once no future deadline remains", () => {
    expect(
      decideGate({
        calendar,
        now: "2027-06-02T12:15:00.000Z",
        enabled: true,
      }).dueSources,
    ).toEqual([]);
  });

  it("permits only a conservative hourly run when both calendars are invalid", () => {
    expect(
      decideGate({
        calendar: null,
        calendarHealth: "unhealthy",
        now: "2026-08-20T17:30:00.000Z",
        enabled: true,
      }).run,
    ).toBe(false);
    expect(
      decideGate({
        calendar: null,
        calendarHealth: "unhealthy",
        now: "2026-08-20T18:00:00.000Z",
        enabled: true,
      }),
    ).toMatchObject({
      run: true,
      dueSources: ["fpl", "odds-api"],
      calendarHealth: "unhealthy",
    });
  });
});
