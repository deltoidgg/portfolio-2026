import { ProjectSection } from "./project-layout";

export function MockPitProject() {
  return (
    <>
      <ProjectSection id="context" title="A prototype can look more real than it is">
        <p>
          AI-assisted product work compresses the time between an idea and a convincing interface.
          That is useful, but it also hides an awkward question: which values are coming from a live
          service, which are fixtures, and which were written only to make the screen look complete?
          A screenshot cannot answer that.
        </p>
        <p>
          MockPit records that provenance while the product runs. It gives designers, engineers, and
          reviewers a shared vocabulary for deciding whether a route is still a prototype, ready for
          integration, or safe to record as customer-facing proof.
        </p>
      </ProjectSection>

      <ProjectSection id="model" title="The taxonomy is the product boundary">
        <p>
          The core models live API data, mocks, fallbacks, derived values, hardcoded copy, authored
          empty-state copy, empty responses, unsupported capabilities, errors, and unknown sources.
          Modes then apply trust policies to those facts: mock, hybrid, live, audit, and capture.
        </p>
        <p>
          I kept this model in a framework-neutral TypeScript package. The browser client wraps
          fetch or arbitrary asynchronous work, React adds provider and hook ergonomics, and the MSW
          adapter decorates handlers without making mocking a dependency of the core.
        </p>
        <div className="decision-panel">
          <p className="decision-panel__label">Architecture decision</p>
          <p>
            Custom elements and Shadow DOM power the devtools, so the same panel can run inside
            React, another framework, or plain JavaScript without inheriting product styles.
          </p>
        </div>
      </ProjectSection>

      <ProjectSection id="proof" title="Capture is a policy, not a button">
        <p>
          A route can define which resources must be live, the minimum acceptable coverage, and the
          source categories that block capture. The devtools show that checklist in context; the CLI
          visits routes with Playwright and can fail CI when the same policy is not met.
        </p>
        <p>
          Exports are metadata-only by default. Including values requires an explicit redaction
          policy, keeping the useful audit trail separate from accidental payload collection.
        </p>
      </ProjectSection>

      <ProjectSection id="validation" title="Evidence available today">
        <ul>
          <li>Six composable packages published under the `@mockpit` organisation.</li>
          <li>Vanilla, React, and MSW integration paths documented with runnable examples.</li>
          <li>
            Unit and browser coverage for schemas, modes, adapters, custom elements, and CLI audits.
          </li>
          <li>
            An MIT-licensed repository that exposes the implementation rather than only a demo.
          </li>
        </ul>
        <p>
          The next useful evidence is adoption outside my own examples. Until that exists, the case
          study treats package publication and testable behavior as proof—not download counts or
          imagined team impact.
        </p>
      </ProjectSection>
    </>
  );
}
