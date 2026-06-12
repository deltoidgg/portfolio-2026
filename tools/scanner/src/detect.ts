/**
 * govuk-frontend detection score, UK_SCAN_RECIPE.md §5 — a structural mirror of GSA's
 * uswds_count (libs/core-scanner/src/scans/uswds.ts): same component shape, caps, weights
 * and sqrt scaling, with USWDS-specific signals translated to govuk-frontend analogues.
 */

export interface DomDetectionStats {
  /** count of document.querySelectorAll("[class^='govuk-']") — same selector semantics as GSA */
  govukElementCount: number;
  /** sorted unique block-level govuk-* classes (no `__` / `--`), GSA usaClassesUsed analogue */
  govukClassesUnique: string;
  /** window.GOVUKFrontend?.version ?? null */
  jsVersion: string | null;
  phaseBanner: boolean;
  cookieBanner: boolean;
}

export interface DetectionInputs {
  htmlText: string;
  cssBodies: string[];
  resourceUrls: string[];
  dom: DomDetectionStats;
}

export interface GovukDetection {
  govukClasses: number;
  govukString: number;
  govukInlineCss: number;
  govukCrownAssets: number;
  govukCrownInCss: number;
  govukStringInCss: number;
  govukTransportFont: number;
  govukVersionPoints: number;
  govukCount: number;
  govukSemanticVersion: string | null;
  govukVersionMajor: number | null;
  govukClassesUnique: string;
  govukPhaseBanner: boolean;
  govukCookieBanner: boolean;
}

const CROWN_ASSET_RE =
  /govuk-crest|govuk-icon-|govuk-mask-icon|govuk-apple-touch|govuk-opengraph-image/;
const CSS_VERSION_RE = /--govuk-frontend-version:\s*"?([0-9][0-9.]*)"?/;
const ASSET_VERSION_RE = /govuk-frontend-([0-9][0-9.]*?)(?:\.min)?\.(?:css|js)\b/;

function countMatches(text: string, re: RegExp): number {
  return [...text.matchAll(re)].length;
}

export function detectVersion(inputs: DetectionInputs): string | null {
  const versions: string[] = [];
  for (const css of inputs.cssBodies) {
    const match = css.match(CSS_VERSION_RE);
    if (match) versions.push(match[1]);
  }
  for (const url of inputs.resourceUrls) {
    const match = url.match(ASSET_VERSION_RE);
    if (match) versions.push(match[1]);
  }
  if (inputs.dom.jsVersion && /^[0-9][0-9.]*$/.test(inputs.dom.jsVersion)) {
    versions.push(inputs.dom.jsVersion);
  }
  const unique = [...new Set(versions.map((v) => v.replace(/\.$/, "")))];
  return unique[0] ?? null;
}

export function detectGovuk(inputs: DetectionInputs): GovukDetection {
  const { htmlText, cssBodies, dom } = inputs;

  const govukClasses = Math.round(Math.sqrt(dom.govukElementCount)) * 5;
  const govukString = countMatches(htmlText, /govuk-frontend/g);
  const govukInlineCss = countMatches(htmlText, /\.govuk-/g);
  const govukCrownAssets = CROWN_ASSET_RE.test(htmlText) ? 20 : 0;
  const govukCrownInCss = cssBodies.some((css) => CROWN_ASSET_RE.test(css)) ? 20 : 0;
  const govukStringInCss = cssBodies.some((css) => /govuk-frontend/i.test(css)) ? 20 : 0;
  const govukTransportFont = cssBodies.some((css) => /GDS.?Transport/i.test(css)) ? 40 : 0;

  const govukSemanticVersion = detectVersion(inputs);
  const govukVersionPoints = govukSemanticVersion ? 100 : 0;
  const majorText = govukSemanticVersion?.split(".")[0];
  const govukVersionMajor = majorText ? Number.parseInt(majorText, 10) : null;

  const govukCount =
    govukClasses +
    govukString +
    govukInlineCss +
    govukCrownAssets +
    govukCrownInCss +
    govukStringInCss +
    govukTransportFont +
    govukVersionPoints;

  return {
    govukClasses,
    govukString,
    govukInlineCss,
    govukCrownAssets,
    govukCrownInCss,
    govukStringInCss,
    govukTransportFont,
    govukVersionPoints,
    govukCount,
    govukSemanticVersion,
    govukVersionMajor: Number.isNaN(govukVersionMajor) ? null : govukVersionMajor,
    govukClassesUnique: dom.govukClassesUnique,
    govukPhaseBanner: dom.phaseBanner,
    govukCookieBanner: dom.cookieBanner,
  };
}
