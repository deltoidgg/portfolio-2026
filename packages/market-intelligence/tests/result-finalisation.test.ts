import { describe, expect, test } from "vite-plus/test";
import { fplGameweekFinalisationAt } from "market-intelligence";

describe("FPL gameweek finalisation", () => {
  test("uses 09:00 Europe/London on the day after the final match in summer", () => {
    expect(fplGameweekFinalisationAt("2026-08-22T16:30:00.000Z")).toBe("2026-08-23T08:00:00.000Z");
  });

  test("uses 09:00 Europe/London on the day after the final match in winter", () => {
    expect(fplGameweekFinalisationAt("2027-01-02T17:30:00.000Z")).toBe("2027-01-03T09:00:00.000Z");
  });
});
