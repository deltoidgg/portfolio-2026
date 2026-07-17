import { describe, expect, test } from "vite-plus/test";
import { projectContentBySlug } from "../src/components/projects/project-registry";
import { featuredProjects, projectBySlug, projects } from "../src/content/projects";

describe("project registry", () => {
  test("exposes the agreed case studies with unique slugs and content", () => {
    expect(projects.map((project) => project.slug)).toEqual([
      "fpl",
      "mockpit",
      "rewriter",
      "openfgc",
    ]);
    expect(new Set(projects.map((project) => project.slug))).toHaveLength(projects.length);
    expect(projectBySlug("fpl")?.name).toBe("FPL Market Intelligence");
    expect(projectContentBySlug("fpl")).toBeDefined();
    expect(projectBySlug("mockpit")?.name).toBe("MockPit");
    expect(projectBySlug("missing")).toBeUndefined();
  });

  test("features current product work and keeps availability separate from lifecycle", () => {
    expect(featuredProjects.map((project) => project.slug)).toEqual(["fpl", "mockpit", "rewriter"]);

    for (const project of projects) {
      expect(["active", "maintained", "archived"]).toContain(project.lifecycle);
      expect(project.role).toBe("Independent creator");
      expect(project.cover.width).toBeGreaterThan(0);
      expect(project.cover.height).toBeGreaterThan(0);
      expect(project.actions.some((action) => action.kind === "case-study")).toBe(true);
    }
  });

  test("links the FPL case study to its independently deployed experiment", () => {
    const fpl = projectBySlug("fpl");
    expect(fpl?.kind).toBe("experiment");
    expect(fpl?.actions).toContainEqual({
      kind: "live",
      label: "Open live experiment",
      href: "https://fpl.wasimarif.com",
    });
  });

  test("uses the restored OpenFGC subdomain and never the expired apex domain", () => {
    const openfgc = projectBySlug("openfgc");
    expect(openfgc?.timeframe).toBe("2020–2021");
    expect(openfgc?.actions).toContainEqual({
      kind: "live",
      label: "Open live product",
      href: "https://openfgc.wasimarif.com",
    });
    expect(JSON.stringify(projects)).not.toContain("https://openfgc.com");
  });
});
