import { ProjectSection } from "./project-layout";

export function RewriterProject() {
  return (
    <>
      <ProjectSection id="context" title="Adapt the book without turning it into a chatbot">
        <p>
          Rewriter is for readers who want the story, not an explanation of how a language model
          works. The interface starts with a small library, keeps the reading column central, and
          presents four plain-language reading levels alongside the untouched original.
        </p>
        <p>
          The product choice was to make adaptation feel like a reading preference—next to theme,
          type size, and line height—rather than a prompt box. Progress, bookmarks, and preferences
          stay in a versioned local session so the product remains useful without an account.
        </p>
      </ProjectSection>

      <ProjectSection id="pipeline" title="Preserve structure before preserving style">
        <p>
          Chapters are parsed into stable blocks with identifiers and content types. Gemini receives
          plain text plus strict reading-level guidance and must return every block exactly once, in
          the original order. The service rejects missing, reordered, duplicated, or malformed
          blocks before any adapted text reaches the reader.
        </p>
        <div className="decision-panel">
          <p className="decision-panel__label">Safety boundary</p>
          <p>
            Providers return plain text, never HTML. The application escapes the response and
            rebuilds safe paragraph, heading, or quotation markup from the trusted source structure.
          </p>
        </div>
        <p>
          A cache key includes the source hash, reading level, model, and prompt version. That keeps
          repeat reads fast while ensuring a content or prompt change cannot silently reuse an old
          adaptation.
        </p>
      </ProjectSection>

      <ProjectSection id="resilience" title="Failure is part of the reading experience">
        <p>
          Rewrite and speech requests have schema validation, per-actor limits, abortable timeouts,
          provider-specific failure handling, and actionable messages. The original text remains
          available when adaptation fails, so an unreliable model does not strand the reader.
        </p>
        <p>
          Text-to-speech starts from the reader’s current block, selects a bounded passage, and uses
          the matching canonical or adapted text. ElevenLabs returns an MP3 that is revoked when the
          selection or chapter changes instead of leaking object URLs across a long session.
        </p>
      </ProjectSection>

      <ProjectSection id="accessibility" title="Reading controls that belong to the reader">
        <ul>
          <li>Paper, sepia, night, and high-contrast themes.</li>
          <li>Bounded font-size and line-height controls.</li>
          <li>Keyboard-operable level, bookmark, chapter, settings, and audio controls.</li>
          <li>Polite live regions for adaptation and speech status.</li>
          <li>Persistent progress without requiring identity or transmitting reading history.</li>
        </ul>
        <p>
          The live product proves the interaction and service boundaries. The next validation step
          is structured testing with readers across the four stated reading levels; the portfolio
          deliberately does not present those age bands as clinically validated outcomes.
        </p>
      </ProjectSection>
    </>
  );
}
