import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const root = new URL("../../../", import.meta.url).pathname;
const websiteOutput = join(root, "apps/website/public/social");
const researchOutput = join(root, "apps/research/public/social");

const cards = [
  {
    output: join(websiteOutput, "default.png"),
    eyebrow: "WASIM ARIF · SOFTWARE ENGINEER",
    title: "Product thinking.\nDesign engineering craft.",
    detail: "AI products · accessible interfaces · data systems",
    accent: "#79e0c3",
  },
  {
    output: join(websiteOutput, "projects.png"),
    eyebrow: "SELECTED WORK",
    title: "Products with\ninspectable decisions.",
    detail: "FPL Market Intelligence · MockPit · Rewriter · OpenFGC",
    accent: "#79e0c3",
  },
  {
    output: join(websiteOutput, "fpl.png"),
    eyebrow: "CASE STUDY · DATA EXPERIMENT",
    title: "FPL Market\nIntelligence",
    detail: "From market evidence to inspectable player forecasts",
    accent: "#75e5d3",
  },
  {
    output: join(websiteOutput, "mockpit.png"),
    eyebrow: "CASE STUDY · DEVELOPER TOOL",
    title: "MockPit",
    detail: "Runtime provenance for AI-assisted prototypes",
    accent: "#b9a7ff",
  },
  {
    output: join(websiteOutput, "rewriter.png"),
    eyebrow: "CASE STUDY · AI PRODUCT",
    title: "Rewriter",
    detail: "A calmer way into difficult literature",
    accent: "#efb57c",
  },
  {
    output: join(websiteOutput, "openfgc.png"),
    eyebrow: "CASE STUDY · DATA PRODUCT",
    title: "OpenFGC",
    detail: "Fighting-game analytics for smaller organisers",
    accent: "#77b8ff",
  },
  {
    output: join(researchOutput, "research.png"),
    eyebrow: "RESEARCH · WASIM ARIF",
    title: "Open research.\nInspectable systems.",
    detail: "Pre-registered analysis · versioned data · in-browser exploration",
    accent: "#79e0c3",
  },
  {
    output: join(researchOutput, "paper-design-systems.png"),
    eyebrow: "PAPER 01 · JUNE 2026",
    title: "Do design systems deliver\naccessibility at scale?",
    detail: "18,547 government websites · pre-registered US–UK replication",
    accent: "#79e0c3",
  },
] as const;

await Promise.all([
  mkdir(websiteOutput, { recursive: true }),
  mkdir(researchOutput, { recursive: true }),
]);
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  for (const card of cards) {
    const title = card.title
      .split("\n")
      .map((line) => `<span>${line}</span>`)
      .join("");
    await page.setContent(`<!doctype html>
      <html><head><style>
        * { box-sizing: border-box; }
        html, body { width: 1200px; height: 630px; margin: 0; overflow: hidden; }
        body { background: #090b0f; color: #f7f8fa; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
        main { position: relative; width: 100%; height: 100%; padding: 76px 84px; display: flex; flex-direction: column; justify-content: space-between; }
        main::before { content: ""; position: absolute; inset: 0; background: radial-gradient(circle at 87% 16%, ${card.accent}33, transparent 34%), linear-gradient(135deg, transparent 50%, ${card.accent}0c); }
        main::after { content: "WA"; position: absolute; right: 76px; bottom: 52px; color: ${card.accent}; font: 700 28px/1 ui-monospace, monospace; letter-spacing: -0.08em; }
        .eyebrow { position: relative; color: ${card.accent}; font: 600 18px/1.3 ui-monospace, monospace; letter-spacing: .14em; }
        h1 { position: relative; margin: 0; max-width: 930px; font-size: 70px; line-height: .98; letter-spacing: -.055em; font-weight: 650; }
        h1 span { display: block; }
        .detail { position: relative; max-width: 860px; color: #aeb6c3; font-size: 24px; line-height: 1.35; }
        .rule { position: absolute; left: 84px; top: 52px; width: 48px; height: 3px; background: ${card.accent}; }
      </style></head><body><main><div class="rule"></div><div class="eyebrow">${card.eyebrow}</div><h1>${title}</h1><div class="detail">${card.detail}</div></main></body></html>`);
    await page.screenshot({ path: card.output, type: "png" });
  }
} finally {
  await browser.close();
}
