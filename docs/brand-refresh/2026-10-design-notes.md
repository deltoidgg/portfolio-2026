# Design notes, October 2026

These notes replace the July 2026 implementation spec for `apps/website`, `apps/research` and
`packages/ui`. The aim of this pass was to make both sites read like a person made them: fewer
labels and system-looking flourishes, more real screenshots, and copy in a natural voice.
`apps/fpl` keeps its own product identity and is not covered here.

## Things we deliberately avoid

- Eyebrow labels: small uppercase, letter-spaced text above a heading. Use a real heading in
  sentence case, or nothing.
- Status dots and glowing indicators. The theme toggle is a sun or moon icon, and nothing pulses.
- Decorative charts and data glyphs that aren't real data.
- Numbered cards (01, 02, 03) for things that aren't a sequence.
- Self-quoting pull quotes, slogans built from three short fragments, and coloured full stops.
- Em dashes in copy. Use a comma, a colon, brackets or a new sentence. En dashes are fine for
  number and date ranges (2020–2021, 0.38–0.65).
- Words that sound generated: inspectable, evidence-led, seamless, leverage, unlock.

## Voice

- Portfolio: first person, casual and specific. Contractions are fine. Say what the thing does and
  what is still unfinished, without inflating it.
- Research: professional and precise, but still written by a person. First person singular on the
  index pages; the paper body keeps the conventional "we".
- Never invent facts about the author, adoption, users or outcomes. If something is unproven, say
  so plainly.

## Visual system

- Tokens live in `packages/ui/src/styles.css`. Dark mode uses warm neutral greys (`#101112`
  canvas) rather than blue-black, and the accent is a soft green used for links, focus and charts
  only.
- Instrument Serif for headings, Geist for everything else. Geist Mono is reserved for code.
- Header, pages and footer share the `.shell` / `.page` container so their edges line up.
- Screenshots sit in rounded frames with a hairline border, at their natural 16:10 aspect.

## Motion

All motion is optional and skipped when the reader prefers reduced motion.

- Route changes use the View Transitions API (`defaultViewTransition` in each router). Project
  screenshot frames share a `view-transition-name` (`projectTransition(slug)`), so a card morphs
  into the case study cover.
- Scroll reveals use CSS scroll-driven animations behind `@supports (animation-timeline: view())`.
  Only image frames fade; text only moves. That keeps text at full opacity whenever axe checks
  contrast.
- The homepage intro has a short entrance (under half a second), the header border fades in on
  scroll, and articles have a reading progress line.

## Case study media

Run `vp run site-quality#project-media` (optionally with a project slug) whenever a project's
design changes. It captures each live site at 2x, writes AVIF and WebP variants at 640, 1280 and
1920 pixels to `apps/website/public/projects/<slug>/`, and records sizes in
`apps/website/src/content/project-media.json`. The archived OpenFGC concept screens are not
captured and are kept as they are.

Social cards are generated with `vp run scanner#generate-social` and reuse those screenshots.

## Performance

- The two fonts used above the fold are preloaded.
- Project images use `<picture>` with AVIF and WebP srcsets and explicit sizes, and only the first
  image on a page is eager.
- The homepage reads its research numbers from `apps/website/src/content/research-headlines.ts`
  instead of the full artifacts. A test keeps them in sync.
- Route loaders only check metadata, so post and case study bodies stay in their own chunks.
