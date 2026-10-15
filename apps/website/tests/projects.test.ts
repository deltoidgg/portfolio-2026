import { describe, expect, test } from "vite-plus/test";
import { projectContentBySlug } from "../src/components/projects/project-registry";
import projectMedia from "../src/content/project-media.json";
import { featuredProjects, nextProject, projectBySlug, projects } from "../src/content/projects";

describe("project registry", () => {
  test("exposes the agreed case studies with unique slugs and content", () => {
    expect(projects.map((project) => project.slug)).toEqual([
      "fpl",
      "mockpit",
      "rewriter",
      "openfgc",
    ]);
    expect(new Set(projects.map((project) => project.slug))).toHaveLength(projects.length);
    expect(projectBySlug("fpl")?.name).toBe("FPL Lab");
    expect(projectBySlug("mockpit")?.name).toBe("MockPit");
    expect(projectBySlug("missing")).toBeUndefined();

    for (const project of projects) {
      expect(projectContentBySlug(project.slug)).toBeDefined();
    }
  });

  test("features current product work and keeps availability separate from lifecycle", () => {
    expect(featuredProjects.map((project) => project.slug)).toEqual(["fpl", "rewriter", "mockpit"]);

    for (const project of projects) {
      expect(["active", "maintained", "archived"]).toContain(project.lifecycle);
      expect(project.role).toBe("Independent creator");
      expect(project.actions.length).toBeGreaterThan(0);
      expect(project.summary).not.toMatch(/—/);
    }
  });

  test("serves every cover as responsive variants recorded in the media manifest", () => {
    for (const project of projects) {
      const key = project.cover.src.replace("/projects/", "") as keyof typeof projectMedia;
      expect(projectMedia[key]).toBeDefined();
      expect(project.cover.width).toBeGreaterThan(0);
      expect(project.cover.height).toBeGreaterThan(0);
      expect(project.cover.widths.length).toBeGreaterThan(1);
      expect(project.cover.widths).toEqual(
        [...new Set(project.cover.widths)].sort((a, b) => a - b),
      );
      expect(project.cover.alt.length).toBeGreaterThan(20);
    }
  });

  test("links each case study to the next one, wrapping at the end", () => {
    const order = ["fpl", "rewriter", "mockpit", "openfgc"];
    order.forEach((slug, index) => {
      expect(nextProject(slug)?.slug).toBe(order[(index + 1) % order.length]);
    });
    expect(nextProject("missing")).toBeUndefined();
  });

  test("links the FPL case study to its independently deployed experiment", () => {
    const fpl = projectBySlug("fpl");
    expect(fpl?.kind).toBe("experiment");
    expect(fpl?.actions).toContainEqual({
      kind: "live",
      label: "Open the lab",
      href: "https://fpl.wasimarif.com",
    });
  });

  test("uses the restored OpenFGC subdomain and never the expired apex domain", () => {
    const openfgc = projectBySlug("openfgc");
    expect(openfgc?.timeframe).toBe("2020–2021");
    expect(openfgc?.actions).toContainEqual({
      kind: "live",
      label: "Visit OpenFGC",
      href: "https://openfgc.wasimarif.com",
    });
    expect(JSON.stringify(projects)).not.toContain("https://openfgc.com");
  });
});
