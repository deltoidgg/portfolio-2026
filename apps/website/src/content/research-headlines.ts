/**
 * The handful of Paper 01 numbers the homepage needs, copied from the frozen artifacts in
 * packages/datasets. Importing `datasets/artifacts` here would ship every summary and its
 * schema validation in the homepage bundle; tests/research-headlines.test.ts fails if these
 * drift from the artifacts.
 */
export const researchHeadlines = {
  usSites: 12252,
  ukSites: 6295,
  /** Strong adoption vs below-50, US federal sites, agency fixed effects. */
  us: { irr: 0.49666318990899355, ciLow: 0.3777667569835188, ciHigh: 0.6529804956377856 },
  /** The same contrast on the held-out UK sample, organisation-type fixed effects. */
  uk: { irr: 0.5628734606072034, ciLow: 0.4708196665399094, ciHigh: 0.672925442949977 },
} as const;
