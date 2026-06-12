import { describe, expect, it } from "vitest";
import { detectGovuk, type DetectionInputs } from "../src/detect.ts";
import { aggregateViolations } from "../src/a11y.ts";
import { registrableDomain, isRootDisallowed } from "../src/scan-page.ts";

function inputs(overrides: Partial<DetectionInputs> = {}): DetectionInputs {
  return {
    htmlText: "",
    cssBodies: [],
    resourceUrls: [],
    dom: {
      govukElementCount: 0,
      govukClassesUnique: "",
      jsVersion: null,
      phaseBanner: false,
      cookieBanner: false,
    },
    ...overrides,
  };
}

describe("detectGovuk", () => {
  it("scores zero on a plain page", () => {
    const result = detectGovuk(inputs({ htmlText: "<html><body>hello</body></html>" }));
    expect(result.govukCount).toBe(0);
    expect(result.govukSemanticVersion).toBeNull();
  });

  it("applies GSA sqrt scaling to element counts", () => {
    // round(sqrt(144)) * 5 = 60 — mirrors usaClassesCount
    const result = detectGovuk(inputs({ dom: { ...inputs().dom, govukElementCount: 144 } }));
    expect(result.govukClasses).toBe(60);
    expect(result.govukCount).toBe(60);
  });

  it("detects version from CSS custom property (govuk-frontend >= 5)", () => {
    const css = `:root{--govuk-frontend-version:"5.13.0";} .govuk-button{color:red}`;
    const result = detectGovuk(inputs({ cssBodies: [css] }));
    expect(result.govukSemanticVersion).toBe("5.13.0");
    expect(result.govukVersionMajor).toBe(5);
    expect(result.govukVersionPoints).toBe(100);
  });

  it("detects version from hosted asset filename", () => {
    const result = detectGovuk(
      inputs({ resourceUrls: ["https://example.gov.uk/assets/govuk-frontend-4.7.0.min.css"] }),
    );
    expect(result.govukSemanticVersion).toBe("4.7.0");
    expect(result.govukVersionMajor).toBe(4);
  });

  it("falls back to window.GOVUKFrontend.version", () => {
    const result = detectGovuk(inputs({ dom: { ...inputs().dom, jsVersion: "5.4.1" } }));
    expect(result.govukSemanticVersion).toBe("5.4.1");
  });

  it("scores binary CSS signals with GSA weights (20/20/20/40)", () => {
    const css = `@font-face{font-family:"GDS Transport"} /* govuk-frontend */ .x{background:url(govuk-crest.svg)}`;
    const result = detectGovuk(inputs({ cssBodies: [css] }));
    expect(result.govukCrownInCss).toBe(20);
    expect(result.govukStringInCss).toBe(20);
    expect(result.govukTransportFont).toBe(40);
    expect(result.govukCount).toBe(80);
  });

  it("counts string occurrences in served HTML", () => {
    const html = `<link href="/govuk-frontend.css"><script src="/govuk-frontend.js"></script><style>.govuk-button{}.govuk-header{}</style>`;
    const result = detectGovuk(inputs({ htmlText: html }));
    expect(result.govukString).toBe(2);
    expect(result.govukInlineCss).toBe(2);
  });

  it("reaches definite band (>=100) for a realistic govuk-frontend page", () => {
    const html = `<html><head><link rel="stylesheet" href="https://www.example.service.gov.uk/assets/govuk-frontend-5.13.0.min.css"></head><body class="govuk-template__body">...</body></html>`;
    const result = detectGovuk(
      inputs({
        htmlText: html,
        resourceUrls: ["https://www.example.service.gov.uk/assets/govuk-frontend-5.13.0.min.css"],
        cssBodies: [
          `:root{--govuk-frontend-version:"5.13.0"} @font-face{font-family:GDS Transport}`,
        ],
        dom: {
          govukElementCount: 200,
          govukClassesUnique: "govuk-button,govuk-header",
          jsVersion: "5.13.0",
          phaseBanner: true,
          cookieBanner: true,
        },
      }),
    );
    expect(result.govukCount).toBeGreaterThanOrEqual(100);
    expect(result.govukPhaseBanner).toBe(true);
  });
});

describe("aggregateViolations (GSA category mapping)", () => {
  it("counts violating nodes per category like GSA", () => {
    const aggregated = aggregateViolations([
      { id: "color-contrast", nodes: [1, 2, 3] },
      { id: "image-alt", nodes: [1] },
      { id: "svg-img-alt", nodes: [1, 2] },
      { id: "landmark-one-main", nodes: [1] }, // best-practice rule, NOT in GSA mapping
    ]);
    expect(aggregated.categories).toEqual({ contrast: 3, images: 3 });
    expect(aggregated.total).toBe(6);
    expect(aggregated.unmappedRules).toEqual(["landmark-one-main"]);
    expect(aggregated.ruleNodeCounts["landmark-one-main"]).toBe(1);
  });

  it("returns zero totals for a clean page", () => {
    const aggregated = aggregateViolations([]);
    expect(aggregated.total).toBe(0);
    expect(aggregated.categories).toEqual({});
  });
});

describe("registrableDomain", () => {
  it("handles UK two-part suffixes", () => {
    expect(registrableDomain("www.camden.gov.uk")).toBe("camden.gov.uk");
    expect(registrableDomain("www.airedale-trust.nhs.uk")).toBe("airedale-trust.nhs.uk");
    expect(registrableDomain("a.b.example.co.uk")).toBe("example.co.uk");
    expect(registrableDomain("cdn.example.com")).toBe("example.com");
  });
});

describe("isRootDisallowed", () => {
  it("is exported and callable (network behaviour tested in calibration)", () => {
    expect(typeof isRootDisallowed).toBe("function");
  });
});
