import { describe, expect, test } from "vite-plus/test";
import { buildFplMetadata, FPL_ORIGIN } from "../src/lib/metadata";

describe("FPL app metadata", () => {
  test("owns the fpl.wasimarif.com origin", () => {
    const head = buildFplMetadata({
      title: "Deadline Intelligence Room",
      description: "Market-informed Fantasy Premier League decisions.",
      path: "/",
    });

    expect(FPL_ORIGIN).toBe("https://fpl.wasimarif.com");
    expect(head.links).toContainEqual({ rel: "canonical", href: "https://fpl.wasimarif.com/" });
    expect(head.meta).toContainEqual({ property: "og:url", content: "https://fpl.wasimarif.com/" });
    expect(head.meta).toContainEqual({ property: "og:site_name", content: "FPL Lab — Wasim Arif" });
  });
});
