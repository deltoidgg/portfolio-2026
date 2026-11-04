import { projectImage } from "../../content/projects";
import { CompareSlider } from "./case-figures";
import { ProjectFigure, ProjectNote, ProjectSection } from "./project-layout";
import { ProjectTabs } from "./project-tabs";
import {
  RewriterBudget,
  RewriterMissSteps,
  RewriterPlatform,
  RewriterSegments,
  RewriterThemeParts,
  RewriterThemes,
} from "./rewriter-figures";
import { RewriterLevels } from "./rewriter-levels";

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
          Rewriter keeps the original text and lets you pick an easier reading level on top of it.
          You can flip back to the original whenever you like, and it&rsquo;ll read the page aloud.
          The first version had six books. This autumn I took it to 103 and moved the rewriting to
          Cloudflare, a page at a time. I also gave the site four themes to choose from.
        </p>
      </ProjectSection>

      <ProjectTabs
        label="Case study"
        tabs={[
          {
            id: "design",
            label: "Design",
            detail: "Reading levels, the library and four themes",
            content: <DesignTab />,
          },
          {
            id: "technical",
            label: "Technical",
            detail: "Cloudflare, rewriting a page at a time, theming",
            content: <TechnicalTab />,
          },
        ]}
      />

      <ProjectSection id="status" title="Where it’s at">
        <p>
          It&rsquo;s live with 103 public-domain books and all four themes. The job I still
          haven&rsquo;t done is testing with real readers at each level, so I don&rsquo;t claim the
          age bands are right. There&rsquo;s an evaluation set that checks sentence length, reading
          grade, names and added commentary, but that tests the text, not the reader.
        </p>
        <p>
          I also haven&rsquo;t measured the theme scenes on a range of real hardware. Headless
          browsers draw WebGL on the CPU, so the automated tests can&rsquo;t tell me much about
          frame rates.
        </p>
      </ProjectSection>
    </>
  );
}

function DesignTab() {
  return (
    <>
      <ProjectSection id="levels" title="Same story, easier words">
        <p>
          There are four levels, named by the ages they&rsquo;re aimed at: 6 to 8, 9 to 11, 12 to
          14, and 15 and up. Each has its own target for sentence length and vocabulary. At every
          level the events, names and paragraphs stay put, and anything spoken stays as dialogue.
        </p>
        <RewriterLevels />
        <p>
          You never see a prompt box or a model name. Reading level sits in the same sheet as page
          colour, text size and spacing, because it&rsquo;s just another way of getting comfortable.
          Your choice now carries on into the next chapter, which it didn&rsquo;t in the first
          version.
        </p>
        <ProjectFigure
          image={projectImage(
            "rewriter/preferences",
            "The reading preferences sheet over a chapter of Treasure Island, with Pages or Scroll, then Original, Early, Developing, Independent and Advanced reading levels, each with its ages",
          )}
          caption="Reading preferences. The levels are in plain words, with the ages under each one."
        />
        <p>
          If a part can&rsquo;t be rewritten, you get the original with a short note saying
          &ldquo;This part is shown as written.&rdquo; The rest of the chapter carries on. Select a
          word and it&rsquo;ll explain it, and &ldquo;Compare with the original&rdquo; puts the two
          side by side.
        </p>
      </ProjectSection>

      <ProjectSection id="shelf" title="A hundred books on one shelf">
        <p>
          Six books fit on one row, but 103 don&rsquo;t, so the library now opens with collections
          like &ldquo;Start here&rdquo; and &ldquo;Adventure and the sea&rdquo; that scroll
          sideways, then every book in a grid. Search and the age, length and subject filters live
          in the address, so a filtered shelf can be shared, and they work without JavaScript.
        </p>
        <ProjectFigure
          image={projectImage(
            "rewriter/shelf",
            "The ‘On the shelf’ section in Starlight: a search box, age, length, subject and sort filters, and a ‘Start here’ row of covers, each with its title, author, year and a line like ‘About 5 hours. Ages 10 and up.’",
          )}
          caption="The shelf. Each card gets one plain line, like “About 5 hours. Ages 10 and up.”, instead of a row of tags. Books without cover art get a typeset cover."
          wide
        />
        <p>
          Several people can share a device. &ldquo;Who&rsquo;s reading?&rdquo; in the header
          switches between profiles, each with its own place, bookmarks and settings. There are no
          accounts, and nothing personal leaves the browser.
        </p>
      </ProjectSection>

      <ProjectSection id="themes" title="Four looks to choose from">
        <p>
          The themes started as four design explorations, each a one-book prototype of how Rewriter
          could feel. Instead of picking one, I made them a setting. Starlight is the default, a
          night sky with a moon. Paper Worlds is bright cut paper for readers up to their early
          teens. Living Ink is cream paper and moving watercolour. Lantern Room is closest to the
          original dark library.
        </p>
        <RewriterThemes />
        <p>
          The first time you open the library it asks you to pick one, once. After that
          there&rsquo;s a Theme button. Each theme also hides a small toy: a moon that sends a
          shooting star, a paper plane, a drop of ink and a lamp you can switch on.
        </p>
        <ProjectFigure
          image={projectImage(
            "rewriter/prompt",
            "The ‘Pick your look’ prompt over the library hero, with four cards showing a small preview of each theme, its name and one line about it, and a ‘Keep this look’ button",
          )}
          caption="The prompt on a first visit to the library. It only shows once."
          wide
        />
        <p>
          A moving background next to a book can get in the way, so there&rsquo;s a Calm effects
          setting with slower motion and nothing that follows your pointer. With reduced motion
          turned on in your system settings, nothing moves at all.
        </p>
      </ProjectSection>

      <ProjectSection id="book" title="The book stays the book">
        <p>
          A theme changes the room around the book, not the book. The page spread, its type and the
          page turn are the same in every theme. Page colours like Sepia and High contrast are a
          separate reading setting, so a theme can&rsquo;t make the page harder to read.
        </p>
        <CompareSlider
          under={projectImage(
            "rewriter/reader-paper-worlds",
            "Chapter one of Treasure Island in Paper Worlds, on a sky-blue background with sheets of paper behind the book",
          )}
          over={projectImage(
            "rewriter/reader-starlight",
            "The same chapter in Starlight, on a night sky",
          )}
          label="How much of the Starlight theme to show"
          describe={(split) => `${split}% Starlight, ${100 - split}% Paper Worlds`}
          caption="Chapter one of Treasure Island in Starlight and Paper Worlds. Drag across it. The pages line up exactly; only the room and the controls change."
        />
      </ProjectSection>

      <ProjectSection id="transition" title="Watching the words change">
        <p>
          Changing the reading level swaps a page of text in front of you, so each theme has its own
          way of showing it. Starlight lifts dust off the old words, Paper Worlds folds them down,
          Living Ink scrambles the letters and Lantern Room lets them glow and char.
        </p>
        <ProjectFigure
          image={projectImage(
            "rewriter/rewrite-lantern",
            "The home page demo in Lantern Room partway through a rewrite: the old words glow orange and fade while the new, simpler sentences appear over them",
          )}
          caption="Lantern Room partway through a rewrite, paused on the home page demo. The old words char while the new ones fade up."
          wide
        />
        <p>
          Each one is meant to finish in under 700 ms, and gets cut off at 900. They play on a layer
          above the page, so the real text changes at once and a screen reader never sees the
          animation. With reduced motion, it&rsquo;s a plain fade.
        </p>
      </ProjectSection>

      <ProjectSection id="turn" title="Pages that turn like paper">
        <p>
          Pick a page up by its edge and it follows your pointer, bending around a moving fold and
          casting a shadow on the page underneath. Let go and it either finishes or falls back,
          depending on how far or how fast you moved it. The arrow keys and buttons turn pages too,
          and on a phone you swipe or tap the edge.
        </p>
        <ProjectFigure
          image={projectImage(
            "rewriter/curl",
            "A two-page spread with the right-hand page being dragged back, curling over the next page so its text bends with the paper",
          )}
          caption="A page held partway through a turn. The text on the curl is drawn to match the real page."
          wide
        />
      </ProjectSection>
    </>
  );
}

function TechnicalTab() {
  return (
    <>
      <ProjectSection id="platform" title="Moving everything to Cloudflare">
        <p>
          The first version ran on Vercel, with Upstash Redis as the cache and Gemini doing the
          rewriting. It now runs as a single Cloudflare Worker, with the model on Workers AI.
        </p>
        <RewriterPlatform />
        <p>
          All 103 books compile into about 3,000 JSON files that ship as static assets with the
          Worker. They&rsquo;re versioned with the code, so a deploy can never read another
          deploy&rsquo;s text. Rewrites go in R2, because each one is written once and kept.
          Counters go in D1, because a budget needs an increment that can&rsquo;t race, and
          SQLite&rsquo;s <code>INSERT &hellip; ON CONFLICT &hellip; RETURNING</code> does that in
          one statement.
        </p>
      </ProjectSection>

      <ProjectSection id="content" title="From Project Gutenberg to the shelf">
        <p>
          97 of the books came in through an ingestion pipeline. It downloads a Project Gutenberg
          text, cleans it, finds the chapters and writes them out, and I review each book in a pull
          request. A book only goes up if it was first published by 1930 and its author and any
          translator died by 1955, which is my rule of thumb for public domain in the US, the UK and
          the EU. A compiler then lints the whole library for things like leftover Gutenberg
          boilerplate, duplicate chapter addresses and missing covers.
        </p>
        <p>
          Every paragraph gets an ID made from a hash of its text. Fixing a typo changes one ID, so
          bookmarks and saved places in the rest of the book keep working.
        </p>
      </ProjectSection>

      <ProjectSection id="segments" title="Rewriting a page at a time">
        <p>
          The first version rewrote a whole chapter in one request that could take 45 seconds, and
          kept the result in Redis for 30 days. Now each chapter is split into parts of about 1,200
          tokens, roughly a page. A part is only rewritten when someone reaches it, plus one part
          ahead so the next page is ready.
        </p>
        <RewriterSegments />
        <p>
          Every part is stored for good under a hash of its text, level, model and prompt version.
          The books don&rsquo;t change, so a rewrite only needs making once. Changing the prompt or
          the model makes new keys, so an old rewrite can&rsquo;t be served by mistake. Rewriting
          chapters ahead of time goes through the Workers AI batch queue with exactly the same
          request bytes, so a batch result is an ordinary cache hit.
        </p>
      </ProjectSection>

      <ProjectSection id="checks" title="Not trusting the reply">
        <p>
          A request from the browser can only name a chapter, a part and a level. No free text
          reaches the model. The model gets plain-text paragraphs with short numbers and has to send
          every number back, once, in order.
        </p>
        <RewriterMissSteps />
        <p>
          Each paragraph is checked on its own. It can&rsquo;t be missing or empty, it has to stay
          within a length range for its level, it has to keep every proper name and its speech
          marks, and it can&rsquo;t contain markup or chatter like &ldquo;Here&rsquo;s the
          rewrite&rdquo;. Only the paragraphs that fail go back for a second try, so one bad
          paragraph doesn&rsquo;t cost the whole part.
        </p>
        <ProjectNote title="No HTML from the model.">
          The reply is escaped before it&rsquo;s stored, and the page rebuilds the paragraphs,
          headings and quotes from the original book&rsquo;s structure. Nothing the model writes can
          end up as markup.
        </ProjectNote>
      </ProjectSection>

      <ProjectSection id="budget" title="A spending cap that fails safe">
        <p>
          Rewriting costs real money, so it has a ceiling. DeepSeek V4.1 Flash costs $1.20 per
          million output tokens, and output is most of the bill. The Worker stops at $10 a day or 20
          million output tokens, whichever comes first.
        </p>
        <RewriterBudget />
        <p>
          Hitting the cap means the original text, not an error. Rate limits only count new
          rewrites, so reading something already stored is always free.
        </p>
      </ProjectSection>

      <ProjectSection id="contract" title="Themes as a contract">
        <p>
          Four themes could easily have meant four copies of every page. Instead a theme only
          supplies values, decoration and a transition, and every page is the same HTML in every
          theme.
        </p>
        <RewriterThemeParts />
        <p>
          The prerendered pages all say Starlight. An inline script of about 1 kB swaps in your
          choice before anything is painted, so you never see the wrong theme flash up. Decoration
          renders as an empty layer on the server and loads when the browser is idle, so the server
          and the browser always agree when the page hydrates.
        </p>
        <p>
          Tests keep it that way. Every theme is checked for its required tokens, 4.5 to 1 text
          contrast and names it isn&rsquo;t allowed to set, and a test fails if any component checks
          which theme is on. Each theme&rsquo;s code is its own chunk under 30 kB gzipped, so you
          only download the one you use.
        </p>
      </ProjectSection>

      <ProjectSection id="curl" title="Drawing the page from the live text">
        <p>
          The page turn follows one rule: DOM at rest, WebGL in motion. The real text is always the
          page, and a canvas only covers it while a page is moving.
        </p>
        <p>
          To draw a page, it finds every word with <code>Range.getClientRects()</code> and redraws
          it with <code>fillText</code> in the same font, so line breaks, italics and the drop cap
          match the browser&rsquo;s layout and the handover back to live text is close to invisible.
          The page itself is a 40 by 56 grid, wrapped around a moving fold like paper around a
          cylinder, so it never stretches.
        </p>
        <p>
          The engine is about 13 kB gzipped and loads after the first spread is on screen. Nothing
          is drawn while the book is still, and without WebGL the pages just fade.
        </p>
      </ProjectSection>
    </>
  );
}
