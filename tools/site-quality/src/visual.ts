import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";
import { startServer, stopServer, waitForServer } from "./server-harness.ts";

const root = new URL("../../../", import.meta.url).pathname;
const outputRoot = join(root, "artifacts/quality/brand-refresh");
const servers = [
  { cwd: join(root, "apps/website"), origin: "http://127.0.0.1:4173", port: "4173" },
  { cwd: join(root, "apps/research"), origin: "http://127.0.0.1:4174", port: "4174" },
] as const;
const references = [
  {
    name: "portfolio-home",
    origin: servers[0].origin,
    route: "/",
    reference: "docs/brand-refresh/references/portfolio-home.png",
  },
  {
    name: "writing-article",
    origin: servers[0].origin,
    route: "/writing/design-systems-accessibility",
    reference: "docs/brand-refresh/references/writing-article.png",
  },
  {
    name: "research-lab",
    origin: servers[1].origin,
    route: "/",
    reference: "docs/brand-refresh/references/research-lab.png",
  },
  {
    name: "fpl-case-study",
    origin: servers[0].origin,
    route: "/projects/fpl",
    reference: "docs/brand-refresh/references/fpl-case-study.png",
  },
] as const;
const viewports = [
  { name: "desktop", width: 1440, height: 2035 },
  { name: "mobile", width: 390, height: 844 },
] as const;

interface FrameComparison {
  rgbMae: number;
  lumaMae: number;
  pixelsOver24: number;
}

function roundMetric(value: number): number {
  return Number(value.toFixed(2));
}

async function compareTopFrame(
  referencePath: string,
  actualPath: string,
  actualWidth: number,
  actualHeight: number,
): Promise<FrameComparison> {
  const metadata = await sharp(referencePath).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Reference has no dimensions: ${referencePath}`);
  }

  const reference = await sharp(referencePath).removeAlpha().raw().toBuffer();
  const actual = await sharp(actualPath)
    .extract({ left: 0, top: 0, width: actualWidth, height: actualHeight })
    .resize(metadata.width, metadata.height, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer();

  const pixelCount = metadata.width * metadata.height;
  let rgbDifference = 0;
  let lumaDifference = 0;
  let pixelsOver24 = 0;

  for (let offset = 0; offset < reference.length; offset += 3) {
    const red = Math.abs(reference[offset]! - actual[offset]!);
    const green = Math.abs(reference[offset + 1]! - actual[offset + 1]!);
    const blue = Math.abs(reference[offset + 2]! - actual[offset + 2]!);
    rgbDifference += red + green + blue;
    lumaDifference += Math.abs(
      0.2126 * reference[offset]! +
        0.7152 * reference[offset + 1]! +
        0.0722 * reference[offset + 2]! -
        (0.2126 * actual[offset]! + 0.7152 * actual[offset + 1]! + 0.0722 * actual[offset + 2]!),
    );
    if (Math.max(red, green, blue) > 24) pixelsOver24 += 1;
  }

  return {
    rgbMae: roundMetric(rgbDifference / (pixelCount * 3)),
    lumaMae: roundMetric(lumaDifference / pixelCount),
    pixelsOver24: roundMetric((pixelsOver24 / pixelCount) * 100),
  };
}

const processes = servers.map(startServer);
try {
  await Promise.all(
    servers.map((server, index) => waitForServer(server.origin, processes[index]!)),
  );
  const browser = await chromium.launch({ headless: true });
  const manifest: object[] = [];
  const comparisonReport: object[] = [];
  try {
    for (const theme of ["dark", "light"] as const) {
      for (const viewport of viewports) {
        for (const reference of references) {
          const context = await browser.newContext({
            viewport: { width: viewport.width, height: viewport.height },
            reducedMotion: "reduce",
          });
          const page = await context.newPage();
          await page.addInitScript(
            (selectedTheme) => localStorage.setItem("theme", selectedTheme),
            theme,
          );
          await page.goto(reference.origin + reference.route, {
            waitUntil: "networkidle",
            timeout: 30_000,
          });
          await page.evaluate(() => document.fonts.ready);
          await page.addStyleTag({
            content: "*,*::before,*::after{animation:none!important;transition:none!important}",
          });
          const directory = join(outputRoot, theme, viewport.name);
          await mkdir(directory, { recursive: true });
          const image = join(directory, reference.name + ".png");
          await page.screenshot({ path: image, fullPage: true });
          const metrics = await page.evaluate(() => ({
            width: document.documentElement.scrollWidth,
            height: document.documentElement.scrollHeight,
            theme: document.documentElement.dataset.theme,
          }));
          const comparison =
            theme === "dark" && viewport.name === "desktop"
              ? await compareTopFrame(
                  join(root, reference.reference),
                  image,
                  viewport.width,
                  viewport.height,
                )
              : undefined;
          if (comparison) {
            comparisonReport.push({
              name: reference.name,
              reference: reference.reference,
              actual: image,
              ...comparison,
            });
          }
          manifest.push({
            ...reference,
            theme,
            viewport: viewport.name,
            expectedWidth: viewport.width,
            image,
            metrics,
            comparison,
          });
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
  await writeFile(join(outputRoot, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  await writeFile(
    join(outputRoot, "comparison.json"),
    JSON.stringify(comparisonReport, null, 2) + "\n",
  );
  console.log(
    `Captured ${manifest.length} review images and compared ${comparisonReport.length} desktop frames in ${outputRoot}`,
  );
} finally {
  processes.forEach(stopServer);
}
