import { describe, expect, test } from "vite-plus/test";
import { collectionSlot, nextDeadlineContext } from "market-intelligence";

describe("season collection cadence", () => {
  test("tightens odds and FPL collection inside the deadline window", () => {
    const fixtures = [
      {
        key: "gw1",
        homeTeamKey: "ars",
        awayTeamKey: "cov",
        kickoffAt: "2026-08-21T19:00:00.000Z",
        gameweek: 1,
        deadlineAt: "2026-08-21T17:30:00.000Z",
      },
    ];
    const context = nextDeadlineContext(fixtures, "2026-08-20T17:30:00.000Z");

    expect(context).toEqual(expect.objectContaining({ gameweek: 1, hoursUntilDeadline: 24 }));
    expect(collectionSlot("odds-api", context!, "2026-08-20T17:34:59.000Z")).toEqual({
      cadenceMinutes: 5,
      scheduledFor: "2026-08-20T17:30:00.000Z",
    });
    expect(collectionSlot("fpl", context!, "2026-08-20T17:34:59.000Z")).toEqual({
      cadenceMinutes: 15,
      scheduledFor: "2026-08-20T17:30:00.000Z",
    });
  });

  test("uses lower-cost collection outside 48 hours and one stable slot per cadence", () => {
    const context = {
      gameweek: 1,
      deadlineAt: "2026-08-21T17:30:00.000Z",
      hoursUntilDeadline: 72,
    };
    const first = collectionSlot("odds-api", context, "2026-08-18T17:44:00.000Z");
    const second = collectionSlot("odds-api", context, "2026-08-18T17:59:59.000Z");

    expect(first.cadenceMinutes).toBe(30);
    expect(first.scheduledFor).toBe(second.scheduledFor);
  });
});
