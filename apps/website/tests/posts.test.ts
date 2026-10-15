import { describe, expect, test } from "vite-plus/test";
import { postComponentBySlug } from "../src/components/posts/post-registry";
import { formatPostDate, posts } from "../src/content/posts";

describe("post registry", () => {
  // the route loader only checks metadata so the post bodies stay out of the main bundle,
  // which makes this the guard against a post with no content
  test("has a body for every published post", () => {
    for (const post of posts) {
      expect(postComponentBySlug(post.slug)).toBeDefined();
    }
  });

  test("keeps decks and section labels free of em dashes", () => {
    for (const post of posts) {
      expect(post.deck).not.toMatch(/—/);
      expect(post.title).not.toMatch(/—/);
      for (const section of post.sections) expect(section.label).not.toMatch(/—/);
    }
  });

  test("formats dates the same way on the server and in the browser", () => {
    expect(formatPostDate("2026-06-12")).toBe("12 June 2026");
  });
});
