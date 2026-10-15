import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const root = new URL("../../../", import.meta.url).pathname;
const fontFiles = join(root, "apps/website/node_modules");
const serif = (
  await readFile(
    join(fontFiles, "@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2"),
  )
).toString("base64");
const sans = (
  await readFile(join(fontFiles, "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2"))
).toString("base64");
const website = join(root, "apps/website/public/social");
const research = join(root, "apps/research/public/social");
const projectMedia = join(root, "apps/website/public/projects");

interface SocialCard {
  output: string;
  title: string;
  detail: string;
  /** A project screenshot, relative to apps/website/public/projects, without the width suffix. */
  image?: string;
}

const cards: SocialCard[] = [
  {
    output: join(website, "default.png"),
    title: "Wasim Arif",
    detail: "Product and design engineer in London. Projects, writing and research.",
  },
  {
    output: join(website, "projects.png"),
    title: "Work",
    detail: "A reading app, a Fantasy Premier League lab, devtools and a fighting game stats site.",
    image: "rewriter/library",
  },
  {
    output: join(website, "fpl.png"),
    title: "FPL Lab",
    detail:
      "Betting odds turned into FPL points forecasts, and a squad builder that knows the rules.",
    image: "fpl/squad",
  },
  {
    output: join(website, "mockpit.png"),
    title: "MockPit",
    detail: "Devtools that show what a screen is really made of.",
    image: "mockpit/devtools",
  },
  {
    output: join(website, "rewriter.png"),
    title: "Rewriter",
    detail: "Classic novels rewritten for younger readers, and read aloud.",
    image: "rewriter/reader",
  },
  {
    output: join(website, "openfgc.png"),
    title: "OpenFGC",
    detail: "Steam, Twitch and tournament stats for fighting game organisers.",
    image: "openfgc/overview",
  },
  {
    output: join(research, "research.png"),
    title: "Research",
    detail:
      "Pre-registered studies on design systems and web accessibility, with open data and code.",
  },
  {
    output: join(research, "paper-design-systems.png"),
    title: "Do design systems deliver accessibility at scale?",
    detail: "A pre-registered study of 18,547 government websites in the US and UK.",
  },
];

async function imageData(name: string): Promise<string> {
  const file = await readFile(join(projectMedia, `${name}-1280.webp`)).catch(() =>
    readFile(join(projectMedia, `${name}-640.webp`)),
  );
  return `data:image/webp;base64,${file.toString("base64")}`;
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const card of cards) {
    const image = card.image ? await imageData(card.image) : null;
    await page.setContent(`<!doctype html><html><head><style>
      @font-face{font-family:CardSerif;src:url("data:font/woff2;base64,${serif}") format("woff2")}
      @font-face{font-family:CardSans;src:url("data:font/woff2;base64,${sans}") format("woff2");font-weight:100 900}
      *{box-sizing:border-box}html,body{width:1200px;height:630px;margin:0;overflow:hidden}
      body{background:#101112;color:#f1eee8;font-family:CardSans,system-ui,sans-serif}
      main{position:relative;display:flex;height:100%;flex-direction:column;justify-content:space-between;padding:72px 76px 64px}
      .copy{position:relative;z-index:1;max-width:${image ? "500px" : "900px"}}
      h1{margin:0;font:400 ${image ? "88px" : "104px"}/0.95 CardSerif,Georgia,serif;letter-spacing:-0.02em;text-wrap:balance}
      p{margin:28px 0 0;color:#b3afa7;font-size:27px;line-height:1.4;text-wrap:pretty}
      .site{position:relative;z-index:1;color:#8c8880;font-size:21px}
      .shot{position:absolute;top:84px;left:620px;width:760px;border:1px solid #3a3c40;border-radius:18px;overflow:hidden;box-shadow:0 24px 80px rgb(0 0 0 / .45)}
      .shot img{display:block;width:100%}
    </style></head><body><main>
      <div class="copy"><h1>${card.title}</h1><p>${card.detail}</p></div>
      <div class="site">${card.output.startsWith(research) ? "research.wasimarif.com" : "wasimarif.com"}</div>
      ${image ? `<div class="shot"><img src="${image}" alt=""></div>` : ""}
    </main></body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: card.output, type: "png" });
    console.log(`wrote ${card.output}`);
  }
} finally {
  await browser.close();
}
