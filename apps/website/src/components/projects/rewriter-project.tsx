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
import { RewriterEvalLoop, RewriterJudgeScores, RewriterModelComparison } from "./rewriter-evals";
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
          {
            id: "evals",
            label: "Evals",
            detail: "Checking the reading levels, a model as judge, comparing models",
            content: <EvalsTab />,
          },
        ]}
      />

      <ProjectSection id="status" title="Where it’s at">
        <p>
          It&rsquo;s live with 103 public-domain books and all four themes. The job I still
          haven&rsquo;t done is testing with real readers at each level, so I don&rsquo;t claim the
          age bands are right. The evaluation set and its judge test the text, not the reader.
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
        <p>
          That&rsquo;s for a part that&rsquo;s already stored. A part being rewritten for the first
          time arrives a paragraph at a time, so the page changes a paragraph at a time too. The
          paragraphs about to change step back to 60% opacity, a small bookmark-shaped mark breathes
          in the margin beside the one being written, and each new paragraph fades in where its
          original was. The pages re-measure quietly as each one lands.
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
          tokens, roughly a page. The first part is shorter, about 450 tokens and never more than
          700, so the opening spread is ready sooner. A part is only rewritten when someone reaches
          it, plus one part ahead so the next page is ready.
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
          within a length range for its level, it should keep its proper names and speech marks, and
          it can&rsquo;t contain markup or chatter like &ldquo;Here&rsquo;s the rewrite&rdquo;. Only
          the paragraphs that fail go back for a second try, so one bad paragraph doesn&rsquo;t cost
          the whole part.
        </p>
        <p>
          That also means a paragraph can be shown as soon as it&rsquo;s written. The answer streams
          from Workers AI, each paragraph is picked out of the arriving JSON as its object closes,
          and once it passes the same checks it goes straight to the reader, as NDJSON from the same
          two routes when the browser asks with <code>Accept: application/x-ndjson</code>. The first
          paragraph now arrives in about 3 seconds instead of 10 to 12, and the first spread is
          complete in about 4. A paragraph that fails waits for the second try, so nothing on the
          page is taken back unless the whole part fails.
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

function EvalsTab() {
  return (
    <>
      <ProjectSection id="evals-why" title="When 6 to 8 didn’t read like 6 to 8">
        <p>
          After the move to Cloudflare, the rewrites for ages 6 to 8 didn&rsquo;t feel right. They
          were plainer than the original, but they still read like a book for older children, and I
          thought the previous prompt had done a better job. Measured, the median reading grade at
          that level was 3.9 on the Flesch-Kincaid scale, which is pitched at nine and
          ten-year-olds.
        </p>
        <p>
          Changing a prompt by feel and reading a page or two afterwards is a good way to go round
          in circles, so I built the evaluation out properly first and let it steer the changes.
        </p>
      </ProjectSection>

      <ProjectSection id="eval-set" title="A fixed set to measure against">
        <p>
          The set is 24 passages, four from each of six books: Emma, Frankenstein, Great
          Expectations, The Jungle Book, The Odyssey and Treasure Island. From each book
          there&rsquo;s one passage that&rsquo;s mostly dialogue, one descriptive, one archaic and
          one dense. A run rewrites all of them at all four levels, 96 rewrites, through the real
          prompt and the production model.
        </p>
        <p>
          The set is picked once and committed, so every run is measured on exactly the same text.
          Each run saves every rewrite in a report, so a saved run can be checked again with new
          code without paying for the rewrites twice.
        </p>
      </ProjectSection>

      <ProjectSection id="eval-checks" title="The first failures were mine">
        <p>
          The first layer is plain code: every paragraph present and clean, sentence length and the
          share of long sentences, reading grade, proper names kept, and no added commentary like
          &ldquo;In this passage&rdquo;. The new prompt brought ages 6 to 8 down to a median grade
          of 2.4, at about nine words a sentence. The levels also stopped blurring together:
          neighbouring levels now share 60%, 80% and 80% of their word pairs, down from 76%, 88% and
          88%.
        </p>
        <p>
          A lot of the early failures weren&rsquo;t the model&rsquo;s, though. The name check
          counted the first word of a line of speech as a name, read &ldquo;Bagheera--born&rdquo; as
          one word, and flagged Kipling&rsquo;s Leopard for becoming &ldquo;the leopard&rdquo;. A
          strict sentence limit would have sent 35% of the paragraphs for ages 6 to 8 back to the
          model, so most pages would have cost two requests and twice the wait.
        </p>
        <ProjectNote title="Hard and soft failures.">
          A paragraph that&rsquo;s missing, empty or full of markup is never kept. A soft problem,
          like a lost name or a sentence half as long again as the level allows, gets one corrective
          turn and is then accepted, so it can&rsquo;t send a whole page back to the original. At
          that threshold, about 3% of paragraphs go back.
        </ProjectNote>
      </ProjectSection>

      <ProjectSection id="judge" title="A second model as the editor">
        <p>
          Once every check passed, the rewrites still didn&rsquo;t always read well, and the checks
          couldn&rsquo;t say why. Sentence length can&rsquo;t tell you that a line is garbled or a
          joke has gone. So a second model, gpt-oss-120b, reads every rewrite next to its original
          and scores it out of 5 the way an editor of books for that age would: level fit,
          faithfulness, flow and voice. It also quotes the worst faults, which is what makes the
          scores useful. It&rsquo;s from a different lab from the DeepSeek model doing the
          rewriting, so it isn&rsquo;t marking its own work.
        </p>
        <p>
          The judge needed calibrating too. At first it marked the rewrites for 6 to 8 down for
          losing Austen&rsquo;s formal style, which is the point of that level, and called a wedding
          invented when it was in the original. Its instructions now say that changing the
          author&rsquo;s words is the job, and to mark down only a change in meaning, confusing
          writing or the wrong level. It&rsquo;s also noisy: one passage&rsquo;s score can move by a
          point between runs. So every rewrite is judged twice and averaged, and I only kept a
          change when the same passages scored better in both judgings.
        </p>
      </ProjectSection>

      <ProjectSection id="loop" title="One change at a time">
        <RewriterEvalLoop />
        <p>
          What worked was usually specific. The model often swapped a word or two in a phrase that
          only makes sense in older English, so Austen&rsquo;s &ldquo;woman wore too amiable a form
          in it&rdquo; became &ldquo;Women seemed too lovable there&rdquo;. A rule to say what such
          a phrase means fixed most of those. Another keeps a character&rsquo;s opinion theirs,
          instead of the narrator stating it as fact. And worked examples moved this model more than
          rules did: a third example for ages 6 to 8 raised faithfulness by about a quarter of a
          point in both judgings.
        </p>
        <p>
          Plenty didn&rsquo;t work. Letting the model reason first scored no better and took 50
          seconds a part instead of 10, at three times the cost. Telling ages 12 to 14 not to chop
          up sentences overshot, and dense passages came back at 23 words a sentence. A third
          example for ages 9 to 11 made things worse. All three were reverted.
        </p>
        <ProjectNote title="Not teaching to the test.">
          Twice, I put phrases from the eval passages into the prompt&rsquo;s examples without
          noticing. That lets the model score well by matching the examples rather than following
          the rules, so a test now fails if any example in the prompt appears in the set.
        </ProjectNote>
      </ProjectSection>

      <ProjectSection id="eval-results" title="What changed">
        <RewriterJudgeScores />
        <p>
          The biggest gain is where it was needed. At ages 6 to 8, the passages that pass every
          score went from 10 of 24 to 16, and level fit went from 3.92 to 4.42. The older levels
          moved less, and ages 9 to 11 is within the noise. Flow is still the weakest score at the
          three younger levels, because the judge still finds some passages choppy, so that&rsquo;s
          next.
        </p>
      </ProjectSection>

      <ProjectSection id="models" title="Trying other models">
        <p>
          With the prompt settled, I ran the same passages for ages 6 to 8 through the other text
          models on Workers AI. Most of them think before they answer unless that&rsquo;s switched
          off through their chat template, and two reject the usual setting outright, so the request
          is now adjusted per model in one place, for live reading and batch rewrites alike.
        </p>
        <RewriterModelComparison />
        <p>
          None beat the model already in use by more than the judge&rsquo;s noise, and every one was
          at least half as slow again. Gemma fits the age a little better but is less faithful.
          DeepSeek V4 Pro matches the current model at three and a half times the wait. For someone
          waiting on a page, speed decides it, so DeepSeek V4.1 Flash stays.
        </p>
      </ProjectSection>
    </>
  );
}
