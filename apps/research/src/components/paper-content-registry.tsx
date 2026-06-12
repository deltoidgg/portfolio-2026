import type { ComponentType } from "react";
import { Paper01Content, Paper01Stats } from "./paper-01-content";

interface PaperContent {
  /** Headline stat strip rendered under the paper header. */
  Stats: ComponentType;
  /** Full paper body (sections, figures, appendices). */
  Body: ComponentType;
}

/** Slug-keyed full-paper bodies; papers without an entry get the generic page. */
export const paperContentRegistry: Record<string, PaperContent> = {
  "design-systems-accessibility": { Stats: Paper01Stats, Body: Paper01Content },
};
