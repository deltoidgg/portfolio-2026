import type { ComponentType } from "react";
import { MockPitProject } from "./mockpit-project";
import { OpenFGCProject } from "./openfgc-project";
import { RewriterProject } from "./rewriter-project";

const registry: Record<string, ComponentType> = {
  mockpit: MockPitProject,
  rewriter: RewriterProject,
  openfgc: OpenFGCProject,
};

export function projectContentBySlug(slug: string): ComponentType | undefined {
  return registry[slug];
}
