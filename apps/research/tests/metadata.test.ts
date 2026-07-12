import { describe, expect, test } from "vite-plus/test";
import { buildResearchMetadata } from "../src/lib/metadata";

describe("research metadata", () => {
  test("builds a canonical scholarly article head", () => {
    const head = buildResearchMetadata({
      title: "Do design systems deliver accessibility at scale?",
      description: "A pre-registered study of design-system adoption and accessibility.",
      path: "/papers/design-systems-accessibility",
      type: "article",
      publishedTime: "2026-06-12",
    });

    expect(head.links).toContainEqual({
      rel: "canonical",
      href: "https://research.wasimarif.com/papers/design-systems-accessibility",
    });
    expect(head.meta).toContainEqual({ property: "og:type", content: "article" });
    expect(head.meta).toContainEqual({ property: "article:published_time", content: "2026-06-12" });
    expect(head.meta).toContainEqual({ name: "twitter:card", content: "summary_large_image" });
  });
});
