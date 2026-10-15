import { govukSummary, ukResults, usResults, uswdsSummary } from "datasets/artifacts";
import { describe, expect, test } from "vite-plus/test";
import { researchHeadlines } from "../src/content/research-headlines";

const estimate = ({ irr, ciLow, ciHigh }: { irr: number; ciLow: number; ciHigh: number }) => ({
  irr,
  ciLow,
  ciHigh,
});

describe("homepage research headlines", () => {
  test("match the frozen Paper 01 artifacts", () => {
    expect(researchHeadlines.usSites).toBe(uswdsSummary.meta.analysedSites);
    expect(researchHeadlines.ukSites).toBe(govukSummary.meta.analysedSites);
    expect(researchHeadlines.us).toEqual(estimate(usResults.h1.strongVsNone));
    expect(researchHeadlines.uk).toEqual(estimate(ukResults.h4.strongVsNone));
  });
});
