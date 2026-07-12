import { describe, expect, test } from "vite-plus/test";
import { buildMetadata } from "../src/lib/metadata";

describe("portfolio metadata", () => {
  test("keeps the homepage title as the site name", () => {
    const head = buildMetadata({
      title: "Wasim Arif",
      description: "Software engineer across product and design engineering.",
      path: "/",
    });

    expect(head.meta).toContainEqual({ title: "Wasim Arif" });
  });

  test("builds canonical and social metadata for a page", () => {
    const head = buildMetadata({
      title: "Projects",
      description: "Selected product and design engineering work.",
      path: "/projects",
      image: "/social/projects.png",
    });

    expect(head.links).toContainEqual({ rel: "canonical", href: "https://wasimarif.com/projects" });
    expect(head.meta).toContainEqual({ title: "Projects · Wasim Arif" });
    expect(head.meta).toContainEqual({
      property: "og:url",
      content: "https://wasimarif.com/projects",
    });
    expect(head.meta).toContainEqual({
      property: "og:image",
      content: "https://wasimarif.com/social/projects.png",
    });
    expect(head.meta).toContainEqual({ name: "twitter:card", content: "summary_large_image" });
  });

  test("adds publication data for an article without duplicating the site name", () => {
    const head = buildMetadata({
      title: "A useful article · Wasim Arif",
      description: "A tested description.",
      path: "/writing/useful-article",
      type: "article",
      publishedTime: "2026-06-12",
    });

    expect(head.meta).toContainEqual({ title: "A useful article · Wasim Arif" });
    expect(head.meta).toContainEqual({ property: "og:type", content: "article" });
    expect(head.meta).toContainEqual({ property: "article:published_time", content: "2026-06-12" });
  });
});
