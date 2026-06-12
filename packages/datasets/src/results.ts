import { z } from "zod";

/**
 * Confirmatory-analysis result artifacts (Paper 01), produced by tools/analysis
 * (Python, pyfixest) and validated here before the research app imports them.
 */

/** One regression estimate, reported as IRR (exp(beta)) with 95% CI. */
export const estimateSchema = z.object({
  label: z.string(),
  beta: z.number(),
  se: z.number(),
  irr: z.number(),
  ciLow: z.number(),
  ciHigh: z.number(),
  pOneSided: z.number().min(0).max(1),
  pTwoSided: z.number().min(0).max(1),
  n: z.number().int().nonnegative(),
  nClusters: z.number().int().nonnegative().nullable(),
});
export type Estimate = z.infer<typeof estimateSchema>;

const termSchema = z.object({
  term: z.string(),
  coef: z.number(),
  se: z.number(),
  pTwoSided: z.number().min(0).max(1),
});

const categoryEstimateSchema = z.object({
  category: z.string(),
  mechanism: z.enum(["component", "template"]),
  betaStd: z.number(),
  se: z.number(),
  irr: z.number(),
  n: z.number().int().nonnegative(),
});

export const usConfirmatoryResultsSchema = z.object({
  meta: z.object({
    generatedAt: z.string(),
    artifact: z.string(),
    artifactSha256: z.string(),
    nAnalysis: z.number().int(),
    nClusters: z.number().int(),
    pyfixestVersion: z.string(),
    bootstrapDraws: z.number().int(),
    seed: z.number().int(),
  }),
  h1: z.object({
    continuous: estimateSchema,
    strongVsNone: estimateSchema,
    bands: z.array(estimateSchema),
    monotoneNoneToLikely: z.boolean(),
    supported: z.boolean(),
  }),
  h2: z.object({
    v3VsV2: estimateSchema,
    supported: z.boolean(),
  }),
  h3: z.object({
    categories: z.array(categoryEstimateSchema),
    meanComponentBetaStd: z.number(),
    meanTemplateBetaStd: z.number(),
    diff: z.number(),
    pOneSided: z.number().min(0).max(1),
    supported: z.boolean(),
  }),
  diagnostics: z.object({
    adoptionOnMaturity: z.object({
      terms: z.array(termSchema),
      r2Within: z.number().nullable(),
    }),
    placebos: z.object({
      a11yBetaStd: z.number(),
      clsBetaStd: z.number(),
      lcpBetaStd: z.number(),
      exceedsCls: z.boolean(),
      exceedsLcp: z.boolean(),
      pVsCls: z.number().min(0).max(1),
      pVsLcp: z.number().min(0).max(1),
    }),
    attenuation: z.object({
      pooledIrr: z.number(),
      feIrr: z.number(),
      shrinkagePct: z.number(),
      collapsed: z.boolean(),
    }),
    oster: z.object({
      betaControlled: z.number(),
      betaUncontrolled: z.number(),
      r2Controlled: z.number(),
      r2Uncontrolled: z.number(),
      rmax: z.number(),
      delta: z.number(),
      betaStar: z.number(),
      boundsExcludeZero: z.boolean(),
    }),
    dapSubset: estimateSchema,
    functionalForm: z.object({
      negbinStrongVsNone: estimateSchema.nullable(),
      winsorizedContinuous: estimateSchema,
      bandedConsistentWithContinuous: z.boolean(),
    }),
  }),
});
export type UsConfirmatoryResults = z.infer<typeof usConfirmatoryResultsSchema>;

export const ukConfirmatoryResultsSchema = z.object({
  meta: z.object({
    generatedAt: z.string(),
    artifact: z.string(),
    artifactSha256: z.string(),
    nAnalysis: z.number().int(),
    nClusters: z.number().int(),
    pyfixestVersion: z.string(),
  }),
  h4: z.object({
    strongVsNone: estimateSchema,
    continuous: estimateSchema,
    bands: z.array(estimateSchema),
    directionSupported: z.boolean(),
  }),
  comparison: z.object({
    usIrr: z.number(),
    ukIrr: z.number(),
    absDiff: z.number(),
    window: z.number(),
    withinWindow: z.boolean(),
  }),
  supported: z.boolean(),
});
export type UkConfirmatoryResults = z.infer<typeof ukConfirmatoryResultsSchema>;
