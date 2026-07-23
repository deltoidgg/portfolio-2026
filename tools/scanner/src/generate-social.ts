import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const root = new URL("../../../", import.meta.url).pathname;
const serifPath = join(
  root,
  "apps/website/node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2",
);
const serif = (await readFile(serifPath)).toString("base64");
const website = join(root, "apps/website/public/social");
const research = join(root, "apps/research/public/social");

interface SocialCard {
  output: string;
  eyebrow: string;
  title: string;
  detail: string;
  code: string;
}

const cards: SocialCard[] = [
  {
    output: join(website, "default.png"),
    eyebrow: "WASIM ARIF / PRODUCT ENGINEER",
    title: "Open research.\nInspectable systems.",
    detail: "Product engineering / technical writing / London",
    code: "PORTFOLIO / 2026",
  },
  {
    output: join(website, "projects.png"),
    eyebrow: "SELECTED WORK",
    title: "Products with\ninspectable decisions.",
    detail: "FPL Market Intelligence / MockPit / Rewriter / OpenFGC",
    code: "WORK / 01-04",
  },
  {
    output: join(website, "fpl.png"),
    eyebrow: "CASE STUDY / DATA EXPERIMENT",
    title: "FPL Market\nIntelligence",
    detail: "From market evidence to inspectable player forecasts",
    code: "CASE / 01",
  },
  {
    output: join(website, "mockpit.png"),
    eyebrow: "CASE STUDY / DEVELOPER TOOL",
    title: "MockPit",
    detail: "Runtime provenance for AI-assisted prototypes",
    code: "CASE / 02",
  },
  {
    output: join(website, "rewriter.png"),
    eyebrow: "CASE STUDY / AI PRODUCT",
    title: "Rewriter",
    detail: "A calmer way into difficult literature",
    code: "CASE / 03",
  },
  {
    output: join(website, "openfgc.png"),
    eyebrow: "CASE STUDY / DATA PRODUCT",
    title: "OpenFGC",
    detail: "Fighting-game analytics for smaller organisers",
    code: "CASE / 04",
  },
  {
    output: join(research, "research.png"),
    eyebrow: "WASIM ARIF / RESEARCH LAB",
    title: "Open research.\nInspectable evidence.",
    detail: "Pre-registered analysis / versioned data / in-browser exploration",
    code: "RESEARCH / 2026",
  },
  {
    output: join(research, "paper-design-systems.png"),
    eyebrow: "PAPER 01 / JUNE 2026",
    title: "Do design systems deliver\naccessibility at scale?",
    detail: "18,547 government websites / pre-registered US-UK replication",
    code: "PAPER / 01",
  },
];

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const card of cards) {
    const title = card.title
      .split("\n")
      .map((line) => `<span>${line}</span>`)
      .join("");
    await page.setContent(`<!doctype html><html><head><style>
      @font-face{font-family:Instrument;src:url("data:font/woff2;base64,${serif}") format("woff2")}
      *{box-sizing:border-box}html,body{width:1200px;height:630px;margin:0;overflow:hidden}
      body{background:#020810;color:#f3f1ec;font-family:ui-sans-serif,system-ui,sans-serif}
      main{position:relative;width:100%;height:100%;padding:68px 76px 62px;display:grid;grid-template-rows:auto 1fr auto;border:1px solid #18222c;overflow:hidden}
      main:before{content:"";position:absolute;inset:0;opacity:.4;background:radial-gradient(circle at 85% 12%,#00c78d24,transparent 31%),linear-gradient(#ffffff05 1px,transparent 1px),linear-gradient(90deg,#ffffff05 1px,transparent 1px);background-size:auto,54px 54px,54px 54px}
      main:after{content:"";position:absolute;inset:18px;border:1px solid #18222c}
      .masthead,h1,.footer{position:relative;z-index:1}
      .masthead{display:flex;justify-content:space-between;color:#00d597;font:650 16px/1.2 ui-monospace,monospace;letter-spacing:.13em}
      .mark{color:#f3f1ec;font:400 28px/1 Instrument,Georgia,serif;letter-spacing:-.06em}
      h1{align-self:center;margin:10px 0 0;max-width:990px;font:400 78px/.92 Instrument,Georgia,serif;letter-spacing:-.045em;text-wrap:balance}
      h1 span{display:block}h1 span:last-child:after{content:".";color:#00c78d}
      .footer{display:flex;justify-content:space-between;align-items:end;gap:48px;border-top:1px solid #2a3641;padding-top:22px}
      .detail{color:#9b9ea4;font-size:21px;line-height:1.35}.code{flex:none;color:#69717a;font:600 13px/1 ui-monospace,monospace;letter-spacing:.12em}
      .signal{position:absolute;right:76px;top:155px;width:88px;height:88px;border:1px solid #00c78d55;border-radius:50%}
      .signal:before,.signal:after{content:"";position:absolute;inset:16px;border:1px solid #00c78d33;border-radius:inherit}.signal:after{inset:34px;background:#00c78d;box-shadow:0 0 18px #00c78d}
    </style></head><body><main><div class="signal"></div><div class="masthead"><span>${card.eyebrow}</span><span class="mark">WA</span></div><h1>${title}</h1><div class="footer"><div class="detail">${card.detail}</div><div class="code">${card.code}</div></div></main></body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: card.output, type: "png" });
  }
} finally {
  await browser.close();
}
