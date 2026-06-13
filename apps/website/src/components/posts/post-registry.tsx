import type { ComponentType } from "react";
import { DesignSystemsAccessibilityPost } from "./design-systems-accessibility";

const registry: Record<string, ComponentType> = {
  "design-systems-accessibility": DesignSystemsAccessibilityPost,
};

export function postComponentBySlug(slug: string): ComponentType | undefined {
  return registry[slug];
}
