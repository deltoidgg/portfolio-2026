/** Re-exported so paper content keeps a single import site for the summary. */
export { uswdsSummary } from "datasets/artifacts";

export type PaperStatus = "in-progress" | "preregistered" | "published";

export interface Paper {
  slug: string;
  title: string;
  status: PaperStatus;
  question: string;
  abstract: string[];
  datasetId: string;
  preregistrationHref: string;
}

export const papers: Paper[] = [
  {
    slug: "design-systems-accessibility",
    title: "Do design systems deliver accessibility at scale?",
    status: "published",
    question:
      "Is graded adoption of a design system associated with fewer automatically detectable accessibility violations on real production websites?",
    abstract: [
      "Design systems promise consistency, and their maintainers increasingly promise accessibility: components ship with semantics, focus management, and contrast decisions already made. This study quantifies that promise at estate scale under a pre-registered protocol. On a frozen snapshot of 12,252 live US federal websites from the GSA Site Scanning programme, sites with strong US Web Design System adoption signals show roughly half the automatically detectable accessibility violations of sites without them - incidence-rate ratio 0.50 (95% CI 0.38-0.65) - after agency fixed effects and digital-maturity controls, with a monotone dose-response across graded adoption bands.",
      "With the specification frozen before a single UK site was scanned, the same model was then applied once to a held-out replication sample collected for this paper: 6,295 UK public-sector websites (central government, local authorities, parish and town councils, NHS) scanned with a govuk-frontend detector built as a structural mirror of GSA's USWDS score, plus the same axe-core ruleset. The association replicated in both direction and magnitude: IRR 0.56 (95% CI 0.47-0.67), within the pre-registered +/-0.20 window of the US estimate - consistent, at the level automated checks can measure, with the Government Digital Service's claim that the GOV.UK Design System helps services ship more accessible front ends.",
      "Pre-registered diagnostics point to a site-level association rather than a pure good-teams artifact: the gradient survives within-agency comparison with only 20% attenuation, exceeds placebo gradients on performance metrics, and is stable under Oster-style selection bounds. Not everything replicated: USWDS v3 shows no improvement over v2, the predicted component-vs-template category specificity did not appear, and the UK partial-adoption band - where detection is noisiest - reverses sign; all three are reported as found. The design is observational and the outcome is the machine-detectable floor of accessibility, not the whole of it. All data, code, results, and the locked pre-registration are public and explorable in the browser.",
    ],
    datasetId: "uswds-a11y",
    preregistrationHref:
      "https://github.com/deltoidgg/portfolio-2026/blob/main/docs/research/paper-01-design-systems-a11y/PREREGISTRATION.md",
  },
];

export function paperBySlug(slug: string): Paper | undefined {
  return papers.find((paper) => paper.slug === slug);
}
