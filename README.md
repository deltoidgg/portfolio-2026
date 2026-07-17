# Wasim Arif — portfolio, research, and FPL lab

The source for [wasimarif.com](https://wasimarif.com),
[research.wasimarif.com](https://research.wasimarif.com), and
[fpl.wasimarif.com](https://fpl.wasimarif.com). The portfolio presents independent product work,
the research lab publishes pre-registered studies, and the FPL lab contains market-informed
football-data experiments.

## Repository map

```text
apps/website       portfolio, project case studies, and writing
apps/research      papers and DuckDB-WASM data explorers
apps/fpl           Fantasy Premier League data and decision experiments
packages/ui        shared design tokens and accessible UI primitives
packages/viz       accessible Observable Plot wrappers and figures
packages/datasets  typed access to frozen research artifacts
packages/market-intelligence canonical captures, Neon persistence, and forecast replay read models
tools/scanner      Playwright + axe public-sector site scanner
tools/site-quality browser accessibility, route, responsive, and public-link checks
tools/etl          GSA and GOV.UK data pipelines
tools/analysis     confirmatory Python analysis and simulation test
docs/fpl           FPL market-intelligence brief and experiment roadmap
docs/research      preregistration, data freeze, deviations, and scan recipe
```

The apps are deliberately separate deployments. The portfolio is a concise employer-facing entry
point, the research lab keeps the full methods and data tools together, and the FPL lab can evolve
its own interaction and data model without cluttering either site.

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

Run the FPL lab independently:

```bash
vp run fpl#dev
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
vp run fpl#build
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

All three TanStack Start apps use Nitro for their Vercel output:

| Vercel project | Root directory  | Domain                               |
| -------------- | --------------- | ------------------------------------ |
| Portfolio      | `apps/website`  | `wasimarif.com`, `www.wasimarif.com` |
| Research       | `apps/research` | `research.wasimarif.com`             |
| FPL Lab        | `apps/fpl`      | `fpl.wasimarif.com`                  |

Use `vp install` and `vp build` in each project. OpenFGC is maintained in its own repository and
deployment, exposed at `openfgc.wasimarif.com`.

## Licensing

- Original software in this repository is licensed under the [MIT License](./LICENSE).
- Original research prose and figures are available under
  [Creative Commons Attribution 4.0](./LICENSE-CONTENT.md).
- Third-party and source datasets retain their original terms; see
  [data and attribution notes](./docs/DATA_LICENSES.md).
