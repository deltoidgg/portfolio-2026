import projectMedia from "./project-media.json";

export type ProjectLifecycle = "active" | "maintained" | "archived";
export type ProjectKind = "experiment" | "tool" | "product" | "research";
export type ProjectActionKind = "live" | "source" | "package" | "docs";

export interface ProjectAction {
  kind: ProjectActionKind;
  label: string;
  href: string;
}

export type ProjectMediaKey = keyof typeof projectMedia;

/** A screenshot with responsive AVIF and WebP variants at `${src}-${width}.{avif,webp}`. */
export interface ProjectImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  widths: number[];
}

export interface Project {
  slug: string;
  name: string;
  kind: ProjectKind;
  /** One or two plain sentences, used on cards and as the case study standfirst. */
  summary: string;
  timeframe: string;
  role: string;
  lifecycle: ProjectLifecycle;
  featured: boolean;
  /** Last meaningful update, used for ordering. */
  date: string;
  tags: string[];
  cover: ProjectImage;
  actions: ProjectAction[];
}

export function projectImage(key: ProjectMediaKey, alt: string): ProjectImage {
  return { src: `/projects/${key}`, alt, ...projectMedia[key] };
}

export const projects: Project[] = [
  {
    slug: "fpl",
    name: "FPL Lab",
    kind: "experiment",
    summary:
      "A Fantasy Premier League lab that turns official prices and betting odds into points forecasts, then helps you build a squad that actually fits the rules.",
    timeframe: "2026",
    role: "Independent creator",
    lifecycle: "active",
    featured: true,
    date: "2026-07-29",
    tags: ["TanStack Start", "TypeScript", "Neon", "Cloudflare R2", "GitHub Actions"],
    cover: projectImage(
      "fpl/squad-hero",
      "The FPL Lab squad builder, headed ‘Build the edge.’, with a £100m budget bar and gameweek horizon controls",
    ),
    actions: [
      { kind: "live", label: "Open the lab", href: "https://fpl.wasimarif.com" },
      {
        kind: "source",
        label: "Source on GitHub",
        href: "https://github.com/deltoidgg/portfolio-2026/tree/main/apps/fpl",
      },
    ],
  },
  {
    slug: "mockpit",
    name: "MockPit",
    kind: "tool",
    summary:
      "Devtools that show what a screen is really made of: live API data, mocks, fallbacks, hardcoded copy or AI-generated filler.",
    timeframe: "2026",
    role: "Independent creator",
    lifecycle: "active",
    featured: true,
    date: "2026-05-16",
    tags: ["TypeScript", "React", "MSW", "Playwright", "Effect"],
    cover: projectImage(
      "mockpit/docs",
      "The MockPit docs homepage next to its devtools panel, which reports hybrid mode, the source mix and a blocked capture",
    ),
    actions: [
      { kind: "docs", label: "Read the docs", href: "https://mockpit.wasimarif.com" },
      { kind: "source", label: "GitHub", href: "https://github.com/deltoidgg/mockpit" },
      { kind: "package", label: "npm", href: "https://www.npmjs.com/org/mockpit" },
    ],
  },
  {
    slug: "rewriter",
    name: "Rewriter",
    kind: "product",
    summary:
      "A reading app that rewrites classic novels for younger or newer readers, and reads them aloud, without losing the story.",
    timeframe: "2025–2026",
    role: "Independent creator",
    lifecycle: "active",
    featured: true,
    date: "2026-07-23",
    tags: ["TanStack Start", "Gemini", "ElevenLabs", "Motion", "Upstash Redis"],
    cover: projectImage(
      "rewriter/library",
      "Rewriter’s library page: a candlelit reading room with the line ‘Step into timeless stories.’ above a shelf of classic book covers",
    ),
    actions: [{ kind: "live", label: "Visit Rewriter", href: "https://rewriter.wasimarif.com" }],
  },
  {
    slug: "openfgc",
    name: "OpenFGC",
    kind: "product",
    summary:
      "Audience and player stats for fighting games, pulled together from Steam, Twitch and tournament data so smaller organisers had numbers to show sponsors.",
    timeframe: "2020–2021",
    role: "Independent creator",
    lifecycle: "maintained",
    featured: false,
    date: "2021-09-01",
    tags: ["React", "Next.js", "Prisma", "Data visualisation"],
    cover: projectImage(
      "openfgc/overview",
      "The OpenFGC overview: headline Steam, Twitch and tournament numbers above a table of games with 90-day trend lines",
    ),
    actions: [{ kind: "live", label: "Visit OpenFGC", href: "https://openfgc.wasimarif.com" }],
  },
];

export const sortedProjects = [...projects].sort((a, b) => b.date.localeCompare(a.date));
export const featuredProjects = sortedProjects.filter((project) => project.featured);

export function projectBySlug(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}

/** The project after this one in the work list, wrapping around, for the case study footer. */
export function nextProject(slug: string): Project | undefined {
  const index = sortedProjects.findIndex((project) => project.slug === slug);
  if (index === -1 || sortedProjects.length < 2) return undefined;
  return sortedProjects[(index + 1) % sortedProjects.length];
}
