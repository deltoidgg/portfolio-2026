import type { ComponentType } from "react";
import { FplProject } from "./fpl-project";
import { MockPitProject } from "./mockpit-project";
import { OpenFGCProject } from "./openfgc-project";
import { RewriterProject } from "./rewriter-project";

const registry: Record<string, ComponentType> = {
  fpl: FplProject,
  mockpit: MockPitProject,
  rewriter: RewriterProject,
  openfgc: OpenFGCProject,
};

export function projectContentBySlug(slug: string): ComponentType | undefined {
  return registry[slug];
}
