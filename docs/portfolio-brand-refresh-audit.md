# Portfolio Brand, Design, and Content Audit

**Subject:** Wasim Arif portfolio, writing, and research lab
**Audit date:** 22 July 2026
**Purpose:** a source-of-truth assessment to support a complete brand refresh
**Primary audience:** Wasim, future brand/design collaborators, and implementation teams

## 1. Scope and boundaries

This audit treats the portfolio as one personal brand expressed through two closely related public sites:

- **Portfolio:** `wasimarif.com` — homepage, selected work, four portfolio case studies, writing index, and the published plain-English article.
- **Research:** `research.wasimarif.com` — research index, published paper, and two interactive data explorers.

The following 12 public pages were covered:

| Surface   | Route                                   | Role in the brand                                               |
| --------- | --------------------------------------- | --------------------------------------------------------------- |
| Portfolio | `/`                                     | Primary positioning, featured work, research proof, and contact |
| Portfolio | `/projects`                             | Complete selected-work index                                    |
| Portfolio | `/projects/fpl`                         | Portfolio case study about FPL Market Intelligence              |
| Portfolio | `/projects/mockpit`                     | Developer-tool case study                                       |
| Portfolio | `/projects/rewriter`                    | AI reading-product case study                                   |
| Portfolio | `/projects/openfgc`                     | Earlier data-product case study                                 |
| Portfolio | `/writing`                              | Editorial index                                                 |
| Portfolio | `/writing/design-systems-accessibility` | Plain-English research article                                  |
| Research  | `/`                                     | Research-lab positioning and publication index                  |
| Research  | `/papers/design-systems-accessibility`  | Full scholarly paper                                            |
| Research  | `/explore/uswds-a11y`                   | US dataset explorer                                             |
| Research  | `/explore/govuk-a11y`                   | UK dataset explorer                                             |

### Explicit exclusion: the FPL app

The separate FPL application under `apps/fpl`, including its own pages, visual system, interactions, and backend, is **not audited**. It is treated as a separate entity.

The FPL portfolio case study and the FPL spotlight embedded on the portfolio homepage are included only because they are part of the portfolio experience and materially affect how the personal brand is perceived. This audit evaluates their role and presentation inside the portfolio; it does not evaluate the FPL product itself.

External products linked from case studies—MockPit, Rewriter, OpenFGC, and the live FPL experiment—are also outside the rendered-product audit.

### Method

The findings combine:

- Source review of the route tree, page content, shared UI package, app styles, project assets, data visualisations, metadata, and social-card generator.
- A page-by-page rendered review in dark and light themes, at desktop and mobile sizes.
- Automated WCAG A/AA checks and horizontal-overflow checks on all 12 public pages at 320 px in both themes.
- A motion audit covering purpose, frequency, easing, duration, performance, reduced-motion handling, and cohesion.
- Editorial analysis of all public portfolio case-study copy, the writing index and article, the research index, the full paper, and both explorer descriptions.

The audit does not include user interviews, analytics, search-performance data, employer research, or recognition testing with people unfamiliar with the site. Those are recommended validation steps for the refresh.

## 2. Executive assessment

### The brand today, in one sentence

**A quietly rigorous product-minded software engineer who turns ambiguous, data-heavy ideas into inspectable systems that people can understand and trust.**

That proposition is already present, but it is distributed across the work rather than stated with full clarity. The homepage describes a software engineer across product and design engineering; the case studies repeatedly foreground decisions and evidence; the research lab proves methodological discipline; and the writing translates technical work into plain English. Together, these are much more distinctive than the generic category label “software engineer”.

### Overall verdict

The current portfolio is credible, restrained, accessible, and unusually honest about evidence. Its content demonstrates genuine range without relying on inflated claims. The design system is coherent across the portfolio and research app, and the quality of its responsive and accessibility implementation is a real brand asset.

The main weakness is not poor execution. It is that the execution is **more disciplined than distinctive**. Black, white, emerald, Geist, fine borders, and developer-style mono labels form a polished but familiar contemporary portfolio aesthetic. The most ownable visual language—thin signal rules, atmospheric colour, project accents, large assertive type, and the `WA` signature—currently appears most strongly in social cards, not in the pages people spend time on.

The content has the opposite problem: it is highly distinctive but not yet organised into a sufficiently sharp market position. AI products, frontend craft, APIs, developer tooling, accessibility, research, data engineering, visualisation, and product judgement are all credible, but presented at roughly similar weight. A reader can conclude “broad and capable” before they conclude what specific kind of role or collaboration should follow.

### Strongest brand assets to preserve

1. **Inspectable proof as a worldview.** The repeated problem → decision → evidence structure is more than a case-study template; it is a credible philosophy of building.
2. **Epistemic honesty.** Nulls, limitations, deviations, missing user evidence, and observational boundaries are reported without weakening the work.
3. **Translation across layers.** The work repeatedly turns difficult inputs into usable decisions: markets into forecasts, literature into accessible reading, runtime states into provenance, fragmented data into product views, and research into plain English.
4. **Product-to-system range.** Interfaces are consistently connected to the pipelines, data models, safety boundaries, and operational seams beneath them.
5. **Accessibility as practice rather than decoration.** Accessibility is present in the research topic, product decisions, shared components, charts, focus states, and automated quality gate.
6. **Quiet confidence.** The tone avoids hype while still making clear, testable claims.

### Largest refresh opportunities

1. Sharpen the primary proposition so breadth reads as an advantage beneath one recognisable specialty.
2. Resolve the brand architecture between the personal portfolio, research lab, FPL entity, and independent product brands.
3. Move the strongest visual ideas from the social cards into the core site experience.
4. Create one coherent mark and wordmark system instead of alternating between a serif `W`, `WA`, and text-only lockups.
5. Give research and writing clear roles in the employer-facing story rather than treating them mainly as adjacent destinations.
6. Add human and collaborative context to a body of work currently dominated by systems, artifacts, and independent creation.
7. Simplify high-density project cards and create more visual pacing across long text-led pages.

## 3. Current brand strategy, inferred from the site

The current site does not contain a formal brand strategy, but its repeated choices imply one.

### Implied brand essence

**Inspectable craft**

“Inspectable” is the most distinctive recurring concept in the portfolio. It connects implementation, interface design, open source, research reproducibility, provenance, explainability, and honest reporting. “Craft” prevents the idea from sounding like compliance or process alone; it keeps interface quality, judgement, and care in view.

### Implied brand promise

**The systems and products I build will not only work; their decisions, evidence, and limits will be understandable.**

### Implied positioning

The portfolio positions Wasim between several common categories:

- More product- and interface-minded than a conventional backend or data engineer.
- More systems- and implementation-oriented than a conventional product designer.
- More empirically rigorous than a typical design engineer portfolio.
- More accessible and conversational than a conventional research publication.

That intersection is valuable. The refresh should make it legible immediately rather than leaving readers to infer it after several pages.

### Current brand pillars

| Pillar                     | Evidence in the current site                                                         | Brand value                |
| -------------------------- | ------------------------------------------------------------------------------------ | -------------------------- |
| Inspectable decisions      | Problem/decision/evidence cards, proof trails, traceable data, explainable forecasts | Trust and senior judgement |
| Systems beneath interfaces | APIs, pipelines, data models, safety boundaries, browser tooling, ETL                | Engineering depth          |
| Accessible understanding   | Accessibility research, readable interfaces, plain-English writing, chart fallbacks  | Care and usability         |
| Open evidence              | Source links, packages, downloadable data, pre-registration, nulls and deviations    | Credibility                |
| Independent initiative     | Four self-directed products and a complete research system                           | Agency and range           |

### Personality profile

The present brand reads as:

- Rigorous more than playful.
- Calm more than expressive.
- Precise more than emotive.
- Technical but intentionally approachable.
- Independent, self-directed, and systems-minded.
- Sceptical of hype.
- Responsible with claims.
- More institutional on the research site and more personal in the blog.

The refresh should preserve the first seven traits while adding slightly more warmth, memorability, and evidence of collaboration.

## 4. Audience and information needs

The repository describes the portfolio as employer-facing. The public experience also serves technical peers and research readers.

### Primary audience: hiring managers and senior engineering/design leaders

They need to answer, quickly:

1. What kind of engineer is Wasim?
2. What level of ambiguity and system scope can he handle?
3. Can he connect product judgement, frontend craft, and technical depth?
4. What outcomes or evidence support the claims?
5. How does he work with other people and constraints?
6. What should I do next—contact, interview, or inspect a project?

The current site answers questions 2–4 particularly well. It answers question 1 broadly rather than sharply, and offers little direct evidence for question 5.

### Secondary audience: engineers, design engineers, and product builders

They are likely to value the architecture decisions, source links, published packages, data explorers, and clear boundaries between product and system concerns. The site serves this group well, though dense project cards repeat more information than this audience needs before opening a case study.

### Secondary audience: researchers and public-sector accessibility practitioners

The research app serves them with an unusually strong sequence: headline result, plain-language significance, methodology, diagnostics, limitations, downloads, and browser-based data exploration. The weakness is brand connection: a research reader can engage deeply without gaining much sense of Wasim’s wider product practice.

### Missing or under-served audience need

The site has no dedicated About, experience, CV, or collaboration page. Independent work proves initiative, but it does not show the environments, teams, responsibilities, or interpersonal practices in which that capability has operated. For an employer-facing refresh, this is a strategic content decision, not a minor missing page.

## 5. Brand architecture

### Current architecture

The ecosystem behaves as an endorsed personal-brand model:

```text
Wasim Arif
├── Portfolio / selected work
│   ├── FPL Market Intelligence
│   ├── MockPit
│   ├── Rewriter
│   └── OpenFGC
├── Writing
└── Research lab
    ├── Papers
    └── Data explorers
```

The implementation correctly keeps the apps deployable and technically separate. The public brand architecture is less resolved:

- The portfolio uses an animated serif `W` mark.
- The research header uses a text `WA / Research` lockup.
- Social cards use a mono `WA` signature.
- FPL receives a custom, high-contrast visual treatment and the largest featured-work footprint on the homepage.
- The research lab looks related through shared tokens, but its navigation and footer feel like a separate institutional publication rather than an unmistakable part of one personal brand.

### Central tension: FPL is separate, but visually dominant inside the portfolio

The dedicated FPL app is correctly separate and excluded from this audit. Inside the portfolio, however, FPL is:

- First in the project catalogue.
- The only project with a bespoke homepage spotlight rather than the shared project card.
- Visually larger than the other featured work.
- Styled with its own cyan/amber/grid aesthetic.

If FPL is intended to be “an entirely different entity”, the portfolio currently sends a mixed signal. The refresh should choose one of three explicit models:

1. **Contained flagship proof:** keep FPL prominent, but frame its distinct aesthetic inside a consistent personal-brand case-study system.
2. **Equal endorsed project:** remove the bespoke homepage spotlight and give FPL the same visual weight as other work.
3. **Separate venture:** reduce it to a compact endorsed link or place it in a ventures/experiments section so it cannot be mistaken for the portfolio’s master brand.

This audit does not prescribe which model is correct, but the decision must be made before visual design begins.

### Recommended architecture principle

Use one unmistakable personal-brand shell across portfolio, research, and writing. Allow projects to have controlled accent colours and product imagery inside that shell. Research can retain a more editorial density and FPL can retain its own product identity, but neither should replace the master brand in navigation, typography, or core page framing.

## 6. Visual identity inventory

### 6.1 Colour system

The shared UI tokens are defined in `packages/ui/src/styles.css:14`. The system is primarily neutral, with emerald used for status, links, labels, chart marks, and focus.

#### Dark theme

| Token          | Value     | Current role                   |               Contrast on canvas |
| -------------- | --------- | ------------------------------ | -------------------------------: |
| Canvas         | `#000000` | Page background                |                                — |
| Surface        | `#0a0a0a` | Cards and panels               |                                — |
| Raised surface | `#141414` | Hover/secondary surface        |                                — |
| Edge           | `#262626` | Default borders and dividers   |                                — |
| Strong edge    | `#404040` | Hover and emphasis borders     |                                — |
| Ink            | `#ffffff` | Primary text                   |                          21.00:1 |
| Muted ink      | `#9ca3af` | Body copy and secondary labels |                           8.27:1 |
| Subtle ink     | `#768091` | Metadata and captions          |                           5.27:1 |
| Accent         | `#10b981` | Focus, bars, status            | 7.00+:1 as a solid mark on black |
| Accent ink     | `#34d399` | Links and mono eyebrows        |                          10.92:1 |
| Warning        | `#f59e0b` | Warning states                 |                                — |
| Danger         | `#ef4444` | Errors                         |                                — |

#### Light theme

| Token          | Value     | Current role               | Contrast on canvas |
| -------------- | --------- | -------------------------- | -----------------: |
| Canvas         | `#ffffff` | Page background            |                  — |
| Surface        | `#f5f6f7` | Cards and panels           |                  — |
| Raised surface | `#ebedef` | Hover/secondary surface    |                  — |
| Edge           | `#e3e5e8` | Default borders            |                  — |
| Strong edge    | `#d2d5da` | Hover and emphasis borders |                  — |
| Ink            | `#111418` | Primary text               |            18.47:1 |
| Muted ink      | `#4b5563` | Body copy                  |             7.56:1 |
| Subtle ink     | `#626b78` | Metadata and captions      |             5.39:1 |
| Accent         | `#059669` | Focus, bars, status        |                  — |
| Accent ink     | `#047857` | Links and mono eyebrows    |             5.48:1 |
| Warning        | `#b45309` | Warning text               |             5.02:1 |
| Danger         | `#dc2626` | Error text                 |             4.83:1 |

All principal text colours clear WCAG AA for normal text. Even subtle text on the standard surfaces remains near 5:1. This is a strong foundation and should not be casually weakened during the refresh.

#### Colour character

The palette communicates:

- Technical seriousness.
- Low visual noise.
- Status/instrumentation language.
- A product-development rather than lifestyle or personal-editorial identity.
- Strong dark-mode confidence and solid light-mode parity.

#### Colour inconsistencies and opportunities

1. **The social-card accent is different.** Social assets use `#79e0c3`, while the live system uses `#10b981` and `#34d399`. The difference is subtle but enough to make the strongest brand assets feel like a parallel system (`tools/scanner/src/generate-social.ts:15`).
2. **The social cards use a richer near-black.** Their `#090b0f` base and green atmospheric glow have more depth than the pure-black site (`tools/scanner/src/generate-social.ts:88-90`).
3. **Project accent colours exist only on social cards.** MockPit lavender, Rewriter warm orange, OpenFGC blue, and FPL cyan create useful differentiation, but this taxonomy is not carried into project pages.
4. **Emerald does too many jobs.** It indicates links, status, focus, labels, chart data, list markers, and brand emphasis. That is efficient, but limits hierarchy and makes the palette feel utilitarian.
5. **The FPL spotlight introduces a strong separate palette.** Cyan and amber are successful inside that embedded product treatment, but because the spotlight is large they temporarily become the dominant portfolio colours.

#### Refresh direction

Preserve a near-black/paper-white neutral foundation and the excellent contrast discipline. Select one master “signal” colour and codify a small endorsed-project accent family. Use secondary colours only for project identity and data encodings, never as arbitrary decoration.

### 6.2 Typography

The live apps use:

- **Geist Variable** for interface and long-form prose.
- **Geist Mono Variable** for eyebrows, compact metadata, data values, labels, and code.

The social cards use **Inter/system sans**, creating a small but real identity mismatch (`tools/scanner/src/generate-social.ts:88`).

#### Current hierarchy

| Role                | Typical treatment                               | Effect                                         |
| ------------------- | ----------------------------------------------- | ---------------------------------------------- |
| Homepage/project H1 | 36–48 px, 600 weight, tight negative tracking   | Confident, modern, compact                     |
| Section feature H2  | 24–30 px, 600 weight                            | Clear but restrained                           |
| Writing article H1  | 30–36 px, 600 weight                            | Editorial and readable                         |
| Research paper H1   | 24 px, 500 weight                               | Scholarly restraint, but visually underpowered |
| Body                | 16 px, 1.5–1.75 line-height                     | Calm and readable                              |
| Blog body           | 17 px, 1.75 line-height                         | Strong long-form reading                       |
| Metadata/eyebrows   | 11–12 px mono, uppercase, 0.12–0.16 em tracking | Technical/instrumentation voice                |
| Data values         | 24–30 px mono or tabular sans                   | Evidence-first emphasis                        |

Text measures are consistently controlled through `max-w-2xl` (approximately 672 px) and `max-w-[70ch]`. `text-wrap: balance` and `text-wrap: pretty` are used well. The result is highly readable on both themes.

#### Typographic strengths

- Excellent body measure and line-height.
- Clear separation between narrative sans and technical mono.
- Restrained weight range prevents visual shouting.
- Tabular numerals are used for comparison-heavy statistics.
- Sentence-case headings support a calm, contemporary editorial tone.

#### Typographic weaknesses

1. **Geist is effective but not distinctive.** Combined with black/white/emerald and mono labels, it places the site inside a common developer-tool aesthetic.
2. **Top-level page hierarchy varies without a clear reason.** Projects uses a 36 px H1, while Writing uses 24 px and the research paper also uses 24 px. This makes writing and research feel secondary even when they are central proof of the brand.
3. **The serif `W` mark has no typographic counterpart.** Its editorial character could be a productive contrast, but today it appears disconnected from the all-Geist system.
4. **The social cards use a different primary typeface.** This weakens recognition across shared links and on-site arrival.
5. **Mono uppercase appears frequently.** It is effective for evidence and metadata, but repeated across virtually every eyebrow, decision label, proof item, and project treatment it risks becoming a generic “technical” texture rather than an intentional semantic layer.

#### Refresh direction

Keep Geist or a similarly neutral sans for UI, tables, and dense technical reading. Add distinction in one of two deliberate ways:

- Introduce a characterful display/editorial face for high-level brand statements and selected case-study headlines, making the existing serif mark feel intentional; or
- Retain a single sans family but commission or draw a distinctive `W/WA` mark and a more recognisable display treatment through custom spacing, cuts, or composition.

Do not add a decorative typeface to data tools or paper body copy. The strongest system would be expressive at the top and highly functional in depth.

### 6.3 Mark and lockups

The portfolio mark is visually memorable: a large serif `W` with a slow metallic gradient. It gives the homepage a more editorial and personal character than the rest of the UI.

Current issues:

- `apps/website/public/logo.svg` is an SVG wrapper around an embedded raster PNG rather than a true vector mark.
- The mark appears as `W` on the portfolio, `WA` in social cards, and `WA / Research` as text in the research header.
- There is no documented primary lockup combining mark, full name, and role.
- The animated gradient is defined as a CSS surface effect rather than a stable set of approved static and motion variants.
- The small-header and large-hero versions use the same underlying mask but do not form a broader identity system.

The refresh should produce:

1. A true vector master mark.
2. Primary, compact, and research-endorsed lockups.
3. Dark, light, monochrome, and one-colour versions.
4. Static and motion specifications.
5. Favicon and social-avatar versions tested at very small sizes.
6. A rule for when to use `W`, `WA`, and “Wasim Arif”—or a decision to retire two of them.

### 6.4 Layout and spacing

The layout system is clear and conservative:

- 56 px sticky header.
- `max-w-2xl` for narrative pages and hero copy.
- `max-w-3xl` for the research paper and explorers.
- `max-w-5xl` for project grids, featured research, and wider evidence panels.
- 24–32 px horizontal gutters.
- 64–96 px major vertical intervals.
- Responsive grid transitions at common 640, 768, and 1024 px breakpoints.

This creates an excellent reading rhythm and makes the site feel composed. It also produces long areas of plain canvas, particularly on text-heavy pages. The refresh should retain the whitespace but introduce a more ownable pacing system: annotated rules, evidence bands, selective full-width moments, or provenance/trace motifs rather than generic decorative sections.

### 6.5 Shape, borders, and elevation

Current shape language:

- Buttons: approximately 6 px radius.
- Standard cards/panels: 8 px radius.
- Project cards and hero media: 12 px radius.
- Badges: small 4 px radius rather than fully pill-shaped.
- Borders: 1 px neutral edge is the primary grouping device.
- Shadows: rare; a soft `0 24px 80px rgb(0 0 0 / 0.12)` is reserved for major project media.

The restraint is appropriate. The system feels precise rather than soft or consumer-like. It should be codified as tokens so the refresh does not drift into an arbitrary mixture of rounded cards.

### 6.6 Iconography

Tabler icons are used consistently at 16–19 px with a light stroke. They support actions without becoming decorative. Icons are almost always paired with text, and icon-only social/theme controls have accessible labels.

The icon system is competent but not ownable. Distinction should come from the mark, typography, composition, and evidence motifs rather than replacing a useful standard icon set.

### 6.7 Imagery and project presentation

Project covers are consistently prepared at 1440 × 900 and displayed at a 16:10 ratio. OpenFGC detail figures use 1600 × 900. Images have descriptive alt text, explicit dimensions, lazy loading below the fold, and consistent rounded/bordered framing.

Strengths:

- Real interface evidence rather than abstract mockups.
- Consistent crop and aspect ratio.
- High technical image quality and no cumulative-layout-shift risk.
- Case-study figures are captioned and placed in narrative context.

Weaknesses:

- The product screenshot often supplies nearly all of a card’s visual character, so the personal brand recedes behind each product brand.
- Screenshots are mostly unannotated. The copy explains decisions, but the imagery rarely points to the specific interface consequence of those decisions.
- The portfolio contains no portrait, environmental image, sketch, or process artifact. It communicates systems and output, but little human presence.
- FPL’s dark, data-dense cover dominates the project index because it appears first and has a particularly strong visual identity.

Refresh opportunity:

- Create one consistent “evidence frame” for screenshots: controlled background, title/role marker, optional numbered annotation, and a trace back to the decision it demonstrates.
- Use project accents as a small label/rule/annotation layer, not as whole-page rebrands.
- Consider one high-quality personal image or working-context image if the refresh needs more warmth and recognisability.

### 6.8 Data visualisation

Charts are built with Observable Plot and share the UI tokens. The current chart language is:

- Transparent background.
- Muted axes and labels.
- Emerald bars, rules, and points.
- Dashed neutral reference lines.
- Compact 10–11 px labels.
- Textual `aria-label` summaries with generated SVGs made decorative.
- Data tables as an accessible precise counterpart.

This is an excellent functional baseline. It makes research feel native to the brand instead of embedded from a separate plotting tool.

Limitations for a future research programme:

- The palette is almost entirely monochrome plus one accent.
- Component/template categories use colour but do not yet establish a broader, documented categorical palette.
- Small rotated labels are dense on mobile, even though they remain functional.
- Research visuals do not currently carry a recognisable figure-number, source, or “Wasim Arif Research” frame when detached from the paper.

The refresh should define an accessible chart palette, shape/pattern redundancies, annotation style, figure headers, and export rules.

### 6.9 Social cards

The social cards are the most complete expression of an ownable visual identity in the current system:

- Near-black `#090b0f` background.
- Atmospheric accent glow in the upper-right.
- A short 3 px signal rule.
- Mint mono eyebrow.
- Very large, tightly set display headline.
- Muted detail line.
- Compact `WA` signature.
- Project-specific accents for endorsed products.

They are more graphic, confident, and recognisable than the live pages. They also make the current inconsistencies visible: Inter instead of Geist, a different mint, and `WA` instead of the live `W`.

**High-leverage refresh move:** treat the social-card system as a prototype for the master identity. Bring its signal rule, controlled atmosphere, display scale, and signed authorship into selected page moments—without turning every page into a promotional card.

### 6.10 Light and dark themes

Theme parity is excellent:

- Both themes have purpose-built surface, edge, ink, accent, warning, and danger tokens.
- Native controls and scrollbars follow `color-scheme`.
- The mark switches to an appropriate dark treatment in light mode.
- Focus and selection states remain visible.
- Theme selection is persisted and chosen before first paint.

The themes are largely direct tonal inversions. A refresh could allow subtle material differences—for example paper texture or warmer neutral values in light mode—but should preserve equal quality and not make one theme canonical and the other an afterthought.

### 6.11 Responsive behaviour

At 320 px, in both themes, all 12 public pages passed the scoped automated audit with:

- No horizontal overflow.
- No WCAG A/AA axe violations.
- No console errors.

The mobile system is strong:

- Header navigation fits at 320 px.
- Multi-column evidence and stats collapse into a deliberate reading order.
- Project cards and research cards preserve their hierarchy.
- Tables remain keyboard-scrollable.
- Explorer controls and charts remain usable.

Potential refresh caution: the current header fits because labels and spacing are compact. Any longer nav labels, wider mark, larger type, or new About/CV item will require a deliberate mobile navigation model rather than simply adding another link.

## 7. Motion and interaction audit

### Current motion inventory

| Motion               | Location                                          | Current behaviour                                                 | Assessment                                                                                    |
| -------------------- | ------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Metallic mark        | `apps/website/src/styles.css:42-117`              | Continuous 12 s background-position animation using `ease-in-out` | Memorable but paint-heavy and always running                                                  |
| Theme transition     | Website/research app styles                       | Background and text colour over 200 ms `ease`                     | Calm and appropriate                                                                          |
| Project-card lift    | `apps/website/src/components/project-card.tsx:24` | `translateY` with 300 ms transition                               | Subtle, slightly slow for frequent hover                                                      |
| Project-image zoom   | `apps/website/src/components/project-card.tsx:39` | 500 ms scale to 1.012                                             | Refined but leisurely; product screenshot receives more motion than the card decision content |
| Link/button colour   | Throughout both apps                              | Tailwind `transition-colors`, usually default duration/easing     | Consistent but not tokenised                                                                  |
| Arrow nudge          | `project-card.tsx:95`                             | Small horizontal movement on group hover                          | Useful directional feedback                                                                   |
| Status pulse         | `packages/ui/src/components/status-dot.tsx:29`    | 5 s pulse, reduced-motion disabled                                | Currently latent/unused on audited pages                                                      |
| Smooth anchor scroll | Both app styles                                   | Native smooth scroll                                              | Helpful on long paper, removed for reduced motion                                             |

### Motion character

The site is intentionally restrained. This fits the brand: evidence should feel stable, controls should feel crisp, and content should not compete with decorative choreography. There are no gratuitous route transitions, scroll-jacked sequences, or large entrance animations.

### Motion findings

1. **No shared motion tokens.** Durations and easings are supplied by Tailwind defaults or written directly. A refresh could easily introduce drift.
2. **The only signature motion is technically the least efficient.** The metallic mark continuously animates `background-position`, which repaints rather than relying on `transform` or `opacity`.
3. **Constant shimmer uses `ease-in-out`.** Constant looping motion is normally more coherent with `linear`; a branded shimmer may be better as a rare or one-shot event rather than a perpetual loop.
4. **Project hover motion is not gated to fine pointers.** Touch browsers can produce sticky hover states. Motion reduction is handled, but pointer capability is not.
5. **The global reduced-motion rule nearly eliminates every transition.** It successfully removes movement, but also removes useful colour/opacity feedback. Reduced motion should keep non-spatial feedback where it aids understanding.
6. **Interactive state changes mostly teleport.** Theme colour is handled, but explorer result updates and some filtered chart changes could use a very brief opacity transition to clarify that content refreshed—without sliding or rearranging the data.
7. **Press feedback is absent.** Primary buttons and icon buttons have hover and focus feedback but no subtle active-state compression.

### Recommended motion language

The refresh should define a small, explicit system:

```css
--duration-press: 120ms;
--duration-ui: 180ms;
--duration-emphasis: 240ms;
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
```

- Enter/exit UI: strong ease-out, under 300 ms.
- On-screen movement: ease-in-out.
- Colour and hover: simple `ease`.
- Button press: `scale(0.97)` for 120–160 ms on appropriate controls.
- Brand mark: one-shot or rare shimmer using a compositor-friendly mask/transform where possible.
- Hover transforms: wrap in `@media (hover: hover) and (pointer: fine)`.
- Reduced motion: remove position/scale movement but retain short opacity and colour transitions.
- Data changes: use brief opacity crossfades only when they improve state comprehension; never animate bars from zero on every filter change.

## 8. Component and styling audit

### Shared components

The shared `ui` package correctly centralises theme tokens and several accessible primitives: Badge, Card, DataTable, Prose, Section, Stat, StatusDot, and ThemeToggle.

Strengths:

- The design system is genuinely shared by portfolio and research rather than duplicated visually.
- Components are small and semantically appropriate.
- Focus-visible styling is global and strong.
- DataTable has a caption, scoped headers, numeric alignment, and keyboard-scrollable region.
- ThemeToggle has a stable 40 px target and accessible name.

Refresh risks:

- Spacing, radius, type sizes, and motion are still mostly expressed as local utility choices rather than semantic tokens.
- Card is only a bordered surface; higher-order variants are implemented ad hoc in pages.
- Buttons and links have no shared component contract, producing repeated class strings.
- There is no documented semantic distinction between brand accent, interactive accent, data accent, and status accent.
- The portfolio and research app duplicate some global CSS and shell behaviour.

The refresh should deepen the shared system without making every page look component-library generated. Define semantic primitives for action, page header, evidence panel, project media frame, article figure, and app lockup; keep expressive composition at page level.

### Accessibility and interaction quality

The current baseline is notably strong:

- Skip links on both apps.
- Semantic landmarks and hierarchical headings.
- Visible focus styles.
- Labelled native select control.
- URL-synchronised explorer filters.
- Useful loading, empty, and error states.
- Polite live status for explorer queries.
- Explicit image dimensions and meaningful alt text.
- Decorative SVG/icons hidden from assistive technology.
- Chart text alternatives and precise tables.
- `prefers-reduced-motion` handling.
- Touch manipulation and deliberate tap-highlight behaviour.

No axe violations were found in the scoped browser audit. This does not replace manual screen-reader, keyboard, zoom, or colour-vision testing, but it is a valuable brand-quality floor.

### Small interaction issues to address during refresh

- Most interactive targets are 40 px high; key actions are 44 px. This is workable, but mobile standards for the refreshed system should decide whether 44 px becomes the default.
- Active/current navigation styling is slightly inconsistent: Work uses background plus ink, while Writing is mostly ink-only.
- Cross-site links are not visually differentiated from same-site links. The content explains some transitions, but the system has no consistent endorsed-site indicator.
- Explorer source/download metadata is dense and uses small type; it could be progressively disclosed on mobile.
- Error messages are functional but visually generic; a refreshed system should preserve their clarity while giving them a stronger brand voice.

## 9. Page-by-page design and content audit

### 9.1 Portfolio homepage

**Current role:** introduce Wasim, establish breadth, drive selected work, prove research capability, and invite contact.

**Design strengths**

- The large serif `W`, mono location/role line, restrained headline, and generous whitespace create a strong first impression.
- Primary, secondary, and tertiary calls to action are visually distinct.
- The project and research sections widen to `max-w-5xl`, creating useful rhythm after the narrow introduction.
- The research evidence block converts an abstract publication into three immediate, comparable proof points.
- Contact is explicit and repeated after the proof sections.

**Content strengths**

- “I like the point where a half-formed idea becomes something people can understand, trust, and use” is the clearest human expression of the brand.
- The page names both product and design engineering without claiming to be a designer.
- It connects AI workflows and APIs to interfaces and data visualisation, demonstrating end-to-end scope.
- The research summary includes the methodological limitation, which reinforces trust.

**Weaknesses**

- “Software engineer across product & design engineering” is accurate but category-heavy. It explains breadth more than distinct value.
- The second paragraph contains many capabilities at equal weight; a hurried reader may not know which one should anchor their memory.
- The FPL spotlight is the most visually dominant work element and temporarily replaces the personal brand with FPL’s own aesthetic.
- There is no concise experience, collaboration, or availability signal.
- Social links appear twice across homepage and footer without a clear reason for the duplication.
- The research section is strong enough to be a central differentiator, but the primary introduction does not name research or evidence as part of the proposition.

**Refresh implication**

Lead with the differentiating outcome—inspectable, trustworthy systems—then use product/design engineering, AI, accessibility, and research as proof of range. Decide FPL’s architectural role before redesigning featured work.

### 9.2 Selected work index

**Current role:** present the complete project set and establish a consistent evidence standard.

**Design strengths**

- Strong headline: “Products with inspectable decisions.”
- Two-column cards create a clear overview on desktop and a logical single-column mobile flow.
- Project cover, lifecycle, summary, decision, evidence, tags, and actions are all visible without opening a case study.
- Earlier work is separated honestly rather than made to look current.

**Weaknesses**

- Each card contains a cover, metadata, summary, two proof fields, tags, and two actions. The cards are excellent mini case studies but heavy index items.
- Repeating “Decision” and “Evidence” on every card makes the structure clear but reduces scan speed.
- Product images dominate differentiation, so the page reads as a collection of product brands rather than one authored body of work.
- FPL is first due to date and visually very dark/dense; its position shapes first impressions of the whole portfolio.

**Refresh implication**

Use a lighter index-card model: one decisive claim, one proof signal, and one primary action. Keep the full problem/decision/evidence trail for the detail page. Add an authored visual frame or project-accent system.

### 9.3 Shared case-study template

**Current role:** explain independent work with a consistent, inspectable narrative.

**Design strengths**

- Strong wide-to-narrow rhythm: narrative hero, large product image, proof trail, then focused prose.
- Problem/Decision/Evidence proof trail is a distinctive and reusable device.
- Project actions expose live work, source, packages, or documentation.
- Long-form prose has excellent measure, spacing, and hierarchy.
- Decision panels and figures interrupt text with useful evidence rather than decoration.

**Content strengths**

- Case studies foreground reasoning instead of feature inventories.
- Claims are carefully bounded by what exists today.
- “What the project proved—and did not prove” is a particularly strong recurring frame.

**Weaknesses**

- The template provides little explicit space for team, constraints, timeline phases, users, or measured outcomes.
- All projects list “Independent creator”. That proves ownership but leaves collaborative behaviour invisible.
- The opening proof trail largely repeats content already shown on the project index.
- Case studies are prose-led and may feel visually similar despite different product categories.

**Refresh implication**

Evolve the template to: Context → Role & constraints → Key decision → System/interface consequence → Evidence/outcome → Limitations → What changed next. Retain the three-part proof trail as a signature summary.

### 9.4 FPL portfolio case study

**Scope note:** only the portfolio case-study page and its portfolio-facing content are assessed here; the FPL app itself remains excluded.

**Strengths**

- The content clearly explains why point-in-time evidence and uncertainty matter.
- The “market → points trace” is a strong example of an ownable provenance motif.
- The case study demonstrates data contracts, modelling, product interaction, and backend seams in one narrative.
- The copy explicitly explains why the FPL app is separate from the portfolio and research backend.

**Brand issue**

The case study is valuable evidence for the personal brand, but the homepage spotlight gives its product identity more visual authority than the master identity. This is a brand-architecture problem, not a judgement on the FPL design.

**Refresh implication**

Keep the trace/provenance story as proof of systems thinking. Contain the product palette and decide whether FPL is flagship work, an endorsed venture, or a separate entity linked more discreetly.

### 9.5 MockPit case study

**Strengths**

- Contains one of the clearest brand-aligned problems: a prototype can look more real than it is.
- Establishes a shared vocabulary for live, mocked, derived, hardcoded, and unknown data.
- Strong architecture decision around framework-neutral core and custom-element devtools.
- Excellent honesty: published packages and tests are evidence; adoption outside the author’s examples is not yet proven.

**Refresh opportunity**

This may be the purest expression of “inspectable craft” and could carry more prominence in the master narrative. Add annotated interface evidence and a compact diagram of the provenance model.

### 9.6 Rewriter case study

**Strengths**

- Human-centred product stance: adapt the book without turning it into a chatbot.
- Strong integration of calm interface design, model boundaries, safety, resilience, privacy, and accessibility.
- “Failure is part of the reading experience” and “reading controls that belong to the reader” are memorable, value-led headings.
- Explicitly avoids presenting age bands as clinically validated outcomes.

**Refresh opportunity**

This case study provides warmth and user orientation that the broader portfolio needs. Give the actual reading experience more visual presence and use it to balance data-heavy/devtool work.

### 9.7 OpenFGC case study

**Strengths**

- Clear retrospective framing and honest lifecycle status.
- Good product principle: separate summary from investigation.
- Multiple figures show the work at different levels of depth.
- Refuses to claim sponsor conversion or organiser productivity without measurement.

**Weaknesses**

- As earlier work, it occupies more narrative space than its evidence strength may warrant.
- The live restoration is useful, but the case study lacks contemporary reflection on what would be designed differently now beyond user interviews.

**Refresh implication**

Keep it as an “earlier foundation” with a shorter retrospective format. Use it to show the origin of current data-product and visualisation themes.

### 9.8 Writing index

**Strengths**

- Clear editorial promise: built, measured, or changed my mind about.
- Explicit relationship to the full research site.
- Simple chronological list supports future growth.

**Weaknesses**

- With one article, “Writing” reads as a future programme more than an established publication.
- The H1 and page introduction are significantly quieter than the Projects page, which lowers perceived importance.
- The index has little visual identity beyond the shared tokens and badges.
- “Write-ups, tutorials, and research” in metadata promises broader coverage than the public corpus currently demonstrates.

**Refresh implication**

Either seed a credible initial collection before making Writing a primary nav item, or label it more modestly (for example Notes) until it grows. Define 3–4 recurring editorial themes so the section has an ownable remit.

### 9.9 Plain-English article

**Strengths**

- Excellent opening tension followed by the direct pivot: “So I checked.”
- Explains axe-core’s limits before presenting results.
- Converts statistical findings into practical engineering meaning without erasing uncertainty.
- Uses sceptical questions, counterarguments, a held-out replication, failed predictions, and takeaways to sustain a clear narrative.
- Figures, stat rows, callouts, and the deep-link card create good editorial pacing.
- The closing handoff to the full paper and explorers is effective.

**Voice**

Conversational, technically literate, candid, and lightly irreverent (“the UK partial-adoption band is a mess”, “One shot, no peeking”). This is the warmest and most distinctive voice in the current ecosystem.

**Weaknesses**

- The deck says “the result survived every attempt I made to break it”, which is rhetorically strong but slightly more absolute than the careful limitations later in the article.
- The article is long enough that stronger in-page navigation or a short key-takeaways block could help non-linear readers.
- The visual system is still largely the research system placed into a blog layout; there is little unique editorial art direction.

**Refresh implication**

Use this voice as the reference for brand writing: direct, evidence-led, plain, and willing to say what failed. Build a reusable article system with key takeaways, section navigation, share imagery, and consistent figure annotation.

### 9.10 Research index

**Strengths**

- “Open research. Inspectable systems.” is the clearest high-level proposition anywhere in the ecosystem.
- The paper card gives result, replication, and sample size before asking for a click.
- “What I built” makes the software system behind the paper visible.
- Data explorers and research discipline are first-class sections rather than footnotes.
- The footer reinforces versioned evidence and open source.

**Weaknesses**

- The site feels more institutional than personal; only the `WA / Research` lockup and a Portfolio link connect it to the wider practice.
- One published paper makes “lab” aspirational, though the singular section label is appropriately honest.
- The paper, engineering, explorer, and method sections are all visually similar bordered-text systems; more editorial pacing would help.

**Refresh implication**

Preserve the research proposition and evidence density. Strengthen the endorsed personal-brand lockup, add a clearer bridge back to related work/writing, and give figures/publications a recognisable authored frame.

### 9.11 Full paper

**Strengths**

- Excellent progressive disclosure: status, title/question, finding/meaning/build summary, headline stats, contents, abstract, full sections, limitations, deviations, and downloads.
- Scholarly content is published as accessible HTML, not trapped in a PDF.
- Tables are captioned and charts have textual alternatives.
- Nulls, reversals, calibration repairs, and labelling corrections are reported prominently.
- Every figure and download traces to a versioned artifact.

**Weaknesses**

- The 24 px/medium H1 undersells the importance of the publication compared with portfolio-project headlines.
- Long diagnostic sections are necessarily dense, but the page offers limited sticky orientation or reading progress.
- The design looks like a competent technical document more than a distinctive authored publication.
- “We” is used in the paper while the site consistently presents a single author; if collaborators or institutional conventions explain that choice, it should be explicit.

**Refresh implication**

Retain HTML-first accessibility and evidence structure. Improve publication identity, headline hierarchy, figure framing, and long-document navigation without making the paper look promotional.

### 9.12 Data explorers

**Strengths**

- Browser-local queries and downloadable Parquet artifacts embody the open/inspectable promise.
- Native select, URL-reflected filter, loading status, empty state, error state, retry, and download fallback are all well handled.
- Charts and data table present both pattern and precision.
- Privacy reassurance is explicit: filter choices do not leave the browser.

**Weaknesses**

- Dataset names and descriptions are technically complete but dense, especially on mobile.
- Source, local-query explanation, and download action compete in one small metadata paragraph.
- The chart system is functional but visually generic.
- A filter change updates the full evidence area without a strong visual state boundary beyond “Querying…”.

**Refresh implication**

Lead with a plain-language question the explorer answers, move schema/source detail into progressive disclosure, and give the explorer an evidence-workbench identity consistent with the wider brand.

## 10. Content and editorial analysis

### 10.1 Topic map

The public corpus covers six connected topic families:

1. **Product and design engineering** — turning ideas into understandable, usable interfaces.
2. **AI product design** — agent workflows, LLM adaptation, narration, provenance, model boundaries, and recoverable failure.
3. **Data systems and decision support** — immutable capture, identity resolution, forecasting, data pipelines, browser analytics, and visualisation.
4. **Accessibility** — interface practice, design-system research, automated auditing, and the limits of machine-detectable conformance.
5. **Developer tooling and trust** — provenance, redaction, modes, policies, packages, and CI.
6. **Open research and reproducibility** — pre-registration, held-out replication, versioned artifacts, null results, deviations, and public data.

These are not random interests. They share a common concern: **how people can trust a system when the underlying process is complex or uncertain.**

### 10.2 Recurring themes

#### Inspectability

The most frequent conceptual pattern is making hidden state visible:

- Which prototype data is real?
- Which evidence produced a player forecast?
- Which design-system signals are associated with accessibility outcomes?
- Which source and transform produced a chart?
- Which limitations prevent a result from becoming a causal claim?

This is the strongest candidate for the refreshed brand’s organising idea.

#### Translation

Every major project translates between worlds:

- Market prices → FPL scoring and uncertainty.
- Difficult literature → selected reading level and narration.
- Runtime data sources → a shared provenance vocabulary.
- Fragmented game/event data → decision-speed product views.
- Statistical research → practical engineering guidance.
- Parquet artifacts → browser-queryable charts and tables.

This makes “I make complex systems understandable” credible rather than generic.

#### Boundaries and seams

The writing repeatedly identifies a boundary as the design decision: framework-neutral core versus UI adapter, plain text versus trusted markup, raw capture versus read model, research app versus product backend, evidence versus inference. This signals architectural maturity.

#### Evidence before impact claims

The case studies distinguish what was built from what was proven. Missing adoption, user testing, business outcomes, or causal identification is explicitly acknowledged. This is rare and valuable.

#### Accessibility and autonomy

Accessibility is paired with user control: reading preferences, keyboard operation, local sessions without identity, browser-local data queries, and interfaces that explain uncertainty.

#### Calm alternatives to hype

The work avoids the default AI-product pattern—chat interfaces, opaque scores, or fake completion. It favours calm workflows, traceable state, and recoverable failure.

### 10.3 Writing style

The shared writing style is:

- Active and first-person in portfolio/blog copy.
- Precise, declarative, and often structured around contrast.
- Comfortable with technical terms, but usually defines why they matter.
- Rich in em dashes, colons, and medium-to-long sentences.
- Strongly causal in narrative sequence even when careful not to claim causal research results.
- More interested in decisions and boundaries than feature lists.

Common headline patterns include:

- **Tension:** “A prototype can look more real than it is.”
- **Reframing:** “A transfer decision is a probability problem.”
- **Principle:** “Failure is part of the reading experience.”
- **Contrast:** “Preserve structure before preserving style.”
- **Honest boundary:** “What the prototype proved—and did not prove.”
- **Question:** “Do design systems actually deliver on accessibility?”

This is a strong editorial grammar for the refresh.

### 10.4 Tone by surface

| Surface        | Tone                             | Strength                   | Risk                               |
| -------------- | -------------------------------- | -------------------------- | ---------------------------------- |
| Homepage       | Calm, capable, personal          | Approachable breadth       | Positioning remains broad          |
| Project index  | Evaluative and proof-led         | Signals judgement          | Repetition can feel process-heavy  |
| Case studies   | Technical, candid, reflective    | High trust                 | Can underplay emotion and outcomes |
| Blog           | Conversational, sceptical, vivid | Most distinctive voice     | Only one public example            |
| Research index | Institutional, open, disciplined | Credible publication frame | Personal authorship recedes        |
| Paper          | Academic and exact               | Methodological seriousness | Dense and less brand-expressive    |
| Explorers      | Functional and reassuring        | Trustworthy tool voice     | Metadata-heavy                     |

### 10.5 Voice principles worth codifying

1. State the claim plainly.
2. Show how the claim was tested.
3. Name what did not work or was not measured.
4. Translate technical details into a user or engineering consequence.
5. Prefer a concrete decision over a list of capabilities.
6. Use first person when authorship matters.
7. Avoid hype words unless quoting or challenging them.
8. End with the next inspectable artifact: source, live product, data, paper, or limitation.

### 10.6 Vocabulary to preserve

- Inspectable
- Evidence
- Decision
- Trace / trail
- Versioned
- Frozen
- Open
- Accessible
- Understand / trust / use
- Boundary / seam
- Point-in-time
- Reported as found
- Plain English

These terms should not all become taglines. They are valuable because the work earns them. Select a small core vocabulary and use the rest as supporting language.

### 10.7 Vocabulary and patterns to watch

- “Inspectable”, “proof”, “decision”, and “evidence” are repeated often enough that they could feel formulaic after a refresh if every card and heading contains them.
- “What I built” is useful but can centre output over user change.
- “Real”, “working”, and “production” need concrete definitions wherever used.
- “End to end” is accurate but common; show the actual span instead.
- Technical nouns sometimes stack densely in project summaries and dataset descriptions.
- The academic “we” should be reconciled with single-author branding.

### 10.8 Content strengths

- Specific rather than generic.
- Honest about limitations.
- Technically credible.
- Consistent with the implementation visible in the repository.
- Strong at explaining architectural decisions.
- Strong at making research practical.
- Avoids vanity metrics and invented impact.

### 10.9 Content gaps

1. **Collaboration:** little evidence of how Wasim works with designers, product managers, researchers, users, or engineering teams.
2. **Professional context:** no career timeline, role history, CV, or scale of organisational responsibility.
3. **User evidence:** several projects correctly state that user validation is next; the overall portfolio therefore has limited user-outcome proof.
4. **Business/operational outcomes:** most evidence is artifact, deployment, test, or methodology based.
5. **Personal motivation:** the homepage offers one strong sentence, but case studies rarely explain why these problems matter personally.
6. **Editorial depth:** one article and one paper cannot yet demonstrate a durable writing/research programme.
7. **Clear ask:** contact exists, but role preferences, availability, and the kind of team/environment sought are only lightly described.

## 11. Strategic diagnosis

### What the current brand communicates well

- Senior technical judgement.
- Ability to move from problem framing to implementation.
- Comfort across frontend, backend, data, and research.
- Accessibility and reliability as engineering concerns.
- Independence and initiative.
- Intellectual honesty.
- Care for explanation and evidence.

### What it communicates less well

- A memorable specialism in the first five seconds.
- A human story beyond independent building.
- Team and leadership behaviour.
- Commercial or user impact.
- Whether research is a core practice, a current project, or a separate professional direction.
- Whether FPL is flagship work, a venture, a hobby experiment, or a separate brand.
- Why a visitor should choose Wasim over another strong design engineer or product engineer.

### Core strategic tension

The portfolio says “broad product and design engineer”, while the work says something more distinctive: “an engineer who makes complex systems inspectable and trustworthy.” The refresh should promote the second idea and use the first as category context.

### Distinctive brand equities

These are the elements competitors would find hardest to copy credibly:

1. A real pre-registered, held-out research replication built and published as an accessible software system.
2. A consistent philosophy of inspectable state and traceable evidence across unrelated product categories.
3. A willingness to publish nulls, limitations, and missing evidence.
4. Product/interface care combined with deep data and system seams.
5. The ability to explain the same work in product, engineering, and research language.

The refresh should build from these equities, not from a generic visual trend.

## 12. Prioritised findings

### Critical brand decisions

| Priority | Finding                                                          | Why it matters                                                                         | Evidence                                                                   |
| -------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| P0       | Primary positioning is broad rather than ownable                 | Readers must synthesise too many capabilities before understanding the differentiator  | Homepage copy, `apps/website/src/routes/index.tsx:49-55`                   |
| P0       | FPL’s role conflicts with its intended separation                | The separate entity currently receives the portfolio’s largest custom visual treatment | Homepage spotlight and first project, `index.tsx:119`, `projects.ts:43-77` |
| P0       | Personal, research, and product brand architecture is unresolved | `W`, `WA`, `WA / Research`, and product aesthetics compete for authorship              | Portfolio/research headers and social generator                            |
| P0       | Employer-facing collaboration/experience story is missing        | Independent work alone cannot answer how Wasim operates in teams                       | No About/experience route or collaboration section                         |

### High-value design findings

| Priority | Finding                                                         | Why it matters                                                                        | Evidence                                            |
| -------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------- |
| P1       | Strongest identity exists in social cards, not pages            | Recognition drops after arrival; the site feels more generic than its shared previews | `generate-social.ts:84-97` versus live app shells   |
| P1       | The logo is not a true vector and has no coherent lockup family | Limits scalability, consistency, and future applications                              | `apps/website/public/logo.svg:1`                    |
| P1       | Typography is highly readable but category-generic              | Geist + mono + emerald is common in developer portfolios                              | `packages/ui/src/styles.css:37-40`                  |
| P1       | Top-level page hierarchy is inconsistent                        | Writing and the paper appear less important than projects                             | Writing H1 24 px; Projects H1 36 px; Paper H1 24 px |
| P1       | Project imagery overpowers personal authorship                  | Cards inherit the product’s visual brand with little authored framing                 | `project-card.tsx:24-42`                            |
| P1       | Project index cards are too information-dense                   | They slow scanning and duplicate the case-study proof trail                           | `project-card.tsx:42-110`                           |

### Content findings

| Priority | Finding                                                            | Why it matters                                                                                  |
| -------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| P1       | “Inspectable” is a genuine positioning asset but risks overuse     | It should organise the brand, not appear in every label                                         |
| P1       | Research is a powerful differentiator but structurally adjacent    | It should inform the primary proposition and work story                                         |
| P1       | Writing and research corpus is thin                                | Primary-nav prominence creates an expectation of depth not yet met                              |
| P2       | Case studies under-represent users, constraints, and collaboration | The work can feel like architecture notes rather than complete product stories                  |
| P2       | Honest absence of impact is admirable but accumulates              | Add user or operational evidence where feasible rather than compensating with stronger rhetoric |

### Motion and interaction findings

| Priority | Finding                                             | Why it matters                                                                       | Evidence                                            |
| -------- | --------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------- |
| P2       | No shared duration/easing tokens                    | A refresh will create inconsistent motion without a contract                         | Transitions across app/component files              |
| P2       | Continuous logo motion animates background position | It is the signature motion but incurs paint and is always present                    | `apps/website/src/styles.css:42-117`                |
| P2       | Reduced motion removes nearly all transitions       | Useful non-spatial feedback is lost                                                  | Website styles `:488-508`, research styles `:35-51` |
| P3       | Hover transforms are not pointer-gated              | Touch can produce false/sticky hover treatment                                       | `project-card.tsx:24,39`                            |
| P3       | Press feedback is missing                           | Primary actions feel slightly less tactile than the rest of the craft level suggests | Shared action classes                               |

### Quality baseline to preserve

| Area                  | Current result                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------- |
| WCAG automated checks | 0 axe A/AA violations across 24 route/theme combinations at 320 px                        |
| Responsive overflow   | 0 horizontal overflows across the same combinations                                       |
| Runtime stability     | 0 console errors in the final 12-page, two-theme run                                      |
| Contrast              | All primary/muted/subtle text tokens meet normal-text AA on their intended canvas/surface |
| Reduced motion        | Implemented across both apps                                                              |
| Image stability       | Explicit dimensions throughout portfolio media                                            |
| Data accessibility    | Charts have text alternatives and precise tables                                          |

## 13. Recommended refresh platform

### Recommended brand territory: Inspectable craft

This is the best fit because it joins the strongest content theme with the current design’s restraint and precision.

#### Possible core proposition

**Product-minded software engineer building inspectable systems.**

#### Possible supporting statement

**I turn ambiguous, data-heavy ideas into products people can understand, trust, and use—from AI workflows and APIs to accessible interfaces, data visualisation, and open research.**

These are working strategic lines, not final copy. They should be tested with target hiring managers and peers before adoption.

### Alternative territories

#### Research-backed product engineering

Emphasises the unusual combination of product delivery and empirical discipline. Strong for public-interest technology, accessibility, data products, and evidence-led organisations. Risk: it may make every project sound like formal research.

#### Quiet systems studio

Emphasises calm craft, independence, and end-to-end building. Strong visual potential and warmer tone. Risk: “studio” may imply consultancy or a team rather than an individual engineer seeking a role.

#### Trustworthy AI and data products

Emphasises current market relevance and the provenance/uncertainty thread. Strong for AI product roles. Risk: it narrows accessibility, frontend craft, and research into support material and may age faster.

“Inspectable craft” is broad enough to contain all current work while still being specific to how Wasim approaches it.

## 14. Refresh creative brief

### Desired perception

After five seconds, a visitor should think:

> Product-minded engineer. Strong interface craft. Unusually serious about evidence and trust.

After two minutes:

> He can own ambiguous work across product, frontend, data, and the system beneath the interface—and he can explain the decisions clearly.

After a deep read:

> The claims are inspectable, the limits are honest, and the work has enough technical depth to trust.

### Brand attributes

Prioritise:

- Rigorous
- Clear
- Calm
- Curious
- Trustworthy
- Systems-minded
- Humane
- Quietly distinctive

Avoid:

- Futuristic AI cliché
- Generic terminal/developer aesthetic
- Academic austerity
- Corporate design-system sterility
- Gratuitous data decoration
- Loud self-promotion
- Over-rounded SaaS component language

### Visual principles

1. **Show the trace.** Use lines, numbered evidence markers, annotations, and source-to-decision paths as a signature visual grammar.
2. **Express at the top, disappear in depth.** Heroes and social cards can be distinctive; paper body, tables, and tools should become quiet and functional.
3. **Use atmosphere sparingly.** Adapt the social cards’ mint glow and signal rule for selected moments rather than covering every surface in gradients.
4. **Frame product brands.** Project colours and screenshots should live inside a consistent authored evidence frame.
5. **Make data editorial.** Figures should look published and authored, not merely generated.
6. **Protect readability.** Keep current measures, contrast, and light/dark parity.
7. **Add human presence.** Use copy, portraiture, process artifacts, or collaboration context to prevent “inspectable systems” becoming emotionally cold.

### Proposed colour architecture

- **Core neutrals:** one near-black, one paper-white, 2–3 surface levels, 2 edge levels, 3 ink levels.
- **Master signal:** one mint/green selected from the current live and social systems.
- **Semantic colours:** warning and danger remain separate and must not be reused as brand accents.
- **Endorsed project accents:** a controlled set for FPL, MockPit, Rewriter, and OpenFGC; apply only to markers, rules, figure annotations, or compact backgrounds.
- **Research/data palette:** 4–6 colour-blind-safe values with shape/pattern redundancy and explicit semantic rules.

### Proposed typographic architecture

- **Display:** distinctive, used only for major brand statements and selected editorial moments.
- **Text/UI:** neutral variable sans, optimised for interface and long reading.
- **Mono/data:** compact metadata, code, provenance, and tabular comparison only.
- **Hierarchy:** standardise top-level page titles; allow paper typography to be editorial without making it visually subordinate.
- **Case:** codify sentence case as a deliberate voice choice rather than following UI Title Case by default.

### Proposed mark system

- One true-vector `W` or `WA` master mark.
- Full-name lockup.
- Endorsed lockups such as “Wasim Arif / Research”.
- Static signal-rule motif.
- Short motion signature.
- Small-size favicon/avatar test.
- Clear spacing and minimum-size rules.

## 15. Recommended information architecture

### Option A: employer-first, recommended

```text
Home
Work
Research
Writing
About
```

- Home carries proposition, 2–3 proof stories, research differentiator, experience snapshot, and contact.
- Work contains selected case studies; FPL treatment follows the chosen brand-architecture model.
- Research remains a subdomain/app but uses the same master shell and endorsed lockup.
- Writing remains primary only if the corpus is expanded.
- About includes experience, working style, collaboration, values, and CV/contact.

### Option B: lean portfolio

```text
Home
Work
Research & writing
About
```

This is stronger if the editorial corpus remains small. Research and writing become two depths of the same evidence programme instead of separate top-level claims.

### Navigation requirement

Any new structure must be designed for 320 px. The current five controls already use the available compact-header width. A new item requires either a condensed desktop/mobile split, menu, or shortened labels.

## 16. Content refresh recommendations

### Homepage messaging hierarchy

1. **Category + differentiator:** product-minded software engineer building inspectable systems.
2. **Human outcome:** products people can understand, trust, and use.
3. **Range:** AI workflows/APIs, accessible interfaces, data visualisation, open research.
4. **Proof:** 2–3 selected projects and the research result.
5. **Experience/collaboration:** brief role history or working-style evidence.
6. **Clear ask:** what kinds of roles or collaborations are sought.

### Project-card hierarchy

Recommended index card:

1. Project name and category.
2. One-line problem/outcome.
3. One distinctive decision.
4. One evidence signal.
5. Primary action.

Move detailed tags and secondary actions into the case study or reveal them on demand.

### Case-study content model

1. Situation and user/problem.
2. Role, team, constraints, and timeframe.
3. The pivotal decision.
4. Interface and system consequences.
5. Evidence: users, operations, tests, deployment, source, or research.
6. What failed or remains unproven.
7. What changed next.

### Editorial programme

Build writing around 3–4 repeatable themes:

- Inspectable AI products.
- Accessibility as infrastructure.
- Designing data for decisions.
- Interface/system seams.

Potential formats:

- Short decision notes.
- Case-study retrospectives.
- Plain-English research translations.
- Technical field guides.
- “What did not work” notes.

Do not manufacture a content cadence for appearance. A smaller set of substantial, distinctive pieces better fits the brand than frequent generic posts.

### Research integration

- Show research as evidence of engineering approach on the main portfolio.
- Cross-link the paper to relevant projects and the article.
- Add a compact author/portfolio context to the research footer or paper ending.
- Use a consistent citation and figure-export identity.
- Clarify authorship conventions, including first-person singular versus academic “we”.

## 17. Design-system requirements for the refresh

The refreshed implementation should explicitly define:

### Foundations

- Neutral and semantic colour tokens for both themes.
- Brand and project accent tokens.
- Accessible data-visualisation palette.
- Display, body, UI, mono, and numeric type roles.
- Spacing, radius, border, and elevation scales.
- Container and reading-measure tokens.
- Motion duration/easing tokens.

### Components

- Master header and endorsed-site lockup.
- Mobile navigation model.
- Primary, secondary, tertiary, and text actions.
- Project index card and case-study hero.
- Proof trail/evidence panel.
- Figure, caption, annotation, and source block.
- Stat and comparison block.
- Research publication card.
- Explorer control and result states.
- Article contents/key-takeaways pattern.
- Error, empty, loading, and offline/download fallback states.
- Global footer with appropriate portfolio/research variants.

### Accessibility acceptance criteria

- Preserve WCAG AA contrast for normal text in both themes.
- Maintain visible `:focus-visible` styling.
- Support keyboard navigation and 200%/400% zoom.
- Preserve 320 px reflow without horizontal page overflow.
- Keep native semantics before ARIA.
- Provide chart summaries and precise tables.
- Preserve explicit image dimensions and useful alt text.
- Provide reduced-motion variants that retain non-spatial feedback.
- Test with at least one screen reader and forced-colours mode.
- Do not let project accent colours carry meaning alone.

## 18. Refresh roadmap

### Phase 0 — strategic decisions

1. Confirm the primary hiring/collaboration audience.
2. Choose the core positioning territory.
3. Decide FPL’s relationship to the personal brand.
4. Decide whether Writing has enough depth for primary navigation.
5. Decide whether an About/experience page is required.
6. Define the relationship between portfolio and research lockups.

Do not begin detailed visual design until these are resolved; they materially change the homepage, navigation, and project hierarchy.

### Phase 1 — verbal identity and content architecture

1. Finalise proposition, support statement, and proof points.
2. Define voice principles and vocabulary.
3. Rewrite homepage hierarchy.
4. Restructure project cards and case-study templates.
5. Plan missing About/collaboration/experience content.
6. Define the editorial programme.

### Phase 2 — visual identity

1. Redraw and standardise the mark/lockups.
2. Choose typography.
3. Reconcile live and social-card colour systems.
4. Define signal/trace motifs.
5. Define project accents and image framing.
6. Define research figure identity.
7. Prototype both themes at homepage, project, article, paper, and explorer depth.

### Phase 3 — design system and motion

1. Implement semantic foundations and motion tokens.
2. Build shared header, actions, cards, evidence panels, figures, and states.
3. Update the research app to the endorsed master shell.
4. Replace perpetual/paint-heavy mark motion with the approved signature.
5. Add fine-pointer hover gating and refined reduced-motion behaviour.

### Phase 4 — page production

1. Homepage.
2. Work index.
3. Case-study template and all four portfolio pages.
4. About/experience if selected.
5. Writing index and article template.
6. Research index and paper.
7. Both explorers.
8. Error, empty, loading, and metadata/social states.

### Phase 5 — validation

1. Five-second comprehension testing with hiring managers and peers.
2. Task testing: find best work, understand role, verify evidence, contact Wasim.
3. Keyboard, screen-reader, zoom, forced-colours, reduced-motion, and touch testing.
4. Dark/light and 320 px visual regression.
5. Performance and font-loading checks.
6. Social-card recognition test alongside the live landing experience.
7. Analytics review after launch: project depth, research/writing cross-navigation, and contact intent.

## 19. Questions the refresh must answer

1. What exact role should a hiring manager imagine Wasim doing after reading the hero?
2. Is “inspectable” the master brand word, a supporting principle, or an internal strategy term?
3. Is research a core professional differentiator or a separate publication practice?
4. Is FPL flagship portfolio proof, an endorsed venture, or a separate entity linked at lower prominence?
5. Should the personal identity be `W`, `WA`, or full-name led?
6. Does the serif character of the current mark belong in the broader typography?
7. How much warmth and personal presence should be introduced?
8. What collaboration and professional-experience evidence can be published?
9. Which project should be the first proof for the desired next role?
10. Is the goal a role, consulting/collaboration, public research reputation, or an intentionally balanced combination?

## 20. Final assessment

The current portfolio does not need a refresh because it is incoherent or poorly made. It needs a refresh because its **most differentiated substance is not yet matched by equally differentiated positioning and identity**.

The foundation is unusually strong: accessible implementation, disciplined tokens, coherent themes, real work, clear decisions, open evidence, and writing that respects uncertainty. The best refresh will not replace that restraint with visual noise. It will make the existing worldview visible sooner and more memorably.

The central opportunity is to build one authored system around **inspectable craft**: a personal brand where interfaces, research, product decisions, and technical systems all show their evidence; where distinct projects remain distinct without overpowering the author; and where rigorous work still feels human.

## Appendix A — source anchors

- Shared tokens and theme: `packages/ui/src/styles.css`
- Shared UI primitives: `packages/ui/src/components/`
- Portfolio global styles and motion: `apps/website/src/styles.css`
- Portfolio homepage: `apps/website/src/routes/index.tsx`
- Project catalogue: `apps/website/src/content/projects.ts`
- Project cards: `apps/website/src/components/project-card.tsx`
- Case-study layout: `apps/website/src/components/projects/project-layout.tsx`
- Writing metadata and index: `apps/website/src/content/posts.ts`, `apps/website/src/routes/writing.index.tsx`
- Plain-English article: `apps/website/src/components/posts/design-systems-accessibility.tsx`
- Research index: `apps/research/src/routes/index.tsx`
- Full paper shell/content: `apps/research/src/routes/papers.$slug.tsx`, `apps/research/src/components/paper-01-content.tsx`
- Research explorers: `apps/research/src/components/band-explorer.tsx`
- Shared visualisations: `packages/viz/src/`
- Social-card system: `tools/scanner/src/generate-social.ts`
- Public route inventories: `apps/website/public/sitemap.xml`, `apps/research/public/sitemap.xml`

## Appendix B — validation notes

- 12 public routes audited.
- 24 route/theme combinations tested at a 320 × 800 viewport.
- Dark and light themes included.
- 0 scoped axe WCAG A/AA violations.
- 0 horizontal overflows.
- 0 console errors in the final run.
- Additional rendered inspection performed at desktop and 390 px mobile sizes.
- Portfolio FPL case-study presentation included; separate `apps/fpl` application excluded.
