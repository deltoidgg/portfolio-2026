export type ProjectLifecycle = "active" | "maintained" | "archived";
export type ProjectKind = "experiment" | "tool" | "product" | "research";
export type ProjectActionKind =
  | "case-study"
  | "live"
  | "source"
  | "package"
  | "docs"
  | "paper"
  | "data";

export interface ProjectAction {
  kind: ProjectActionKind;
  label: string;
  href: string;
}

export interface ProjectCover {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface Project {
  slug: string;
  name: string;
  kind: ProjectKind;
  summary: string;
  problem: string;
  decision: string;
  evidence: string;
  timeframe: string;
  role: string;
  lifecycle: ProjectLifecycle;
  featured: boolean;
  date: string;
  tags: string[];
  cover: ProjectCover;
  actions: ProjectAction[];
}

export const projects: Project[] = [
  {
    slug: "fpl",
    name: "FPL Market Intelligence",
    kind: "experiment",
    summary:
      "A point-in-time Fantasy Premier League decision room that turns FPL data and betting-market prices into inspectable player forecasts before the deadline.",
    problem:
      "Useful FPL signals are scattered across availability updates, bookmaker markets, exchanges, and player statistics—and a latest-value dashboard hides how confidence changed.",
    decision:
      "Preserve every source snapshot, resolve it into one gameweek model, then expose the forecast distribution, disagreement, and scoring recipe through a deadline replay.",
    evidence:
      "A deployed full-stack experiment, Neon-backed replay model, source adapters, deterministic forecast pipeline, and responsive browser-audited interface.",
    timeframe: "2026–present",
    role: "Independent creator",
    lifecycle: "active",
    featured: true,
    date: "2026-07-17",
    tags: ["TanStack Start", "TypeScript", "Neon", "Data modelling", "Visualisation"],
    cover: {
      src: "/projects/fpl.webp",
      alt: "FPL Market Intelligence deadline room showing player forecasts, market evidence, and a replay timeline",
      width: 1440,
      height: 900,
    },
    actions: [
      { kind: "case-study", label: "Read case study", href: "/projects/fpl" },
      { kind: "live", label: "Open live experiment", href: "https://fpl.wasimarif.com" },
      {
        kind: "source",
        label: "View source",
        href: "https://github.com/deltoidgg/portfolio-2026/tree/main/apps/fpl",
      },
    ],
  },
  {
    slug: "mockpit",
    name: "MockPit",
    kind: "tool",
    summary:
      "Runtime provenance devtools that show whether interface data is live, mocked, derived, hardcoded, or AI-generated before a prototype is treated as production-ready.",
    problem:
      "AI-assisted prototypes look finished long before their data and failure paths are real, leaving teams without a shared definition of what is safe to ship.",
    decision:
      "Keep provenance in a framework-neutral TypeScript core, then expose it through React, MSW, custom-element devtools, and a Playwright-aware CLI.",
    evidence:
      "Six public npm packages, an MIT-licensed repository, runnable documentation, redaction controls, and automated tests.",
    timeframe: "2026–present",
    role: "Independent creator",
    lifecycle: "active",
    featured: true,
    date: "2026-02-01",
    tags: ["TypeScript", "React", "MSW", "Playwright", "Effect"],
    cover: {
      src: "/projects/mockpit.webp",
      alt: "MockPit documentation showing its runtime provenance model and development tools",
      width: 1440,
      height: 900,
    },
    actions: [
      { kind: "case-study", label: "Read case study", href: "/projects/mockpit" },
      { kind: "docs", label: "Open documentation", href: "https://mockpit.wasimarif.com" },
      { kind: "source", label: "View source", href: "https://github.com/deltoidgg/mockpit" },
      { kind: "package", label: "View npm packages", href: "https://www.npmjs.com/org/mockpit" },
    ],
  },
  {
    slug: "rewriter",
    name: "Rewriter",
    kind: "product",
    summary:
      "An AI-assisted reading workspace that rewrites literature for a chosen reading level and adds natural text-to-speech without losing the flow of the original story.",
    problem:
      "Classic literature is valuable but its vocabulary and sentence structure can exclude younger readers and adults who want a gentler entry point.",
    decision:
      "Make reading level, source text, and narration part of one calm workflow instead of presenting model controls or exposing a chatbot interface.",
    evidence:
      "A working responsive product with text transformation, speech playback, persistent reading context, and recoverable generation states.",
    timeframe: "2025–present",
    role: "Independent creator",
    lifecycle: "active",
    featured: true,
    date: "2025-06-01",
    tags: ["LLMs", "Text-to-speech", "React", "Product design"],
    cover: {
      src: "/projects/rewriter.webp",
      alt: "Rewriter reading workspace with adapted text and narration controls",
      width: 1440,
      height: 900,
    },
    actions: [
      { kind: "case-study", label: "Read case study", href: "/projects/rewriter" },
      { kind: "live", label: "Open live product", href: "https://rewriter.wasimarif.com" },
    ],
  },
  {
    slug: "openfgc",
    name: "OpenFGC",
    kind: "product",
    summary:
      "A fighting-game analytics product that unified fragmented Steam, Twitch, event, and player data into interfaces for event planning and sponsor conversations.",
    problem:
      "Smaller tournament organisers lacked the consolidated audience and player signals available to established esports organisations.",
    decision:
      "Separate fast, presentation-ready summaries from deeper player and event analysis so one dataset could support different decision speeds.",
    evidence:
      "A restored working product, an end-to-end data pipeline, and interface artifacts covering summaries, profiles, breakdowns, and replay analysis.",
    timeframe: "2020–2021",
    role: "Independent creator",
    lifecycle: "maintained",
    featured: false,
    date: "2021-09-01",
    tags: ["React", "Next.js", "Prisma", "Data visualisation"],
    cover: {
      src: "/projects/openfgc.webp",
      alt: "OpenFGC dashboard comparing fighting-game audience and player statistics",
      width: 1440,
      height: 900,
    },
    actions: [
      { kind: "case-study", label: "Read case study", href: "/projects/openfgc" },
      { kind: "live", label: "Open live product", href: "https://openfgc.wasimarif.com" },
    ],
  },
];

export const sortedProjects = [...projects].sort((a, b) => b.date.localeCompare(a.date));
export const featuredProjects = sortedProjects.filter((project) => project.featured);

export function projectBySlug(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
