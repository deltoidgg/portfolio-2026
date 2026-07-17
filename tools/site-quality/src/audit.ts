import { spawn, type ChildProcess } from "node:child_process";
import { join } from "node:path";
import { kill } from "node:process";
import AxeBuilder from "@axe-core/playwright";
import { chromium, type Page } from "playwright";

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
      "/not-a-real-page",
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
  },
  {
    name: "fpl",
    cwd: join(root, "apps/fpl"),
    origin: "http://127.0.0.1:4175",
    port: "4175",
    routes: ["/", "/not-a-real-page"],
  },
] as const;

const servers: ChildProcess[] = [];

function startServer(target: (typeof targets)[number]) {
  const process = spawn("vp", ["dev", "--host", "127.0.0.1", "--port", target.port], {
    cwd: target.cwd,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  servers.push(process);
  return process;
}

async function waitForServer(origin: string, process: ChildProcess) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) throw new Error(`Dev server stopped with ${process.exitCode}`);
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${origin}`);
}

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.addInitScript((selectedTheme) => localStorage.setItem("theme", selectedTheme), theme);
}

async function auditPage(page: Page, url: string, theme: "light" | "dark") {
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
  if (overflow > 1) throw new Error(`${url} overflows horizontally by ${overflow}px at 320px`);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  if (results.violations.length > 0) {
    const summary = results.violations
      .map((violation) => `${violation.id} (${violation.nodes.length})`)
      .join(", ");
    throw new Error(`${url} [${theme}] axe violations: ${summary}`);
  }
  const unexpectedConsoleErrors = consoleErrors.filter(
    (message) => !(response.status() === 404 && message.includes("status of 404")),
  );
  if (unexpectedConsoleErrors.length > 0) {
    throw new Error(`${url} [${theme}] console errors: ${unexpectedConsoleErrors.join(" | ")}`);
  }
}

for (const target of targets) startServer(target);

try {
  await Promise.all(targets.map((target, index) => waitForServer(target.origin, servers[index]!)));
  const browser = await chromium.launch({ headless: true });
  try {
    for (const target of targets) {
      for (const theme of ["dark", "light"] as const) {
        for (const route of target.routes) {
          const context = await browser.newContext({ viewport: { width: 320, height: 800 } });
          const page = await context.newPage();
          await setTheme(page, theme);
          await auditPage(page, `${target.origin}${route}`, theme);
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
  console.log(
    `Browser audit passed: ${targets.reduce((sum, target) => sum + target.routes.length, 0)} routes, light and dark themes, 320px viewport.`,
  );
} finally {
  for (const process of servers) {
    if (process.pid) {
      try {
        kill(-process.pid, "SIGTERM");
      } catch {
        process.kill("SIGTERM");
      }
    }
  }
}
