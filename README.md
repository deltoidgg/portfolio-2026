# Wasim Arif — portfolio and research lab

The source for [wasimarif.com](https://wasimarif.com) and
[research.wasimarif.com](https://research.wasimarif.com). The portfolio presents independent
product and design-engineering work; the research lab publishes pre-registered studies with
versioned data, reproducible analysis, and browser-based explorers.

## Repository map

```text
apps/website       portfolio, project case studies, and writing
apps/research      papers and DuckDB-WASM data explorers
packages/ui        shared design tokens and accessible UI primitives
packages/viz       accessible Observable Plot wrappers and figures
packages/datasets  typed access to frozen research artifacts
packages/market-intelligence canonical captures, Neon persistence, and forecast replay read models
tools/scanner      Playwright + axe public-sector site scanner
tools/site-quality browser accessibility, route, responsive, and public-link checks
tools/etl          GSA and GOV.UK data pipelines
tools/analysis     confirmatory Python analysis and simulation test
docs/research      preregistration, data freeze, deviations, and scan recipe
```

The apps are deliberately separate deployments. The portfolio is a concise employer-facing entry
point; the research lab keeps the full methods, tables, figures, and data tools available without
turning the main site into an academic paper.

## Local development

Requirements: Node.js 22.12 or newer, [Vite+](https://viteplus.dev), pnpm 11.6, and `uv` for the
Python analysis.

```bash
vp install
vp run dev
```

Run the research app from its workspace when needed:

```bash
cd apps/research
vp dev
```

## Validation

The release gate formats, lints, type-checks, tests, and builds every workspace package:

```bash
vp run ready
```

Useful narrower commands:

```bash
vp check
vp run -r test
vp run website#build
vp run research#build
vp run site-quality#test
```

## Research reproducibility

Paper 01 tests whether graded design-system adoption signals are associated with fewer
automatically detectable accessibility violations on production government websites.

- The US analysis uses the frozen GSA Site Scanning artifact.
- The UK replication was specified before collection and uses the scanner under `tools/scanner`.
- Confirmatory outputs are committed under `data/results/paper-01` and consumed through the typed
  `datasets` package.
- The public paper, preregistration, data-freeze record, deviations, scanner recipe, and browser
  explorers link back to the exact files in this repository.

Re-run the analysis simulation and scanner tests with:

```bash
vp run analysis#test
vp run scanner#test
```

Raw downloads and scan output are intentionally ignored because they are large and regenerable.
Frozen processed artifacts and the small public explorer datasets are committed.

## Deployment

Both TanStack Start apps use Nitro for their Vercel output:

| Vercel project | Root directory  | Domain                               |
| -------------- | --------------- | ------------------------------------ |
| Portfolio      | `apps/website`  | `wasimarif.com`, `www.wasimarif.com` |
| Research       | `apps/research` | `research.wasimarif.com`             |

Use `vp install` and `vp build` in each project. OpenFGC is maintained in its own repository and
deployment, exposed at `openfgc.wasimarif.com`.

## Licensing

- Original software in this repository is licensed under the [MIT License](./LICENSE).
- Original research prose and figures are available under
  [Creative Commons Attribution 4.0](./LICENSE-CONTENT.md).
- Third-party and source datasets retain their original terms; see
  [data and attribution notes](./docs/DATA_LICENSES.md).
