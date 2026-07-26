import { afterEach, describe, expect, test } from "vite-plus/test";
import { getCurrentSeasonConfig } from "../src/neon/season-config.ts";

const originalRuleset = process.env.MI_RULESET_KEY;

afterEach(() => {
  if (originalRuleset === undefined) delete process.env.MI_RULESET_KEY;
  else process.env.MI_RULESET_KEY = originalRuleset;
});

describe("current season configuration", () => {
  test("cannot regress the launched season to a provisional ruleset", () => {
    process.env.MI_RULESET_KEY = "fpl:2026-27:provisional-v1";
    expect(getCurrentSeasonConfig().rulesetKey).toBe("fpl:2026-27:official-v1");
  });
});
