/**
 * axe-core violation aggregation using GSA's category mapping, verbatim from
 * GSA/site-scanning-engine libs/core-scanner/src/pages/accessibility/results-aggregator.ts
 * (retrieved 2026-06-12). Counts violating NODES per category, exactly as GSA does.
 */

export const GSA_AXE_CATEGORY_MAPPING: Record<string, string[]> = {
  aria: [
    "aria-allowed-attr",
    "aria-deprecated-role",
    "aria-hidden-body",
    "aria-hidden-focus",
    "aria-prohibited-attr",
    "aria-required-attr",
    "aria-required-children",
    "aria-required-parent",
    "aria-roles",
    "aria-tooltip-name",
    "aria-valid-attr-value",
    "aria-valid-attr",
  ],
  "auto-updating": ["meta-refresh"],
  contrast: ["color-contrast"],
  flash: ["blink", "marquee"],
  "form-names": ["aria-input-field-name", "input-field-name", "select-name"],
  "frames-iframes": ["frame-title"],
  images: ["area-alt", "image-alt", "input-image-alt", "object-alt", "role-img-alt", "svg-img-alt"],
  "keyboard-access": ["frame-focusable-content", "scrollable-region-focusable"],
  language: ["html-lang-valid", "valid-lang", "html-has-lang"],
  "link-purpose": ["link-name"],
  lists: ["definition-list", "dlitem", "list", "listitem"],
  other: [
    "audio-caption",
    "autocomplete-valid",
    "avoid-inline-spacing",
    "form-field-multiple-labels",
    "label",
    "label-title-only",
    "link-in-text-block",
    "video-caption",
  ],
  "page-titled": ["document-title"],
  tables: ["td-headers-attr", "th-has-data-cells"],
  "user-control-name": [
    "aria-command-name",
    "aria-meter-name",
    "aria-progressbar-name",
    "aria-toggle-field-name",
    "button-name",
  ],
};

const RULE_TO_CATEGORY = new Map<string, string>();
for (const [category, rules] of Object.entries(GSA_AXE_CATEGORY_MAPPING)) {
  for (const rule of rules) RULE_TO_CATEGORY.set(rule, category);
}

export interface ViolationLike {
  id: string;
  nodes: Array<unknown>;
}

export interface AggregatedViolations {
  /** category -> violating node count (only categories with >0, like GSA's resultsSummary) */
  categories: Record<string, number>;
  /** sum over mapped categories */
  total: number;
  /** every violation rule id -> node count, including unmapped rules (audit trail) */
  ruleNodeCounts: Record<string, number>;
  unmappedRules: string[];
}

export function aggregateViolations(violations: ViolationLike[]): AggregatedViolations {
  const categories: Record<string, number> = {};
  const ruleNodeCounts: Record<string, number> = {};
  const unmappedRules: string[] = [];
  let total = 0;

  for (const violation of violations) {
    const nodeCount = violation.nodes.length;
    ruleNodeCounts[violation.id] = (ruleNodeCounts[violation.id] ?? 0) + nodeCount;
    const category = RULE_TO_CATEGORY.get(violation.id);
    if (!category) {
      unmappedRules.push(violation.id);
      continue;
    }
    categories[category] = (categories[category] ?? 0) + nodeCount;
    total += nodeCount;
  }

  return { categories, total, ruleNodeCounts, unmappedRules };
}
