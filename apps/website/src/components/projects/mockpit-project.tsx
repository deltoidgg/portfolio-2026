import { projectImage } from "../../content/projects";
import { ProjectFigure, ProjectNote, ProjectSection } from "./project-layout";

export function MockPitProject() {
  return (
    <>
      <ProjectSection id="problem" title="Prototypes look more finished than they are">
        <p>
          AI tools have made it really quick to get to a screen that looks done. What a screenshot
          can&rsquo;t tell you is which numbers came from a real API, which are fixtures, and which
          were typed in just to make the layout look right. That gap is easy to miss in a review,
          and it&rsquo;s how a prototype ends up being treated as ready before it is.
        </p>
        <p>
          MockPit tracks it while the app runs. It gives designers, engineers and reviewers the same
          view of a route, so &ldquo;is this real yet?&rdquo; has an actual answer.
        </p>
      </ProjectSection>

      <ProjectSection id="vocabulary" title="One shared vocabulary">
        <p>
          Everything on screen gets a source: api, mock, fallback, derived, hardcoded, empty,
          unsupported or error. Modes then decide how strict to be, from a pure mock prototype,
          through live data with fallbacks, to a full audit or a capture for something
          customer-facing.
        </p>
        <ProjectFigure
          image={projectImage(
            "mockpit/devtools",
            "The MockPit devtools panel for /dashboard/analytics, showing hybrid mode, a source mix of three API calls, two mocks and one fallback, hardcoded as the highest risk, and capture blocked",
          )}
          caption="The devtools on a demo dashboard. It’s in hybrid mode with three API calls, two mocks and a fallback, and capture is blocked because something is still hardcoded."
        />
      </ProjectSection>

      <ProjectSection id="build" title="How it’s put together">
        <p>
          The core is plain TypeScript with no framework attached. The browser client wraps fetch
          (or any async work), the React package adds a provider and hooks, and the MSW adapter tags
          the handlers you already have, so mocking never becomes a dependency of the core.
        </p>
        <ProjectNote title="Why custom elements?">
          The devtools panel is a custom element in Shadow DOM, so the same panel drops into a React
          app, another framework or plain JavaScript without picking up any of the app&rsquo;s
          styles.
        </ProjectNote>
      </ProjectSection>

      <ProjectSection id="capture" title="Rules for ‘safe to show’">
        <p>
          A route can say which resources have to be live, how much coverage it needs, and which
          kinds of source block a capture. The panel shows that checklist in context, and the CLI
          visits routes with Playwright so CI can fail when the rules aren&rsquo;t met.
        </p>
        <p>
          Exports only include metadata unless you opt in with a redaction policy. The audit trail
          is useful; accidentally shipping real payloads around is not.
        </p>
      </ProjectSection>

      <ProjectSection id="status" title="Where it’s at">
        <p>
          There are six packages on npm under @mockpit, all MIT licensed, with docs and runnable
          examples for vanilla, React and MSW setups, plus tests for the schemas, modes, adapters,
          custom elements and CLI audits.
        </p>
        <p>
          What it doesn&rsquo;t have yet is anyone using it outside my own examples, and I&rsquo;m
          not going to pretend otherwise. That&rsquo;s the part I&rsquo;d most like to change.
        </p>
      </ProjectSection>
    </>
  );
}
