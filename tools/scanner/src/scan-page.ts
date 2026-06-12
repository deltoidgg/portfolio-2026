/**
 * Per-site scan, UK_SCAN_RECIPE.md §3–§5 and §7: robots check, https probe, single
 * Playwright page load, CSS capture, govuk-frontend detection, axe-core run with GSA
 * category aggregation, and covariates.
 */
import type { Browser, Page, Response } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { aggregateViolations, type AggregatedViolations } from "./a11y.ts";
import { detectGovuk, type GovukDetection } from "./detect.ts";
import type { UniverseSite } from "./universe.ts";

export type ScanStatus =
  | "completed"
  | "dns_resolution_error"
  | "timeout"
  | "connection_refused"
  | "connection_reset"
  | "ssl_error"
  | "invalid_response"
  | "blocked_robots"
  | "blocked_waf"
  | "other_error";

export interface ScanRow extends GovukDetection {
  hostname: string;
  url: string;
  orgName: string | null;
  orgType: string;
  source: string;
  nation: string;
  scannedAt: string;
  scanDurationMs: number;
  status: ScanStatus;
  error: string | null;
  httpStatus: number | null;
  finalUrl: string | null;
  finalHostname: string | null;
  redirectCount: number;
  offsiteRedirect: boolean;
  httpsEnforced: boolean | null;
  hsts: boolean;
  thirdPartyServiceCount: number | null;
  viewportMetaTag: boolean;
  mainElementPresent: boolean;
  htmlLang: string | null;
  cmsGenerator: string | null;
  pageTitle: string | null;
  lcpMs: number | null;
  cls: number | null;
  axeVersion: string | null;
  axeError: string | null;
  violationsTotal: number | null;
  violationCategories: Record<string, number> | null;
  ruleNodeCounts: Record<string, number> | null;
  unmappedRules: string[] | null;
}

const NAV_TIMEOUT_MS = 30_000;
const RETRY_TIMEOUT_MS = 15_000;
const SETTLE_MS = 3_000;
const AXE_TIMEOUT_MS = 90_000;
const SITE_CAP_MS = 180_000;
const MAX_CSS_FILES = 30;
const MAX_CSS_BYTES = 2_000_000;

const WAF_TITLE_RE =
  /just a moment|attention required|access denied|request blocked|pardon our interruption|checking your browser|verify you are human/i;

const TWO_PART_SUFFIXES = new Set([
  "gov.uk",
  "co.uk",
  "org.uk",
  "ac.uk",
  "net.uk",
  "sch.uk",
  "nhs.uk",
  "police.uk",
  "mod.uk",
  "me.uk",
  "ltd.uk",
  "plc.uk",
  "gov.scot",
  "gov.wales",
]);

export function registrableDomain(hostname: string): string {
  const labels = hostname.toLowerCase().split(".");
  if (labels.length <= 2) return hostname.toLowerCase();
  const lastTwo = labels.slice(-2).join(".");
  if (TWO_PART_SUFFIXES.has(lastTwo)) return labels.slice(-3).join(".");
  return lastTwo;
}

/** Recipe §3: robots.txt honoured for the homepage path. */
export async function isRootDisallowed(hostname: string): Promise<boolean> {
  let body: string;
  try {
    const response = await fetch(`https://${hostname}/robots.txt`, {
      signal: AbortSignal.timeout(10_000),
      headers: { "X-Research-Scan": RESEARCH_HEADER },
    });
    if (!response.ok) return false;
    body = (await response.text()).slice(0, 500_000);
  } catch {
    return false;
  }
  let appliesToUs = false;
  const disallowed: string[] = [];
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [keyRaw, ...rest] = line.split(":");
    const key = keyRaw.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      appliesToUs = value === "*";
    } else if (key === "disallow" && appliesToUs) {
      disallowed.push(value);
    }
  }
  return disallowed.some((prefix) => prefix !== "" && "/".startsWith(prefix));
}

/** Probe http:// variant: does it redirect to https? */
async function probeHttpsEnforced(hostname: string): Promise<boolean | null> {
  try {
    const response = await fetch(`http://${hostname}/`, {
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: { "X-Research-Scan": RESEARCH_HEADER },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location") ?? "";
      return location.startsWith("https://");
    }
    return false;
  } catch {
    return null;
  }
}

export const RESEARCH_HEADER = "wasimarif.com research scan; contact wasim.arif@live.co.uk";

function classifyNavigationError(error: unknown): { status: ScanStatus; message: string } {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("ERR_NAME_NOT_RESOLVED")) {
    return { status: "dns_resolution_error", message };
  }
  if (message.includes("Timeout") || message.includes("timeout")) {
    return { status: "timeout", message };
  }
  if (message.includes("ERR_CONNECTION_REFUSED")) {
    return { status: "connection_refused", message };
  }
  if (message.includes("ERR_CONNECTION_RESET") || message.includes("ERR_CONNECTION_CLOSED")) {
    return { status: "connection_reset", message };
  }
  if (message.includes("ERR_CERT") || message.includes("ERR_SSL") || message.includes("SSL")) {
    return { status: "ssl_error", message };
  }
  return { status: "other_error", message };
}

interface DomStats {
  govukElementCount: number;
  govukClassesUnique: string;
  jsVersion: string | null;
  phaseBanner: boolean;
  cookieBanner: boolean;
  viewportMeta: boolean;
  mainElement: boolean;
  htmlLang: string | null;
  generator: string | null;
  title: string;
}

async function collectDomStats(page: Page): Promise<DomStats> {
  return page.evaluate(() => {
    const elements = [...document.querySelectorAll("[class^='govuk-']")];
    const classList = elements.flatMap((element) => [...element.classList]);
    const filtered = classList.filter(
      (cls) => cls.startsWith("govuk-") && !cls.includes("--") && !cls.includes("__"),
    );
    const unique = [...new Set(filtered)].sort().join(",");
    const govukFrontend = (window as unknown as { GOVUKFrontend?: { version?: unknown } })
      .GOVUKFrontend;
    return {
      govukElementCount: elements.length,
      govukClassesUnique: unique,
      jsVersion:
        govukFrontend && typeof govukFrontend.version === "string" ? govukFrontend.version : null,
      phaseBanner: document.querySelector(".govuk-phase-banner") !== null,
      cookieBanner: document.querySelector(".govuk-cookie-banner") !== null,
      viewportMeta: document.querySelector("meta[name='viewport']") !== null,
      mainElement: document.querySelector("main") !== null,
      htmlLang: document.documentElement.getAttribute("lang"),
      generator: document.querySelector("meta[name='generator']")?.getAttribute("content") ?? null,
      title: document.title,
    };
  });
}

async function collectWebVitals(page: Page): Promise<{ lcpMs: number | null; cls: number | null }> {
  try {
    return await page.evaluate(
      () =>
        new Promise<{ lcpMs: number | null; cls: number | null }>((resolve) => {
          let lcp: number | null = null;
          let clsTotal = 0;
          let clsSeen = false;
          try {
            new PerformanceObserver((list) => {
              const entries = list.getEntries();
              if (entries.length > 0) lcp = entries[entries.length - 1].startTime;
            }).observe({ type: "largest-contentful-paint", buffered: true });
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                const shift = entry as unknown as { hadRecentInput: boolean; value: number };
                clsSeen = true;
                if (!shift.hadRecentInput) clsTotal += shift.value;
              }
            }).observe({ type: "layout-shift", buffered: true });
          } catch {
            resolve({ lcpMs: null, cls: null });
            return;
          }
          setTimeout(() => resolve({ lcpMs: lcp, cls: clsSeen ? clsTotal : 0 }), 600);
        }),
    );
  } catch {
    return { lcpMs: null, cls: null };
  }
}

function emptyDetection(): GovukDetection {
  return {
    govukClasses: 0,
    govukString: 0,
    govukInlineCss: 0,
    govukCrownAssets: 0,
    govukCrownInCss: 0,
    govukStringInCss: 0,
    govukTransportFont: 0,
    govukVersionPoints: 0,
    govukCount: 0,
    govukSemanticVersion: null,
    govukVersionMajor: null,
    govukClassesUnique: "",
    govukPhaseBanner: false,
    govukCookieBanner: false,
  };
}

function baseRow(site: UniverseSite, startedAt: number): ScanRow {
  return {
    hostname: site.hostname,
    url: site.url,
    orgName: site.orgName,
    orgType: site.orgType,
    source: site.source,
    nation: site.nation,
    scannedAt: new Date(startedAt).toISOString(),
    scanDurationMs: 0,
    status: "other_error",
    error: null,
    httpStatus: null,
    finalUrl: null,
    finalHostname: null,
    redirectCount: 0,
    offsiteRedirect: false,
    httpsEnforced: null,
    hsts: false,
    thirdPartyServiceCount: null,
    viewportMetaTag: false,
    mainElementPresent: false,
    htmlLang: null,
    cmsGenerator: null,
    pageTitle: null,
    lcpMs: null,
    cls: null,
    axeVersion: null,
    axeError: null,
    violationsTotal: null,
    violationCategories: null,
    ruleNodeCounts: null,
    unmappedRules: null,
    ...emptyDetection(),
  };
}

async function scanSiteInner(browser: Browser, site: UniverseSite): Promise<ScanRow> {
  const startedAt = Date.now();
  const row = baseRow(site, startedAt);

  if (await isRootDisallowed(site.hostname)) {
    row.status = "blocked_robots";
    row.scanDurationMs = Date.now() - startedAt;
    return row;
  }

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    extraHTTPHeaders: { "X-Research-Scan": RESEARCH_HEADER },
  });
  context.setDefaultTimeout(NAV_TIMEOUT_MS);
  const page = await context.newPage();

  const cssBodies: string[] = [];
  const cssBodyPromises: Array<Promise<void>> = [];
  const resourceUrls: string[] = [];

  page.on("request", (request) => {
    if (resourceUrls.length < 2000) resourceUrls.push(request.url());
  });
  page.on("response", (response: Response) => {
    if (cssBodyPromises.length >= MAX_CSS_FILES) return;
    const contentType = response.headers()["content-type"] ?? "";
    const url = response.url();
    if (contentType.includes("text/css") || url.split("?")[0].endsWith(".css")) {
      cssBodyPromises.push(
        response
          .text()
          .then((text) => {
            cssBodies.push(text.slice(0, MAX_CSS_BYTES));
          })
          .catch(() => {}),
      );
    }
  });

  try {
    let mainResponse: Response | null = null;
    const attempts: Array<{ waitUntil: "load" | "domcontentloaded"; timeout: number }> = [
      { waitUntil: "load", timeout: NAV_TIMEOUT_MS },
      { waitUntil: "domcontentloaded", timeout: RETRY_TIMEOUT_MS },
    ];
    let lastError: { status: ScanStatus; message: string } | null = null;
    for (const attempt of attempts) {
      try {
        mainResponse = await page.goto(site.url, attempt);
        lastError = null;
        break;
      } catch (error) {
        lastError = classifyNavigationError(error);
        // Recipe §3: one retry, only for timeout / connection_reset.
        if (lastError.status !== "timeout" && lastError.status !== "connection_reset") break;
      }
    }
    if (lastError || !mainResponse) {
      row.status = lastError?.status ?? "other_error";
      row.error = lastError?.message.slice(0, 500) ?? "no response";
      return row;
    }

    await page.waitForTimeout(SETTLE_MS);

    row.httpStatus = mainResponse.status();
    row.finalUrl = page.url();
    row.finalHostname = new URL(page.url()).hostname.toLowerCase();
    let redirectCount = 0;
    let request = mainResponse.request();
    while (request.redirectedFrom()) {
      redirectCount += 1;
      request = request.redirectedFrom()!;
    }
    row.redirectCount = redirectCount;
    row.offsiteRedirect = registrableDomain(row.finalHostname) !== registrableDomain(site.hostname);
    row.hsts = (mainResponse.headers()["strict-transport-security"] ?? "") !== "";

    const htmlText = await mainResponse.text().catch(() => "");
    await Promise.allSettled(cssBodyPromises);

    const domStats = await collectDomStats(page);
    row.pageTitle = domStats.title || null;
    row.viewportMetaTag = domStats.viewportMeta;
    row.mainElementPresent = domStats.mainElement;
    row.htmlLang = domStats.htmlLang;
    row.cmsGenerator = domStats.generator;

    if (row.httpStatus < 200 || row.httpStatus >= 300) {
      row.status = WAF_TITLE_RE.test(domStats.title) ? "blocked_waf" : "invalid_response";
      return row;
    }
    if (WAF_TITLE_RE.test(domStats.title)) {
      row.status = "blocked_waf";
      return row;
    }

    const detection = detectGovuk({
      htmlText,
      cssBodies,
      resourceUrls,
      dom: {
        govukElementCount: domStats.govukElementCount,
        govukClassesUnique: domStats.govukClassesUnique,
        jsVersion: domStats.jsVersion,
        phaseBanner: domStats.phaseBanner,
        cookieBanner: domStats.cookieBanner,
      },
    });
    Object.assign(row, detection);

    const finalRegistrable = registrableDomain(row.finalHostname);
    const thirdPartyDomains = new Set<string>();
    for (const url of resourceUrls) {
      try {
        const requestRegistrable = registrableDomain(new URL(url).hostname);
        if (requestRegistrable !== finalRegistrable) thirdPartyDomains.add(requestRegistrable);
      } catch {
        // ignore non-http(s) urls
      }
    }
    row.thirdPartyServiceCount = thirdPartyDomains.size;

    const vitals = await collectWebVitals(page);
    row.lcpMs = vitals.lcpMs;
    row.cls = vitals.cls;
    row.httpsEnforced = await probeHttpsEnforced(site.hostname);

    try {
      const axeResults = (await Promise.race([
        new AxeBuilder({ page }).analyze(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("axe timeout")), AXE_TIMEOUT_MS),
        ),
      ])) as {
        violations: Array<{ id: string; nodes: Array<unknown> }>;
        testEngine?: { version?: string };
      };
      const aggregated: AggregatedViolations = aggregateViolations(axeResults.violations);
      row.axeVersion = axeResults.testEngine?.version ?? null;
      row.violationsTotal = aggregated.total;
      row.violationCategories = aggregated.categories;
      row.ruleNodeCounts = aggregated.ruleNodeCounts;
      row.unmappedRules = aggregated.unmappedRules;
      row.status = "completed";
    } catch (error) {
      row.status = "other_error";
      row.axeError = (error instanceof Error ? error.message : String(error)).slice(0, 500);
    }
    return row;
  } catch (error) {
    const classified = classifyNavigationError(error);
    row.status = classified.status;
    row.error = classified.message.slice(0, 500);
    return row;
  } finally {
    row.scanDurationMs = Date.now() - startedAt;
    await context.close().catch(() => {});
  }
}

export async function scanSite(browser: Browser, site: UniverseSite): Promise<ScanRow> {
  const capped = new Promise<ScanRow>((resolve) => {
    setTimeout(() => {
      const row = baseRow(site, Date.now());
      row.status = "other_error";
      row.error = "site scan cap exceeded";
      resolve(row);
    }, SITE_CAP_MS);
  });
  return Promise.race([scanSiteInner(browser, site), capped]);
}
