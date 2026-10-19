/** Re-exported so paper content keeps a single import site for the summary. */
export { uswdsSummary } from "datasets/artifacts";

export type PaperStatus = "in-progress" | "preregistered" | "published";

export interface Paper {
  slug: string;
  title: string;
  status: PaperStatus;
  displayNumber: string;
  publishedAt?: string;
  question: string;
  cardSummary: string;
  abstract: string[];
  datasetId: string;
  preregistrationHref: string;
}

export const papers: Paper[] = [
  {
    slug: "design-systems-accessibility",
    title: "Do design systems deliver accessibility at scale?",
    status: "published",
    displayNumber: "Paper 01",
    publishedAt: "2026-06-30",
    question:
      "Is graded adoption of a design system associated with fewer automatically detectable accessibility violations on real production websites?",
    cardSummary:
      "Websites with strong design-system adoption signals had roughly half as many automatically detected accessibility violations. The pre-registered model then replicated on held-out UK data.",
    abstract: [
      "Design systems promise consistency, and their maintainers increasingly promise accessibility too: components ship with semantics, focus management and contrast decisions already made. This study tests that promise at estate scale under a pre-registered protocol. On a frozen snapshot of 12,252 live US federal websites from the GSA Site Scanning programme, sites with strong US Web Design System adoption signals show roughly half the automatically detectable accessibility violations of sites without them (incidence-rate ratio 0.50, 95% CI 0.38 to 0.65) after agency fixed effects and digital-maturity controls, with a monotone dose-response across graded adoption bands.",
      "With the specification frozen before any UK site was scanned, the same model was then applied once to a held-out replication sample collected for this paper: 6,295 UK public sector websites (central government, local authorities, parish and town councils, and the NHS), scanned with a govuk-frontend detector built as a structural mirror of GSA’s USWDS score and the same axe-core ruleset. The association replicated in both direction and magnitude (IRR 0.56, 95% CI 0.47 to 0.67), within the pre-registered ±0.20 window of the US estimate. At the level automated checks can measure, this is consistent with the Government Digital Service’s claim that the GOV.UK Design System helps services ship more accessible front ends.",
      "Pre-registered diagnostics point to a site-level association rather than a pure good-teams artifact. The gradient survives within-agency comparison with only 20% attenuation, exceeds placebo gradients on performance metrics, and is stable under Oster-style selection bounds. Not everything replicated: USWDS v3 shows no improvement over v2, the predicted difference between component-mediated and template-mediated violation categories did not appear, and the UK partial-adoption band, where detection is noisiest, reverses sign. All three are reported as found. The design is observational, and the outcome is the machine-detectable floor of accessibility rather than the whole of it. All data, code, results and the locked pre-registration are public and can be explored in the browser.",
    ],
    datasetId: "uswds-a11y",
    preregistrationHref:
      "https://github.com/deltoidgg/portfolio-2026/blob/main/docs/research/paper-01-design-systems-a11y/PREREGISTRATION.md",
  },
];

export function paperBySlug(slug: string): Paper | undefined {
  return papers.find((paper) => paper.slug === slug);
}

/** "2026-06-30" becomes "30 June 2026", fixed to UTC so the server and browser agree. */
export function formatPaperDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
