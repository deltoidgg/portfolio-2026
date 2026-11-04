import { projectImage } from "../../content/projects";
import { ProjectFigure, ProjectNote, ProjectSection } from "./project-layout";

export function RewriterProject() {
  return (
    <>
      <ProjectSection id="why" title="Why I made it">
        <p>
          Classic books are great, but Dickens wasn&rsquo;t exactly writing for nine-year-olds.
          Simplified editions do exist, but they&rsquo;re often out of print or flatten the story
          into something you barely recognise. I wanted something a parent could use to share a
          classic with their kids, or that anyone could use as a gentler way in.
        </p>
        <p>
          So Rewriter keeps the original text and lets you pick a reading level on top of it: Early
          (roughly ages 6 to 8), Developing (9 to 11), Independent (12 to 14) or Advanced (15 and
          up). You can flip back to the original whenever you like, and it&rsquo;ll read the page
          out loud from wherever you are.
        </p>
      </ProjectSection>

      <ProjectSection id="redesign" title="Making it feel like a book">
        <p>
          The first version did the job, but it felt more like an app than a book: a carousel of
          covers on a gradient, then a column of text. This summer I redesigned the whole thing
          around the idea of a real library. The front page is a reading room with proper covers on
          the shelves, each book has its own page with the cover and a contents list, and the reader
          lays the text out as a two-page spread.
        </p>
        <p>
          The rule I stuck to was that it should feel like picking a book off a shelf, not opening
          an AI tool. You never see a prompt box or a model name. Reading level sits in the same
          menu as theme, text size and line spacing, because it&rsquo;s just another way of getting
          comfortable.
        </p>
        <ProjectFigure
          image={projectImage(
            "rewriter/book",
            "The Emma book page, with the cover on the left and the title, author, a one-line description and ‘Start reading’ on the right",
          )}
          caption="Every book gets its own page with the cover, a short description and a searchable contents list."
          wide
        />
      </ProjectSection>

      <ProjectSection id="reader" title="Pages that behave like pages">
        <p>
          The reader paginates with CSS columns, so the browser does the layout and there&rsquo;s
          only ever one copy of the text on the page. Wide screens get a two-page spread, phones get
          a single page, and there&rsquo;s a continuous scroll mode if you&rsquo;d rather not turn
          pages at all.
        </p>
        <p>
          Bookmarks and your place in the book are tied to stable IDs for each paragraph rather than
          to page numbers. That sounds like a small detail, but it means changing the text size or
          rotating your phone doesn&rsquo;t lose your spot.
        </p>
        <ProjectFigure
          image={projectImage(
            "rewriter/reader",
            "The first chapter of Emma as a two-page spread on cream paper, with reading age, edition and ‘Listen from here’ controls underneath",
          )}
          caption="Chapter one of Emma in the Paper theme. Reading age, edition and audio live in one bar under the spread."
          wide
        />
      </ProjectSection>

      <ProjectSection id="rewriting" title="Rewriting without breaking the book">
        <p>
          Each chapter is split into blocks, and each block has an ID. When you ask for a different
          level, the server sends Gemini the plain text of those blocks and expects every single one
          back, once, in the same order. If anything comes back missing, doubled up or out of order,
          the whole response gets thrown away before you see it.
        </p>
        <ProjectNote title="No HTML from the model.">
          Gemini only ever returns plain text. The app escapes it and rebuilds the paragraphs,
          headings and quotes from the original book&rsquo;s structure, so nothing the model writes
          can end up as markup on the page.
        </ProjectNote>
        <p>
          You also can&rsquo;t type a prompt. A request can only point at a chapter in the catalogue
          and a reading level, which rules out a whole category of misuse. Rewrites are cached
          against the source text, the level, the model and the prompt version, so a repeat read is
          instant and changing the prompt can&rsquo;t quietly serve up an old version. Requests are
          rate limited per visitor, and Upstash Redis keeps count in production.
        </p>
        <ProjectFigure
          image={projectImage(
            "rewriter/preferences",
            "The reading preferences dialog, with Pages or Continuous mode and five editions from Original to Advanced",
          )}
          caption="Reading preferences. Pick pages or continuous scrolling, one of five editions, a theme, and text size and spacing."
        />
      </ProjectSection>

      <ProjectSection id="listening" title="Listening along">
        <p>
          Audio starts from the passage you&rsquo;re on. The server works out which blocks to read
          (up to 20 of them, and no more than 5,000 characters) and sends them to ElevenLabs. It
          will only read an adapted version if that exact adaptation exists on the server for the
          same chapter, so the audio always matches what&rsquo;s on screen.
        </p>
        <p>
          If a rewrite or the audio fails, the original text is still right there. A flaky model
          should never leave someone halfway through a chapter with nothing to read.
        </p>
      </ProjectSection>

      <ProjectSection id="motion" title="A bit of theatre">
        <p>
          Motion got a lot of attention. Covers lift a little when you hover them, the cover you
          pick in the library carries through to the book page, and pages turn in the direction
          you&rsquo;re reading. All of it sticks to transforms and opacity so it stays smooth, and
          it drops away if your system is set to reduce motion.
        </p>
        <p>
          Under the hood it moved from Next.js to TanStack Start along the way, and all 221 book and
          chapter pages are prerendered, so the reading itself never waits on a server.
        </p>
      </ProjectSection>

      <ProjectSection id="next" title="What’s next">
        <p>
          It&rsquo;s live with a small shelf of public-domain books. The bit I haven&rsquo;t done
          yet is proper testing with readers at each level, so I&rsquo;m careful not to claim the
          age bands are validated. Getting real readers in front of it is the next job.
        </p>
      </ProjectSection>
    </>
  );
}
