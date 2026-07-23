# Portfolio Brand Refresh - Implementation Specification

Status: implemented July 2026
Scope: `apps/website`, `apps/research`, and shared `packages/ui` only.
Explicit exclusion: `apps/fpl` remains a separate product identity and must not inherit these styles.

## Reference set

The approved design references are archived in `docs/brand-refresh/references/`:

- `portfolio-home.png`
- `writing-article.png`
- `research-lab.png`
- `fpl-case-study.png`

These images establish the visual direction, not replacement facts. Published dates, project outcomes, dataset sizes, statistical results, links, and product claims continue to come from repository content and frozen research artifacts.

## Brand idea

**Open research. Inspectable systems. Product engineering.**

The refreshed identity should feel like an independent technical journal crossed with an evidence lab: precise, quiet, candid, and deliberately constructed. Its visual signatures are warm serif headlines, compact mono labels, near-black blue canvases, hairline rules, emerald signals, flat ledgers, and charts that expose real evidence.

### Voice principles

1. Lead with the question, decision, or result.
2. Prefer concrete evidence to promotional adjectives.
3. Show limits and uncertainty alongside outcomes.
4. Explain technical work in plain English without flattening it.
5. Use first person where authorship matters; avoid corporate plural voice.
6. Keep calls to action descriptive: "Read the paper", "Explore the data", "View case study".
7. Do not invent metrics, publications, newsletter volume, clients, or testimonials.

## Design tokens

The canonical tokens live in `packages/ui/src/styles.css`.

| Role           | Dark      | Light     |
| -------------- | --------- | --------- |
| Canvas         | `#020810` | `#f5f2ea` |
| Deep canvas    | `#00050c` | `#ece8de` |
| Surface        | `#07111a` | `#ece8de` |
| Raised surface | `#0b1620` | `#e4ded2` |
| Hairline edge  | `#18222c` | `#d2ccc0` |
| Strong edge    | `#2a3641` | `#b8b1a5` |
| Primary ink    | `#f3f1ec` | `#121820` |
| Muted ink      | `#9b9ea4` | `#59616a` |
| Subtle ink     | `#69717a` | `#747b82` |
| Emerald        | `#00c78d` | `#00795b` |
| Bright emerald | `#00e7a4` | `#008c68` |
| Data cyan      | `#22d1c3` | `#007c75` |
| Data green     | `#35b74a` | `#2b7d42` |

Semantic tokens must be used in application CSS; hard-coded values belong only in generated brand assets where CSS variables are unavailable.

## Typography

- Display: Instrument Serif, regular weight. Use for identity-scale headlines, major page titles, and numeric proof.
- UI/body: Geist Variable. Use for navigation, explanatory copy, tables, controls, and long-form prose.
- Technical labels: Geist Mono Variable. Use sparingly for kickers, dates, indices, data labels, and code.

Display headlines use tight tracking and compact leading. Body copy remains generous and readable. Mono text is a supporting layer, never the default paragraph voice.

## Layout system

- Shared shell maximum: `84rem`.
- Editorial page maximum: `78rem`.
- Wide case-study maximum: `82rem`; long-form reading measure: `43.75rem`.
- Shell gutter: `clamp(1.25rem, 3.35vw, 3rem)`; editorial and case gutters expand independently up to `6rem` and `4rem`.
- Pages are composed from hairline boundaries, asymmetrical editorial grids, and flat ledger rows.
- Cards are reserved for bounded interactive tools or media; narrative lists should not become floating rounded tiles.
- Long articles use a contents rail, readable central measure, and supporting author/share rail where space permits.

## Interaction and motion

Motion is restrained and informative:

- 120-180ms transitions for colour, border, and compact controls.
- 220-320ms for route-level or chart-state changes.
- Small vertical or opacity entrances only when they clarify hierarchy.
- No looping decorative motion except the low-intensity live-status signal.
- Every animation must stop under `prefers-reduced-motion: reduce`.
- Mobile menus close on Escape and return focus to their trigger.
- Focus styles remain visible against both themes.
- Charts include accessible names or adjacent textual summaries.

## Route treatment

### Portfolio

- `/`: editorial homepage with statement, current focus, writing/research ledgers, selected work, verified research proof, About, and direct Email/RSS follow actions.
- `/projects`: flat case-study ledger.
- `/projects/:slug`: evidence-led continuous case-study narrative. Project imagery and claims remain project-specific.
- `/writing`: editorial article index.
- `/writing/:slug`: long-form publication shell with contents navigation, author identity, pull quote, and related destinations.
- `/about`: concise working philosophy, capabilities, evidence links, and contact path.

### Research Lab

- `/`: lab index with latest paper, verified metrics, published datasets, and methodology.
- `/papers/:slug`: paper publication shell with persistent contents, summary, live statistics, body, limitations, and downloads.
- `/explore/:dataset`: bounded research workbench. Controls and live charts remain code-native, keyboard usable, and based on frozen artifacts.

### FPL exception

- `apps/fpl` is not part of this brand refresh.
- The FPL case study in the portfolio may use the portfolio publication shell and a crop of the existing FPL product image.
- No shared portfolio token, header, font, favicon, or social-card change should be applied to the standalone FPL application.

## Content governance

- Dataset sizes and findings are imported from `packages/datasets` artifacts.
- Research copy must retain the observational-versus-causal qualification.
- Case-study evidence points must be supported by repository code, docs, or existing content.
- Dates must reflect the real publication/project timeline.
- The WA monogram is the approved portrait fallback until a final author image is supplied.
- Email and RSS are the real follow mechanisms; there is no newsletter signup claim.

## Asset system

- `BrandMark` in `packages/ui` is the shared typographic identity.
- `favicon.svg` is the modern WA mark; the legacy ICO remains as fallback.
- Social images are generated by `tools/scanner/src/generate-social.ts` at 1200x630 using the same ink, emerald, grid, and display typography.
- Regenerate social assets with `vp run scanner#generate-social`.

## Verification contract

Before release:

1. Run `vp check`.
2. Run `vp test`.
3. Run `vp run -r build`.
4. Run `vp run site-quality#test` and `vp run site-quality#check-links`.
5. Run `vp run site-quality#visual` to capture homepage, writing article, Research Lab index, and FPL portfolio case study at desktop/mobile widths and reproduce the normalised dark-desktop comparison metrics.
6. Inspect both dark and light themes.
7. Confirm no horizontal overflow at 320, 390, 768, and 1440px.
8. Confirm the standalone FPL app is functionally and visually unchanged.

The historical brand/content audit remains at `docs/portfolio-brand-refresh-audit.md`; this document records the implemented direction and its maintenance rules.
