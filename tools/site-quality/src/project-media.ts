// Captures the case-study screenshots from each live project and encodes responsive AVIF and
// WebP variants for the portfolio. Run it whenever a project's design changes:
//
//   vp run site-quality#project-media            (every capture)
//   vp run site-quality#project-media rewriter   (one project)
//
// Variants land in apps/website/public/projects/<slug>/ and their sizes are recorded in
// apps/website/src/content/project-media.json, which the site uses to build srcsets. Entries
// that are not captured here (for example the archived OpenFGC concept screens) are preserved.
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import sharp from "sharp";

const root = new URL("../../../", import.meta.url).pathname;
const publicRoot = join(root, "apps/website/public/projects");
const manifestPath = join(root, "apps/website/src/content/project-media.json");
const targetWidths = [640, 1280, 1920];

interface Capture {
  slug: string;
  name: string;
  url: string;
  /** Interact with the page before the screenshot. */
  prepare?: (page: Page) => Promise<void>;
  /** Crop in CSS pixels, applied to the 2x screenshot. */
  clip?: { x: number; y: number; width: number; height: number };
  /** Defaults to 1440 × 900. */
  viewport?: { width: number; height: number };
  /** Keep the page background transparent, for overlays like Join's bar. */
  transparent?: boolean;
  /** Let the page animate, for themes whose scenes only draw in full motion. */
  motion?: boolean;
  /** localStorage entries to set after it is cleared, before the page loads. */
  storage?: Record<string, string>;
}

interface MediaEntry {
  width: number;
  height: number;
  widths: number[];
}

// Point an origin at a local build to capture a redesign before it ships. Vite Task strips
// environment variables, so run the script directly from tools/site-quality in that case:
//   FPL_ORIGIN=http://127.0.0.1:4190 node src/project-media.ts fpl
const rewriter = process.env.REWRITER_ORIGIN ?? "https://rewriter.wasimarif.com";
const fpl = process.env.FPL_ORIGIN ?? "https://fpl.wasimarif.com";
const squadUrl = `${fpl}/squad?horizon=3&dataset=current`;

/** Make the sticky header opaque so scrolled content never shows through it. */
const solidHeader = (page: Page) =>
  page.addStyleTag({
    content:
      ".fpl-site-header { background: #071018 !important; backdrop-filter: none !important; }",
  });

// Join the Conversation is a desktop app, so its screens come from the renderer's dev server,
// which fakes the main process with sample data. Start it first, then run this script directly:
//   (cd ../join-conversation/apps/desktop && vp dev)
//   JOIN_ORIGIN=http://127.0.0.1:5173 node src/project-media.ts join
const joinOrigin = process.env.JOIN_ORIGIN;
const joinApp = (query: string) => `${joinOrigin}/app.html?panel=off&${query}`;
const joinBar = (scenario: string) =>
  `${joinOrigin}/widget.html?panel=off&theme=dark&scenario=${scenario}`;
/** The bar's window is a fixed 525 × 500 transparent canvas, so every state lines up. */
const barCanvas = { width: 525, height: 500 };
const barStates = ["hearing", "asking", "handsfree", "thinking", "answered", "notice"] as const;

const joinCaptures: Capture[] = [
  { slug: "join", name: "home", url: joinApp("theme=dark&view=home") },
  // the dark theme is the one shown everywhere else; this is only for the light and dark compare
  { slug: "join", name: "home-light", url: joinApp("theme=light&view=home") },
  { slug: "join", name: "transcript", url: joinApp("theme=dark&view=transcript") },
  { slug: "join", name: "models", url: joinApp("theme=dark&view=models") },
  {
    slug: "join",
    name: "privacy",
    url: joinApp("theme=dark&view=settings"),
    prepare: async (page) => {
      await page.getByRole("button", { name: "Privacy", exact: true }).click();
      await page.waitForTimeout(600);
    },
  },
  ...(["Welcome", "Privacy", "TryIt"] as const).map((step) => ({
    slug: "join",
    name: `onboarding-${step.toLowerCase()}`,
    url: `${joinOrigin}/onboarding/harness.html?panel=off&theme=dark&step=${step}`,
  })),
  {
    // the video player from setup, at the same scale as the bar, as a backdrop for the bar demo
    slug: "join",
    name: "player",
    url: `${joinOrigin}/onboarding/harness.html?panel=off&theme=dark&step=TryIt`,
    clip: { x: 411, y: 276, width: 618, height: 504 },
  },
  ...barStates.map((scenario) => ({
    slug: "join",
    name: `bar-${scenario}`,
    url: joinBar(scenario),
    viewport: barCanvas,
    transparent: true,
  })),
];

// Rewriter's themes run their scenes in WebGL, which headless Chromium draws in software, so
// these force the scene on and let it move.
const rewriterOrigin = (path: string) => `${rewriter}${path}`;
const rewriterThemes = ["starlight", "paper-worlds", "living-ink", "lantern"] as const;
const chapter = "/books/treasure-island/chapter-1";
/** Skips the first-visit "Pick your look" prompt. */
const promptSeen = { "rewriter:theme-prompt": "asked" };
/** Gives a theme's scene time to start and fade in over its CSS backdrop. */
const settle = (page: Page) => page.waitForTimeout(2500);

const rewriterCaptures: Capture[] = [
  ...rewriterThemes.map((theme) => ({
    slug: "rewriter",
    name: `theme-${theme}`,
    url: rewriterOrigin(`/?theme=${theme}&scene=force&effects=full`),
    motion: true,
    storage: promptSeen,
    prepare: settle,
  })),
  {
    // a first visit, with no theme chosen yet
    slug: "rewriter",
    name: "prompt",
    url: rewriterOrigin("/?scene=force&effects=full"),
    motion: true,
    prepare: settle,
  },
  {
    slug: "rewriter",
    name: "shelf",
    url: rewriterOrigin("/?theme=starlight&scene=force&effects=full"),
    motion: true,
    storage: promptSeen,
    prepare: async (page) => {
      const heading = page.getByRole("heading", { name: "On the shelf" });
      const top = await heading.evaluate((element) => element.getBoundingClientRect().top);
      await page.evaluate((y) => window.scrollBy(0, y - 56), top);
      await page.waitForTimeout(1200);
    },
  },
  ...(["starlight", "paper-worlds"] as const).map((theme) => ({
    slug: "rewriter",
    name: `reader-${theme}`,
    url: rewriterOrigin(`${chapter}?theme=${theme}&scene=force&effects=full`),
    motion: true,
    storage: promptSeen,
    prepare: settle,
  })),
  {
    slug: "rewriter",
    name: "curl",
    url: rewriterOrigin(`${chapter}?theme=starlight&scene=force&effects=full`),
    motion: true,
    storage: promptSeen,
    prepare: async (page) => {
      await page.waitForSelector(".reader-book-stage[data-turn-engine='webgl']");
      const box = (await page.locator(".reader-page-viewport").boundingBox())!;
      // pick the right-hand page up by its outer edge and hold it partway over
      const x = box.x + box.width - 2;
      const y = box.y + box.height * 0.8;
      await page.mouse.move(x, y);
      await page.waitForTimeout(500);
      await page.mouse.down();
      for (let step = 1; step <= 12; step += 1) {
        await page.mouse.move(x - 380 * (step / 12), y - 90 * (step / 12));
        await page.waitForTimeout(30);
      }
      await page.waitForTimeout(700);
    },
  },
  {
    slug: "rewriter",
    name: "preferences",
    url: rewriterOrigin(`${chapter}?theme=starlight&scene=force&effects=full`),
    motion: true,
    storage: promptSeen,
    prepare: async (page) => {
      await page.getByRole("button", { name: "Open reading preferences" }).click();
      await page.waitForTimeout(800);
    },
  },
  {
    // Lantern Room's ember transition, caught partway through a rewrite in the home page demo
    slug: "rewriter",
    name: "rewrite-lantern",
    url: rewriterOrigin("/?theme=lantern&scene=force&effects=full"),
    motion: true,
    storage: promptSeen,
    clip: { x: 80, y: 300, width: 1280, height: 600 },
    prepare: async (page) => {
      const passage = page.locator("[data-demo-passage]").first();
      const top = await passage.evaluate((element) => element.getBoundingClientRect().top);
      await page.evaluate((y) => window.scrollBy(0, y - 460), top);
      await page.waitForTimeout(1500);
      // the transition is cut off after 900 ms, which a 2x software-rendered screenshot can
      // outlast, so hold back the cut-off and freeze every animation at the same moment instead
      await page.evaluate(() => {
        const schedule = window.setTimeout;
        window.setTimeout = ((handler: TimerHandler, delay?: number, ...rest: unknown[]) =>
          (delay ?? 0) >= 800 ? 0 : schedule(handler, delay, ...rest)) as typeof window.setTimeout;
      });
      await page.getByText("Ages 6 to 8", { exact: true }).first().click();
      await page.waitForSelector("[data-demo-passage] [data-word]", { state: "attached" });
      await page.evaluate(() => {
        for (const animation of document.getAnimations()) {
          animation.pause();
          animation.currentTime = 300;
        }
      });
      await page.waitForTimeout(200);
    },
  },
];

const captures: Capture[] = [
  ...rewriterCaptures,
  { slug: "fpl", name: "squad-hero", url: squadUrl },
  {
    slug: "fpl",
    name: "squad",
    url: squadUrl,
    prepare: async (page) => {
      await page.getByRole("button", { name: /Suggest a squad/i }).click();
      await page.waitForTimeout(2000);
      await solidHeader(page);
      // park the pitch just under the sticky header so the squad fills the frame
      await page.evaluate(() => window.scrollTo(0, 374));
    },
  },
  {
    slug: "fpl",
    name: "map",
    url: `${fpl}/opportunities?mode=forecast&view=auto&position=ALL&minSixty=0&horizon=3&snapshot=latest`,
    prepare: async (page) => {
      // pick the highest-profile player on the map so the inspector has something to show
      const player = page.locator("circle[aria-label*='Haaland'], circle[aria-label]").first();
      await player.click({ force: true });
      await page.waitForTimeout(1200);
      await solidHeader(page);
      await page.evaluate(() => window.scrollTo(0, 352));
    },
  },
  { slug: "fpl", name: "archive", url: `${fpl}/archive/2025-26/gw34` },
  { slug: "mockpit", name: "docs", url: "https://mockpit.wasimarif.com/" },
  {
    slug: "mockpit",
    name: "devtools",
    url: "https://mockpit.wasimarif.com/",
    clip: { x: 729, y: 101, width: 658, height: 580 },
  },
  { slug: "openfgc", name: "overview", url: "https://openfgc.wasimarif.com/" },
  ...(joinOrigin ? joinCaptures : []),
];

async function encode(source: Buffer, slug: string, name: string): Promise<MediaEntry> {
  const metadata = await sharp(source).metadata();
  const sourceWidth = metadata.width ?? 0;
  const sourceHeight = metadata.height ?? 0;
  const largestTarget = targetWidths.at(-1)!;
  // skip a variant that would be nearly the same size as the next one up
  const widths = targetWidths.filter((width) => width <= sourceWidth * 0.9);
  if (sourceWidth < largestTarget / 0.9) widths.push(Math.min(sourceWidth, largestTarget));
  const directory = join(publicRoot, slug);
  await mkdir(directory, { recursive: true });

  for (const width of widths) {
    const resized = sharp(source).resize({ width, withoutEnlargement: true });
    await resized
      .clone()
      .avif({ quality: 52, effort: 6 })
      .toFile(join(directory, `${name}-${width}.avif`));
    await resized
      .clone()
      .webp({ quality: 78, effort: 5 })
      .toFile(join(directory, `${name}-${width}.webp`));
  }

  const largest = widths.at(-1)!;
  return { width: largest, height: Math.round((sourceHeight / sourceWidth) * largest), widths };
}

async function readManifest(): Promise<Record<string, MediaEntry>> {
  try {
    return JSON.parse(await readFile(manifestPath, "utf8")) as Record<string, MediaEntry>;
  } catch {
    return {};
  }
}

const only = process.argv.slice(2);
const onlyName = process.env.CAPTURE_NAME;
const selected = captures.filter(
  (capture) =>
    (only.length === 0 || only.includes(capture.slug)) && (!onlyName || capture.name === onlyName),
);
if (only.includes("join") && !joinOrigin) {
  console.warn("Skipping join: set JOIN_ORIGIN to its renderer dev server (see above).");
}
const manifest = await readManifest();
const browser = await chromium.launch({ headless: true });

try {
  for (const capture of selected) {
    const context = await browser.newContext({
      viewport: capture.viewport ?? { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      reducedMotion: capture.motion ? "no-preference" : "reduce",
    });
    const page = await context.newPage();
    await page.addInitScript((entries) => {
      localStorage.clear();
      for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
    }, capture.storage ?? {});
    await page.goto(capture.url, { waitUntil: "networkidle", timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    await capture.prepare?.(page);
    // a moving capture is timed by its own prepare step
    if (!capture.motion) await page.waitForTimeout(600);
    const image = await page.screenshot({
      clip: capture.clip,
      omitBackground: capture.transparent,
    });
    manifest[`${capture.slug}/${capture.name}`] = await encode(image, capture.slug, capture.name);
    console.log(`captured ${capture.slug}/${capture.name}`);
    await context.close();
  }
} finally {
  await browser.close();
}

const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(manifestPath, JSON.stringify(sorted, null, 2) + "\n");
// match the repo formatter so the generated manifest passes `vp check`
spawnSync("vp", ["fmt", "--write", manifestPath], { cwd: root, stdio: "inherit" });
console.log(
  `Wrote ${selected.length} captures and ${Object.keys(sorted).length} manifest entries.`,
);
