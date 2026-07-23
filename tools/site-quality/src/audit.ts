import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium, type Page } from "playwright";
import { startServer, stopServer, waitForServer } from "./server-harness.ts";

const root = new URL("../../../", import.meta.url).pathname;
const targets = [
  {
    name: "website",
    cwd: join(root, "apps/website"),
    origin: "http://127.0.0.1:4173",
    port: "4173",
    routes: [
      "/",
      "/projects",
      "/projects/fpl",
      "/projects/mockpit",
      "/projects/rewriter",
      "/projects/openfgc",
      "/writing",
      "/writing/design-systems-accessibility",
      "/about",
      "/not-a-real-page",
    ],
    viewports: [
      { width: 320, height: 800 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1440, height: 1100 },
    ],
  },
  {
    name: "research",
    cwd: join(root, "apps/research"),
    origin: "http://127.0.0.1:4174",
    port: "4174",
    routes: [
      "/",
      "/papers/design-systems-accessibility",
      "/explore/uswds-a11y",
      "/explore/uswds-a11y?group=not-a-real-agency",
      "/explore/govuk-a11y",
      "/not-a-real-page",
    ],
    viewports: [
      { width: 320, height: 800 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1440, height: 1100 },
    ],
  },
  {
    name: "fpl-smoke",
    cwd: join(root, "apps/fpl"),
    origin: "http://127.0.0.1:4175",
    port: "4175",
    routes: [
      "/",
      "/opportunities?mode=forecast&view=auto&scenario=baseline&position=ALL&minSixty=0&snapshot=2",
      "/archive/2025-26/gw34",
      "/not-a-real-page",
    ],
    viewports: [{ width: 320, height: 800 }],
  },
] as const;

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.addInitScript((selectedTheme) => localStorage.setItem("theme", selectedTheme), theme);
}

async function auditPage(page: Page, url: string, theme: "light" | "dark", viewportWidth: number) {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  const response = await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
  if (!response || response.status() >= 500) {
    throw new Error(`${url} returned ${response?.status() ?? "no response"}`);
  }
  await page.locator("body").waitFor({ state: "visible" });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  if (overflow > 1) {
    throw new Error(`${url} overflows horizontally by ${overflow}px at ${viewportWidth}px`);
  }

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  if (results.violations.length > 0) {
    const summary = results.violations
      .map((violation) => `${violation.id} (${violation.nodes.length})`)
      .join(", ");
    throw new Error(`${url} [${theme}, ${viewportWidth}px] axe violations: ${summary}`);
  }

  const unexpectedConsoleErrors = consoleErrors.filter(
    (message) => !(response.status() === 404 && message.includes("status of 404")),
  );
  if (unexpectedConsoleErrors.length > 0) {
    throw new Error(
      `${url} [${theme}, ${viewportWidth}px] console errors: ${unexpectedConsoleErrors.join(" | ")}`,
    );
  }
}

const servers = targets.map(startServer);

try {
  await Promise.all(targets.map((target, index) => waitForServer(target.origin, servers[index]!)));
  const browser = await chromium.launch({ headless: true });
  let auditCount = 0;
  try {
    for (const target of targets) {
      for (const theme of ["dark", "light"] as const) {
        for (const viewport of target.viewports) {
          for (const route of target.routes) {
            const context = await browser.newContext({ viewport });
            const page = await context.newPage();
            await setTheme(page, theme);
            await auditPage(page, `${target.origin}${route}`, theme, viewport.width);
            await context.close();
            auditCount += 1;
          }
        }
      }
    }
  } finally {
    await browser.close();
  }
  console.log(
    `Browser audit passed: ${auditCount} route/theme/viewport combinations; portfolio and research at 320, 390, 768, and 1440px; FPL technical smoke only.`,
  );
} finally {
  servers.forEach(stopServer);
}
