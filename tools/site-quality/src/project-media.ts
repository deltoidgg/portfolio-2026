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

const captures: Capture[] = [
  { slug: "rewriter", name: "library", url: `${rewriter}/` },
  { slug: "rewriter", name: "book", url: `${rewriter}/books/emma` },
  { slug: "rewriter", name: "reader", url: `${rewriter}/books/emma/volume-1-chapter-1` },
  {
    slug: "rewriter",
    name: "preferences",
    url: `${rewriter}/books/emma/volume-1-chapter-1`,
    prepare: async (page) => {
      await page.getByRole("button", { name: "Open reading preferences" }).click();
      await page.waitForTimeout(800);
    },
  },
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
const selected = captures.filter((capture) => only.length === 0 || only.includes(capture.slug));
const manifest = await readManifest();
const browser = await chromium.launch({ headless: true });

try {
  for (const capture of selected) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.addInitScript(() => localStorage.clear());
    await page.goto(capture.url, { waitUntil: "networkidle", timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    await capture.prepare?.(page);
    await page.waitForTimeout(600);
    const image = await page.screenshot({ clip: capture.clip });
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
