# Personal research directions: AI-native frontend engineering, design-system adherence, and product-quality UI

**Prepared for:** Wasim Arif  
**Date:** 12 June 2026  
**Purpose:** Identify quantifiable software-engineering research projects that are more personally aligned with your CV, portfolio, open-source work, and brand than generic “AI coding productivity” research.

---

## 0. Executive summary

The best personal research direction is:

> **PatternLock Bench: measuring and improving how well AI coding agents follow a product’s design system, frontend architecture, accessibility standards, and existing UI patterns.**

This is highly aligned with your background as a multidisciplinary frontend/product engineer: TypeScript, React, Next.js/TanStack Start, UI design, accessibility, design tokens, visual regression testing, data-heavy dashboards, agent monitoring UIs, and your open-source **Mockpit** work on runtime data provenance.

The core research question is:

> **When an AI coding agent is asked to build or modify UI in an existing codebase, what makes it stay inside the design system instead of inventing new styles, props, components, layout patterns, and interaction behaviours?**

This is timely because AI coding is now mainstream, but frontend quality is still difficult to evaluate. Current coding benchmarks often measure whether code passes tests; frontend work also needs visual fidelity, interaction correctness, accessibility, component reuse, token usage, data correctness, and long-term maintainability. Recent frontier UI-code benchmarks such as **Design2Code**, **FrontendBench**, **FullFront**, and **WebDev Arena** show that frontend generation is becoming an active research area, but they do not yet focus deeply on _design-system adherence inside existing product codebases_.

The recommended portfolio should include three research pieces:

1. **PatternLock Bench** — benchmark AI agents on design-system adherence in React/TypeScript codebases.
2. **Mockpit Provenance Bench** — test whether AI-generated frontend changes preserve data provenance, avoid hardcoded/mock leakage, and keep prototype-to-production states visible.
3. **AgentOps UI Study** — evaluate which monitoring UI patterns help humans supervise multi-step agents, drawing from your LangGraph and real-time monitoring work.

If you only do one, do **PatternLock Bench**. It is the most differentiated, easiest to demo visually, and most credible for your brand.

---

## 1. Why this should be your niche

Your CV points to a very specific professional identity:

> **A product-minded frontend engineer who turns messy AI/product workflows into controlled, measurable, accessible, production-quality interfaces.**

The most relevant patterns in your experience are:

- **Design systems and design tokens**: you built a Figma-to-code token pipeline, migrated styling to vanilla-extract, and built reusable component systems.
- **AI product engineering**: you shipped generative-AI features, agent-powered sales workflows, and real-time monitoring UIs.
- **Testing and quality**: you worked across unit, integration, E2E, accessibility, and visual regression testing.
- **Data-heavy UX**: you built dashboards, KPI management, automated unit inference, data visualisation, and 3D visualisation.
- **Runtime provenance**: Mockpit tracks whether UI data comes from live APIs, mocks, fallbacks, hardcoded values, or derived state.
- **Accessibility**: you have credible WCAG-focused experience, which gives the research a public-interest angle rather than just developer tooling.

This makes “AI-native frontend quality” a much stronger brand than broad “AI coding productivity”. The research should answer questions such as:

- Why do AI agents invent UI patterns instead of reusing a design system?
- Which context mechanisms actually help: README, AGENTS.md, llms.txt, Storybook MCP, examples, tests, or static rules?
- Can visual regression, accessibility testing, and design-token linting become a reward signal for AI frontend work?
- Can runtime data provenance stop AI agents from accidentally shipping prototype mocks or hardcoded values?
- What does an AI-ready frontend codebase look like?

---

## 2. External context: why this is worth researching now

### 2.1 AI-assisted development is now mainstream, but trust is mixed

GitHub’s Octoverse 2025 reports that more than **1.1 million public repositories** use an LLM SDK, and that TypeScript overtook both Python and JavaScript in August 2025 to become the most-used language on GitHub. Source: GitHub Octoverse 2025 — <https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/>

Stack Overflow’s 2025 Developer Survey reports **49,000+ responses** across 177 countries, with a major focus on AI agents, LLMs, and community platforms. Its AI section reports that **84%** of respondents are using or planning to use AI tools, and that **51%** of professional developers use AI tools daily. Source: Stack Overflow Developer Survey 2025 — <https://survey.stackoverflow.co/2025/ai>

DORA’s 2024 report gives the useful caution: AI adoption can improve individual productivity, flow, and job satisfaction, while negatively impacting delivery stability and throughput if fundamentals such as testing and small batch sizes are weak. Source: DORA 2024 — <https://dora.dev/research/2024/dora-report/>

**Implication for your research:** the question is no longer whether developers use AI. The better question is what engineering systems prevent AI from creating design debt, accessibility regressions, visual drift, and unreviewable code.

### 2.2 Design systems are becoming more machine-readable

The Design Tokens Community Group announced the first stable version of the Design Tokens Specification, **2025.10**, describing it as a production-ready, vendor-neutral format for sharing design decisions across tools and platforms. Source: W3C Community Group announcement — <https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/>

The Design Tokens Format Module describes the technical specification for exchanging design tokens between tools. Source: DTCG Format Module 2025.10 — <https://www.designtokens.org/tr/2025.10/format/>

zeroheight’s 2026 Design Systems Report says design-system practitioners are pragmatic about AI: excitement is highest for documentation generation and process automation, while AI-generated design is met with skepticism. It also reports that only **40%** of teams have any token pipeline, and only **10%** have AI built into their processes, while **46%** are experimenting. Source: zeroheight Design Systems Report 2026 — <https://report.zeroheight.com/>

**Implication:** design systems are moving toward token standards, documentation automation, and agent-readable context, but most teams are still immature. That leaves a strong research gap.

### 2.3 Storybook and MCP are directly attacking the “AI ignores our components” problem

Storybook’s MCP documentation says the MCP server gives agents access to component manifests, documentation, story generation, and component tests. Source: Storybook AI docs — <https://storybook.js.org/docs/ai>

Storybook’s March 2026 MCP article explicitly frames the benefit as forcing agents to use existing components instead of inventing new patterns. Its own benchmark claim for Reshaped was **12.8% improved code usage**, **2.76x faster duration**, and **27% fewer tokens** when using MCP docs compared with baseline. Source: Storybook MCP for React — <https://storybook.js.org/blog/storybook-mcp-for-react/>

**Implication:** Storybook MCP is a perfect intervention to evaluate independently. You could build a benchmark that asks: does Storybook MCP actually improve design-system adherence across tasks, models, and codebase setups?

### 2.4 Existing frontend-AI benchmarks do not fully cover your question

- **Design2Code** benchmarks screenshot-to-code generation using 484 real-world webpages and automatic/human evaluation. Source: <https://arxiv.org/abs/2403.03163>
- **FrontendBench** introduces 148 prompt/test pairs with interactive test scenarios and an automatic evaluation framework that reportedly achieved 90.54% agreement with expert human evaluations. Source: <https://arxiv.org/html/2506.13832v2>
- **FullFront** evaluates multimodal models across webpage design, perception QA, and code generation, and reports that models struggle with layout, element perception, image handling, and interactions. Source: <https://arxiv.org/html/2505.17399v1>
- **WebDev Arena** is a live leaderboard where users compare generated web apps through pairwise voting; by March 2025 it had collected over 80,000 community votes. Source: <https://arena.ai/blog/webdev-arena/>
- **A11YN** introduces accessibility-aligned UI generation, using a reward function penalising WCAG violations and a RealUIReq-300 benchmark; it reports a 60% lower inaccessibility rate compared with the base model. Source: <https://openreview.net/forum?id=yaL9vBuJpD>

These are useful foundations, but your niche is different:

> **Existing benchmarks mostly ask “can the model build a UI?” Your benchmark should ask “can the model build a UI that belongs in this product?”**

That means evaluating adherence to a specific design system, component API, token language, interaction pattern, accessibility baseline, and data-provenance policy.

---

## 3. Ranked research opportunities

| Rank | Research direction                                      | Best title                       | Why it fits you                                                                                              | Public/experimental data                                               | Recommendation                             |
| ---: | ------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------ |
|    1 | Design-system adherence by AI agents                    | **PatternLock Bench**            | Directly aligned with design systems, TypeScript, React, visual testing, accessibility, Figma-to-code tokens | Own benchmark + GitHub/npm adoption data + Storybook/MCP interventions | **Do first**                               |
|    2 | Runtime data provenance in AI-generated UI              | **Mockpit Provenance Bench**     | Perfectly aligned with your Mockpit open-source project                                                      | Own benchmark + synthetic apps + GitHub examples of mocks/fallbacks    | Do second                                  |
|    3 | Human supervision UIs for agents                        | **AgentOps UI Study**            | Aligns with LangGraph monitoring UI, agent workflows, product UX                                             | Synthetic agent traces + participant study                             | Do third                                   |
|    4 | Accessibility regressions in AI-generated frontend code | **A11yGuard Bench**              | Strong public-interest angle and ties to your WCAG work                                                      | axe-core, Playwright, Web Almanac, own tasks                           | Combine with PatternLock                   |
|    5 | Visual regression as feedback for coding agents         | **PixelLoop**                    | Uses your Playwright/visual regression background                                                            | Own agent experiment + screenshot diffs                                | Strong technical blog                      |
|    6 | Agent-readable docs for frontend teams                  | **Docs-to-Agent Benchmark**      | Aligns with Storybook, AGENTS.md, llms.txt, Context7                                                         | Own benchmark + public docs examples                                   | Include as PatternLock intervention        |
|    7 | Design-system drift in open-source React apps           | **Design Drift Observatory**     | Public-data research with GitHub/npm                                                                         | GH Archive, GitHub API, npm, design-system package imports             | Good follow-up                             |
|    8 | Effect vs conventional TypeScript for AI refactoring    | **Typed Effects Agent Bench**    | Aligns with Effect-powered Mockpit core                                                                      | Own benchmark + npm/GitHub adoption                                    | Keep as separate technical piece           |
|    9 | Sync-engine architectures and agent legibility          | **Sync Engine Complexity Bench** | Connects to Convex/local-first interest                                                                      | Own benchmark across Convex/Supabase/REST                              | Good but less personal than design systems |
|   10 | AI-generated dashboards and metric correctness          | **Dashboard Truth Bench**        | Aligns with KPI management, unit inference, data viz                                                         | Public datasets + synthetic BI tasks                                   | Very strong portfolio piece                |
|   11 | LLM migration between component libraries               | **Component Migration Bench**    | Aligns with frontend modernisation and design-system migrations                                              | Own migration tasks + public components                                | Good applied engineering post              |
|   12 | Adoption analysis of AI-ready frontend tooling          | **AI-Ready Frontend Index**      | Public-data essay/dashboard                                                                                  | npm, GitHub, State of JS, Stack Overflow                               | Useful supporting post                     |

---

# 4. Flagship project: PatternLock Bench

## 4.1 One-line description

**PatternLock Bench is a benchmark for measuring whether AI coding agents can build and modify React/TypeScript interfaces while staying inside an existing product’s design system, component APIs, token system, accessibility rules, and established code patterns.**

## 4.2 Research question

> **Which techniques most improve AI-generated UI adherence to a design system: plain instructions, AGENTS.md, markdown docs/llms.txt, Storybook MCP, semantic design tokens, static linting, visual regression feedback, accessibility tests, or curated examples?**

## 4.3 Why this is novel

Most coding benchmarks use tests as the primary success metric. For frontend engineering, tests are not enough. A generated UI can pass TypeScript and Playwright tests while still:

- inventing a custom button instead of using `Button`
- using raw hex colours instead of semantic tokens
- adding arbitrary `px` values outside the spacing scale
- hallucinating component props
- breaking dark mode or responsive behaviour
- making inaccessible focus states or labels
- copying a pattern from the internet instead of the codebase
- creating visual drift that only appears in screenshots
- hardcoding display data that should come from API state

PatternLock would measure these failure modes directly.

## 4.4 The core experimental setup

Build a controlled benchmark suite of **60–120 frontend tasks** across 3–4 small but realistic React/TypeScript applications.

Suggested reference apps:

1. **B2B analytics dashboard**  
   Mirrors your Greyparrot/Ocula experience: KPI cards, filters, formula-builder-like interactions, charts, tables, unit labels, responsive dashboards.

2. **AI agent monitoring console**  
   Mirrors your ExpectAI/LangGraph experience: agent run history, step timeline, tool-call inspector, approval queue, calendar/CRM integration status, error states.

3. **Design-system-heavy SaaS admin portal**  
   Mirrors your design-system background: dense forms, modals, side nav, command palette, empty states, pagination, tabs, loading states.

4. **Optional Lyceum/PupilLoop school-ops dashboard**  
   Bridges your education/SEND work: attendance case queue, family contact timeline, inclusion flags, evidence pack preview. This is useful if you want the software-engineering research to also quietly support Lyceum Labs.

Each app should have:

- a design-token file
- component library
- Storybook stories
- visual regression snapshots
- accessibility tests
- interaction tests
- AGENTS.md instructions
- optional `/llms.txt` or markdown documentation
- a seeded dataset/API mock
- a policy file describing what AI may and may not change

## 4.5 Experimental conditions

Run the same tasks under different context and guardrail conditions.

| Condition                | What the AI agent gets                              | Purpose                                 |
| ------------------------ | --------------------------------------------------- | --------------------------------------- |
| C0: Baseline             | Task prompt + repo                                  | Measures ordinary agent behaviour       |
| C1: AGENTS.md            | Repo + explicit coding rules                        | Tests whether repo instructions help    |
| C2: Design docs          | Repo + markdown component docs                      | Tests documentation context             |
| C3: llms.txt/docs bundle | Curated LLM-readable docs                           | Tests AI-readable docs                  |
| C4: Storybook MCP        | Component docs, stories, manifests, tests           | Tests component-grounded agent access   |
| C5: Static enforcement   | ESLint/design-token rules fail the build            | Tests hard constraints                  |
| C6: Visual feedback      | Agent sees screenshot diffs and retries             | Tests visual-regression feedback        |
| C7: A11y feedback        | Agent sees axe/Playwright a11y failures and retries | Tests accessibility feedback            |
| C8: Full system          | AGENTS.md + docs + MCP + lint + visual + a11y       | Tests best-case AI-ready frontend setup |

## 4.6 Task categories

Use tasks that feel like real frontend engineering work rather than toy prompts.

| Category            | Example task                                                      | Failure modes to measure                         |
| ------------------- | ----------------------------------------------------------------- | ------------------------------------------------ |
| New feature         | Add an “export report” modal to the analytics page                | Invented modal, raw styles, broken focus trap    |
| UI refactor         | Replace legacy filter controls with the design-system `FilterBar` | Partial migration, prop hallucination            |
| Dashboard card      | Add a KPI card with unit inference and trend state                | Hardcoded values, wrong unit, off-pattern layout |
| Data table          | Add sortable table with empty/loading/error states                | Ad-hoc state patterns, missing a11y labels       |
| Accessibility fix   | Fix keyboard navigation in a custom menu                          | False fixes, ARIA misuse                         |
| Visual polish       | Match a provided screenshot using existing components only        | Raw CSS, off-scale spacing                       |
| Theming             | Add dark-mode support to a chart tooltip                          | raw colours, contrast issues                     |
| Component migration | Migrate `LegacyButton` usages to `Button`                         | wrong size/variant mapping                       |
| Agent UI            | Add a tool-call timeline to an agent run page                     | poor information hierarchy, missing states       |
| Provenance task     | Replace hardcoded demo data with live API data and fallback state | hidden mocks, loss of provenance                 |

## 4.7 Metrics

The benchmark should produce an overall **Design-System Adherence Score**, made from several measurable sub-scores.

### 4.7.1 Component adherence

Measures whether the agent uses approved components.

Possible implementation:

- parse TSX with `ts-morph` or Babel
- count JSX elements from approved component imports
- detect banned raw primitives where a component exists, e.g. `<button>`, `<input>`, custom modal divs
- detect hallucinated component props by comparing JSX props against TypeScript component types or Storybook docs

Example metrics:

```text
component_reuse_rate = approved_component_instances / total_interactive_component_instances
invalid_prop_count = count(props not present in component API)
ad_hoc_component_count = count(custom UI primitives replacing design-system components)
```

### 4.7.2 Token adherence

Measures whether styles use design tokens.

Possible implementation:

- ESLint rule: no raw hex/rgb/oklch outside token definitions
- CSS parser: no arbitrary `px` values outside spacing scale
- vanilla-extract/Tailwind token audit
- semantic-token usage ratio

Example metrics:

```text
raw_color_count
raw_spacing_count
semantic_token_coverage = tokenized_style_values / total_style_values
```

### 4.7.3 Pattern adherence

Measures whether the generated code follows existing architecture and app conventions.

Signals:

- route-loader/server-function conventions
- existing state-management pattern
- existing error/loading/empty-state components
- form validation patterns
- file naming and folder placement
- import layering rules
- avoided duplicate utilities

Implementation:

- architecture lint rules
- AST pattern matchers
- repo-specific codemod-like checks
- similarity to existing component patterns

### 4.7.4 Visual fidelity

Measures whether the output visually matches the target and avoids drift.

Tools:

- Playwright `toHaveScreenshot()` visual comparisons
- Storybook visual tests
- Chromatic, if desired
- screenshot diff percentage
- layout shift/element bounding-box comparison

Playwright supports screenshot visual comparisons using `expect(page).toHaveScreenshot()`. Source: <https://playwright.dev/docs/test-snapshots>

Storybook supports visual testing through Chromatic, where stories can automatically become visual tests. Source: <https://storybook.js.org/docs/writing-tests/visual-testing>

### 4.7.5 Accessibility

Measures whether the generated UI preserves baseline accessibility.

Tools:

- `@axe-core/playwright`
- Storybook accessibility addon
- keyboard navigation script
- focus-trap test
- heading-order check
- colour contrast check
- labelled control checks

axe-core includes rule types for WCAG 2.0, 2.1, 2.2 levels A/AA/AAA and best practices. Source: <https://github.com/dequelabs/axe-core>

Important caveat: automated accessibility tools cannot detect all accessibility issues. The Web Almanac 2025 accessibility chapter notes that automated tests only partially check a subset of WCAG criteria and should be treated as a starting point rather than a final guarantee. Source: <https://almanac.httparchive.org/en/2025/accessibility>

### 4.7.6 Functional correctness

Measures ordinary software correctness.

Tools:

- TypeScript
- ESLint
- unit tests
- React Testing Library
- Playwright E2E
- Storybook interaction tests

### 4.7.7 Review burden

Measures how much human correction the output needs.

Signals:

- number of manual edits required
- number of reviewer comments
- time to review
- number of generated files touched unnecessarily
- diff size
- retries needed
- “unreviewable” binary or generated changes

### 4.7.8 Data provenance

This is where Mockpit can make the benchmark uniquely yours.

Signals:

- live API vs mock vs fallback vs hardcoded values
- whether data source markers survive an AI refactor
- whether the agent introduces hidden fixture data
- whether demo data is isolated from production pathways
- whether derived state is traceable

Example metrics:

```text
hardcoded_data_introductions
mock_to_live_regressions
unmarked_fallback_count
provenance_marker_coverage
```

## 4.8 Primary scorecard

A simple public scorecard could look like this:

| Agent setup           | Component adherence | Token adherence | Visual fidelity | A11y | Tests | Review burden | Overall |
| --------------------- | ------------------: | --------------: | --------------: | ---: | ----: | ------------: | ------: |
| Baseline prompt       |                  42 |              38 |              55 |   61 |    70 |            35 |      50 |
| AGENTS.md             |                  55 |              51 |              57 |   63 |    72 |            49 |      58 |
| Docs bundle           |                  61 |              56 |              59 |   65 |    73 |            54 |      61 |
| Storybook MCP         |                  72 |              62 |              66 |   70 |    79 |            65 |      69 |
| MCP + visual feedback |                  76 |              65 |              81 |   72 |    80 |            66 |      73 |
| Full guardrails       |                  84 |              81 |              86 |   82 |    88 |            78 |      83 |

The numbers above are illustrative. The research value comes from generating the real numbers.

## 4.9 Pre-registered hypotheses

A preregistered version could look like this:

### H1 — Component grounding

AI agents given Storybook MCP access will have a higher component adherence score than agents given only AGENTS.md and repository context.

### H2 — Token grounding

Semantic design-token names and static token lint rules will reduce raw style values more than natural-language instructions alone.

### H3 — Examples beat abstract docs

Curated examples of correct component usage will reduce hallucinated props and off-pattern component composition more than component API docs alone.

### H4 — Visual feedback improves appearance but may increase hacks

Providing screenshot-diff feedback will improve visual fidelity, but may increase local style overrides unless paired with token and component constraints.

### H5 — Accessibility requires executable checks

Accessibility instructions alone will not materially reduce automated accessibility violations as much as executable axe/Playwright feedback.

### H6 — AI-readable docs reduce token use and time

An LLM-readable docs bundle or Storybook MCP will reduce task duration and token usage compared with unstructured repo search.

## 4.10 What counts as support

The core claim is supported if:

1. at least one structured context mechanism, such as Storybook MCP or curated markdown docs, significantly improves component adherence over baseline;
2. executable constraints, such as lint, a11y, and visual tests, improve adherence more than natural-language instructions alone;
3. the combined “AI-ready frontend” setup improves adherence without making review burden worse.

Null results would also be interesting. If Storybook MCP or llms.txt does not help across your benchmark, that is publishable because it challenges the current tool narrative.

## 4.11 Confounds and diagnostics

| Confound                                         | Diagnostic                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Task difficulty varies                           | Randomise tasks across conditions and report per-task fixed effects                  |
| Model quality changes over time                  | Lock model versions and dates; rerun periodically as separate waves                  |
| Benchmark overfits to one design system          | Use at least three design systems: token-only, component-rich, and strict enterprise |
| Visual metrics reward superficial similarity     | Combine screenshot diff with component/token adherence and reviewer rubric           |
| Accessibility metrics are incomplete             | Report automated a11y as partial; include manual keyboard/focus checks for subset    |
| Agents may optimize to lint rules with ugly code | Include maintainability and review-burden metrics                                    |
| Existing docs differ in quality                  | Hold docs constant within each app; test docs quality as an intervention             |

## 4.12 Minimum viable build

You can build a strong V1 in 4–6 weeks.

### V1 scope

- 1 React/TypeScript benchmark app
- 20 tasks
- 4 conditions: baseline, AGENTS.md, docs bundle, Storybook MCP
- metrics: TypeScript, tests, component adherence, token adherence, axe, screenshot diff
- 2–3 AI agents/models
- public report + GitHub repo + score dashboard

### V2 scope

- 3 apps
- 60–120 tasks
- more models/agents
- visual feedback loops
- data-provenance tasks using Mockpit
- human reviewer study
- public leaderboard

## 4.13 Suggested repo structure

```text
patternlock-bench/
  apps/
    analytics-dashboard/
    agent-monitoring-console/
    design-system-admin/
  design-systems/
    tokens-only/
    component-rich/
    enterprise-strict/
  tasks/
    task-001-export-modal.md
    task-002-kpi-card.md
    task-003-filter-bar.md
  agents/
    baseline.md
    agents-md.md
    docs-bundle.md
    storybook-mcp.md
    visual-feedback.md
  evaluators/
    component-adherence.ts
    token-adherence.ts
    pattern-adherence.ts
    a11y.ts
    visual-diff.ts
    provenance.ts
  scripts/
    run-task.ts
    score-run.ts
    aggregate-results.ts
  results/
    raw-runs/
    scorecards/
  report/
    paper.md
    preregistration.md
```

---

# 5. Research direction 2: Mockpit Provenance Bench

## 5.1 One-line description

**Mockpit Provenance Bench tests whether AI coding agents preserve data provenance when modifying frontend screens: live API data, mocks, fallbacks, hardcoded values, derived state, and UI-authored placeholders.**

## 5.2 Why it fits your brand

This is the most directly connected to your open-source project. Mockpit’s premise is that teams moving from prototype to production need to know what a screen is made of. AI coding agents make this problem sharper because they can silently introduce plausible hardcoded values, fallback data, mock fixtures, fake loading states, or derived calculations.

## 5.3 Research question

> **Do AI coding agents increase hidden prototype debt in frontend applications, and can runtime provenance instrumentation reduce it?**

## 5.4 Experimental setup

Create a benchmark app with screens containing a mix of:

- live API data
- MSW mock data
- fallback data
- hardcoded prototype copy
- derived metrics
- user-authored data
- data with unit metadata
- stale cached values

Ask agents to perform realistic product tasks:

- add a KPI card from an API field
- replace prototype fixtures with live data
- add loading/error/empty states
- refactor a dashboard
- add a chart using existing derived metrics
- migrate mock API to real endpoint
- change a formula in the KPI builder

Compare conditions:

| Condition        | Instrumentation                                     |
| ---------------- | --------------------------------------------------- |
| Baseline         | No provenance tools                                 |
| Static docs      | Instructions explaining data-source policy          |
| Mockpit visible  | Devtools panel available and source markers visible |
| Mockpit enforced | CI fails if hidden hardcoded/mock values appear     |

## 5.5 Metrics

- hidden hardcoded values introduced
- mock data shipped into production path
- live API replaced by fixture
- source markers preserved
- derived state traceability
- test pass rate
- reviewer detection rate
- time to detect data-source mistakes

## 5.6 Why this could be publishable

There is a lot of discussion about AI code quality, but less about **prototype-to-production leakage**. A visual demo showing an AI agent accidentally replacing live KPI data with plausible hardcoded demo data would be compelling and easy to understand.

Suggested title:

> **Do AI coding agents make prototype debt invisible? A benchmark for runtime data provenance in frontend development**

---

# 6. Research direction 3: AgentOps UI Study

## 6.1 One-line description

**AgentOps UI Study evaluates which monitoring interface patterns help humans supervise, debug, and trust multi-step AI agents.**

## 6.2 Why it fits your brand

You have built a sales outreach agent using LangGraph with a real-time monitoring UI. You also have product-engineering experience in SME/banking contexts where auditability, approvals, and trust matter.

LangGraph describes itself as a low-level orchestration framework for long-running, stateful agents, with durable execution, streaming, human-in-the-loop, and persistence. Source: <https://docs.langchain.com/oss/python/langgraph/overview>

This creates a natural UX research question:

> **What should an agent monitoring UI show so that a human can catch failures without drowning in logs?**

## 6.3 Experimental setup

Generate synthetic agent traces for tasks such as:

- sales outreach conversation
- meeting booking
- CRM update
- web research
- invoice reconciliation
- school attendance follow-up
- banking customer-service workflow

Inject failures:

- wrong tool call
- stale CRM context
- hallucinated customer fact
- looping behaviour
- unsafe escalation
- missing approval
- calendar booking conflict
- low-confidence classification

Compare UI variants:

| Variant              | Interface pattern                                    |
| -------------------- | ---------------------------------------------------- |
| Log stream           | chronological raw logs                               |
| Timeline             | step-by-step tool-call timeline                      |
| State diff           | before/after state changes                           |
| Risk-first           | highlights uncertainty, policy violations, approvals |
| Replay               | allows step replay and branch comparison             |
| Compact exec summary | only shows model summaries and final action          |

## 6.4 Metrics

- failure detection accuracy
- time to identify failure
- false alarm rate
- subjective trust
- perceived workload
- ability to explain what happened
- correct intervention choice
- number of unnecessary interrupts

## 6.5 Publishable angle

Most agent tooling is built for developers. You can study the product-design side:

> **How should agent interfaces expose reasoning, state, tools, and uncertainty to non-technical operators?**

This aligns with your product-engineering profile and could be very relevant to enterprise AI adoption.

---

# 7. Research direction 4: A11yGuard Bench

## 7.1 One-line description

**A11yGuard Bench measures whether AI-generated React UI preserves accessibility, and which interventions reduce accessibility regressions.**

## 7.2 Why it fits you

You have led WCAG 2.1 accessibility work and shipped enterprise-facing accessible navigation flows. This project has public-interest credibility and pairs well with design-system adherence.

## 7.3 Research question

> **Can AI coding agents reliably generate accessible UI, or do they need executable accessibility feedback loops?**

## 7.4 Experiments

Run UI tasks under these conditions:

- no accessibility instruction
- accessibility instruction in prompt
- AGENTS.md accessibility rules
- Storybook accessibility addon
- axe/Playwright feedback after each attempt
- design-system components with built-in a11y

## 7.5 Metrics

- axe violation count/severity
- keyboard completion rate
- focus order correctness
- labelled controls
- heading structure
- colour contrast
- screen-reader name checks
- manual rubric on a subset

## 7.6 Important caveat

Automated accessibility metrics are incomplete. The Web Almanac notes that automated tests detect only a subset of accessibility issues and should not be treated as full compliance. So your report should say “automated accessibility regressions” unless you add manual expert review.

---

# 8. Research direction 5: PixelLoop — visual regression as agent feedback

## 8.1 One-line description

**PixelLoop tests whether giving AI agents screenshot diffs improves frontend outputs, and whether it introduces style hacks.**

## 8.2 Research question

> **Does screenshot feedback make AI-generated UI more visually faithful, or does it encourage brittle local CSS overrides?**

## 8.3 Experimental setup

Provide agents with a target screenshot or Storybook reference and ask them to implement UI changes.

Conditions:

- no screenshot feedback
- final screenshot only
- iterative screenshot diff feedback
- screenshot diff + design-token lint
- screenshot diff + Storybook component docs

## 8.4 Metrics

- screenshot diff percentage
- bounding-box alignment error
- unauthorised CSS overrides
- raw token values
- component reuse
- code churn
- test pass rate

## 8.5 Why it is useful

This could produce a practical “agentic frontend loop”:

```text
implement -> run tests -> screenshot -> score visual drift -> feed back -> retry -> lint design tokens -> approve
```

This is a strong technical artifact and could become part of PatternLock.

---

# 9. Research direction 6: Docs-to-Agent Benchmark

## 9.1 One-line description

**Docs-to-Agent Benchmark tests which documentation formats help AI agents follow a frontend codebase: README, AGENTS.md, Storybook, llms.txt, markdown docs, Context7-style docs, or MCP.**

## 9.2 Why it fits the moment

The `/llms.txt` proposal standardises a markdown file to help LLMs use websites at inference time, especially for developer documentation and APIs. Source: <https://llmstxt.org/>

Tools such as Context7 position themselves as ways to inject up-to-date, version-specific documentation and code examples into AI coding agents. Source: <https://github.com/upstash/context7>

TanStack Start’s docs show one emerging pattern: docs pages exposing a plain markdown format for AI/LLM use. Source: <https://tanstack.com/start/latest/docs/framework/react/getting-started>

## 9.3 Research question

> **Which form of repo knowledge most improves AI frontend outputs: natural-language instructions, structured markdown docs, code examples, live component metadata, or executable tests?**

## 9.4 Experiment

Use the same tasks from PatternLock and compare context mechanisms.

Metrics:

- component adherence
- invalid prop count
- outdated API use
- token usage
- task duration
- number of tool calls
- test pass rate
- review burden

## 9.5 Publishable output

A practical guide:

> **How to make your frontend codebase AI-readable**

This would be very useful for engineering teams and design-system maintainers.

---

# 10. Research direction 7: Design Drift Observatory

## 10.1 One-line description

**Design Drift Observatory uses public GitHub and npm data to measure how design systems are adopted, overridden, and eroded in open-source React projects.**

## 10.2 Public data sources

| Source                          | Use                                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| GitHub Search/API               | Find repos using packages like MUI, Chakra, Carbon, GOV.UK Frontend, Radix, Ant Design |
| GH Archive                      | Analyse public GitHub events and adoption timing over time                             |
| npm registry/downloads          | Estimate package adoption and release cadence                                          |
| Libraries.io                    | Dependency graph and repository metadata                                               |
| OpenSSF Scorecard               | Repo maintenance/security signals                                                      |
| Stack Overflow survey           | Developer ecosystem context                                                            |
| State of JS / State of Frontend | Framework/tooling context                                                              |

GH Archive provides public GitHub activity archives from 2011 onward and is available in BigQuery, updated hourly. Source: <https://www.gharchive.org/>

Stack Overflow publishes survey results and CSV data links. Source: <https://survey.stackoverflow.co/>

## 10.3 Research question

> **Do open-source React projects that adopt component libraries still accumulate local design drift, and what forms does that drift take?**

## 10.4 Possible operational definition of “design drift”

- raw colours after token adoption
- raw spacing values after token adoption
- local CSS overrides targeting design-system component internals
- duplicated local components similar to library components
- excessive `sx`, `style`, `className` escape hatches
- inconsistent component variants
- design-system dependency installed but rarely used
- accessibility violations in pages using design-system components

## 10.5 Sample design-system packages

- `@mui/material`
- `antd`
- `@chakra-ui/react`
- `@radix-ui/react-*`
- `@carbon/react`
- `govuk-frontend`
- `@fluentui/react-components`
- `@primer/react`
- `@shopify/polaris`
- `@mantine/core`
- `@headlessui/react`
- `tailwindcss`

## 10.6 Analysis design

1. Identify repos with package dependencies.
2. Clone a stratified sample.
3. Parse source files for imports and style usage.
4. Compute drift metrics.
5. Compare drift by library, repo size, age, framework, and testing setup.
6. Optionally examine drift before/after library adoption in repo history.

## 10.7 Cautions

This is public-data-friendly, but attribution is tricky. You should not claim AI caused drift unless there is a clear AI-generated commit signal. Better framing:

> **This study measures the baseline drift problem that AI agents may amplify.**

---

# 11. Research direction 8: Typed Effects Agent Bench

## 11.1 One-line description

**Typed Effects Agent Bench tests whether Effect-style TypeScript architecture makes AI-assisted refactoring safer than conventional Promise/error handling.**

## 11.2 Why it fits you

Mockpit uses an Effect-powered core. You also listed Effect as a skill and have an interest in modern TypeScript architectures.

Effect positions itself as a composable TypeScript foundation with type safety across errors and dependency management, built-in tracing, and metrics. Source: <https://effect.website/>

## 11.3 Research question

> **Do typed errors, typed dependencies, schemas, and Effect services make AI coding agents less likely to miss failure paths during refactors?**

## 11.4 Experiment

Build two equivalent TypeScript services:

- **Vanilla version**: Promises, thrown errors, ad hoc dependency injection, Zod schemas.
- **Effect version**: Effect, typed errors, Context services, Schema, layers.

Ask agents to perform tasks:

- add a new API provider
- add retry/backoff
- add fallback policy
- refactor error handling
- add telemetry
- change schema
- add cache invalidation

## 11.5 Metrics

- test pass rate
- unhandled error paths
- type errors
- missing dependency wiring
- lines changed
- time to completion
- reviewer corrections
- behaviour under fault-injection tests

## 11.6 Why it is interesting

This could produce a nuanced answer. Effect may improve compile-time guidance, but may also increase learning-curve/context burden for models and developers. That ambiguity makes it good research.

---

# 12. Research direction 9: Sync Engine Complexity Bench

## 12.1 One-line description

**Sync Engine Complexity Bench compares how AI coding agents implement real-time collaborative product features across Convex, Supabase/Firebase-style backends, REST polling, and local-first sync engines.**

## 12.2 Why it fits you

You have product engineering experience with dashboards, agent monitoring, and modern frontend frameworks. Convex is interesting because it claims to keep frontend code, backend code, and database state in sync in real time, with backend logic expressed in TypeScript. Source: <https://www.convex.dev/>

## 12.3 Research question

> **Do sync-engine architectures reduce frontend complexity for AI-assisted development, or do they shift complexity into framework-specific mental models?**

## 12.4 Benchmark tasks

- collaborative task board
- live agent run monitor
- shared filter state
- optimistic update with conflict
- offline queue
- notification feed
- presence indicators
- audit log

## 12.5 Conditions

- REST + React Query
- Supabase/Firebase-style realtime
- Convex
- local-first engine such as Electric/Zero/Replicache, if feasible

## 12.6 Metrics

- implementation time
- LOC
- state-management complexity
- stale UI bugs
- conflict bugs
- test pass rate
- agent success rate
- retry count
- type errors

## 12.7 Why it is a secondary direction

This is technically interesting, but it is less directly tied to your strongest brand than design systems and UI quality. It may be better as a later “modern frontend architecture” piece.

---

# 13. Research direction 10: Dashboard Truth Bench

## 13.1 One-line description

**Dashboard Truth Bench tests whether AI agents can build data-heavy dashboards without metric, unit, aggregation, or provenance errors.**

## 13.2 Why it fits you

This aligns with:

- KPI management system
- formula builder
- automated unit inference
- data visualisation
- data-heavy dashboards
- Mockpit provenance
- B2B SaaS product engineering

## 13.3 Research question

> **When AI agents build dashboards, do they preserve metric semantics, units, filters, and data provenance?**

## 13.4 Public datasets

Use safe public datasets:

- UK government open data
- World Bank
- OpenAQ
- NYC open data
- Kaggle public datasets, if licensing allows
- GitHub/npm datasets for developer dashboards

## 13.5 Benchmark tasks

- build KPI card with trend calculation
- add grouped bar chart
- infer units from schema
- apply date filters
- preserve null handling
- show confidence/coverage
- distinguish live, mock, fallback, and derived data

## 13.6 Metrics

- correct aggregation
- unit correctness
- filter correctness
- chart accessibility
- chart readability
- data-source traceability
- hardcoded values introduced
- test pass rate

## 13.7 Strong publishable framing

> **AI-generated dashboards are persuasive interfaces. We need to test not only whether they look good, but whether they are numerically true.**

This could bridge frontend engineering, data visualisation, and AI trust.

---

# 14. Research direction 11: Component Migration Bench

## 14.1 One-line description

**Component Migration Bench measures whether LLMs can safely migrate UI code from one component library or design-system version to another.**

## 14.2 Why it fits you

You have migrated styling systems, built token pipelines, modernised frontend stacks, and worked in startup codebases where design-system migrations are common.

Zalando’s engineering blog provides a concrete precedent: it used LLMs to migrate in-house UI component libraries across 15 B2B applications, reporting around 90% migration accuracy while also noting limitations such as unreliable outputs, hallucinated props, and lack of visual understanding. Source: <https://engineering.zalando.com/posts/2025/02/llm-migration-ui-component-libraries.html>

## 14.3 Research question

> **Can LLMs migrate component-library usage while preserving visual and functional equivalence, and what guardrails are required?**

## 14.4 Benchmark setup

Create source and target component libraries with intentionally tricky differences:

- variant names differ
- size scale differs
- grid system differs
- accessibility API differs
- controlled/uncontrolled props differ
- icon system differs
- styling escape hatches differ

Ask agents to migrate usage across pages.

## 14.5 Metrics

- successful component mappings
- invalid props
- visual diff
- interaction test pass rate
- accessibility regressions
- manual fixes required
- local CSS hacks

## 14.6 Relationship to PatternLock

This can be a subset of PatternLock. Migration tasks are one of the best ways to reveal whether agents understand design-system semantics or just string-replace component names.

---

# 15. Public data sources and how to use them

## 15.1 GitHub and GH Archive

Use for:

- tracking design-system package adoption in public repos
- identifying repos with Storybook, Chromatic, Playwright, axe, Tailwind, MUI, etc.
- measuring adoption over time
- finding candidate repos for drift analysis
- collecting public pull request metadata

Access:

- GitHub REST/GraphQL API: <https://docs.github.com/en/rest>
- GH Archive: <https://www.gharchive.org/>
- BigQuery public dataset: through GH Archive instructions

Example GitHub search queries:

```text
"@storybook/react" "@mui/material" "playwright" language:TypeScript
"@axe-core/playwright" "react" language:TypeScript
"@carbon/react" "Storybook" language:TypeScript
"govuk-frontend" "playwright" language:JavaScript
"@radix-ui/react-dialog" "tailwindcss" language:TypeScript
```

## 15.2 npm registry and package metadata

Use for:

- package adoption trends
- release cadence
- dependency relationships
- package age and maintenance
- design-system ecosystem mapping

Access:

- npm Registry API docs: <https://api-docs.npmjs.com/>
- package metadata endpoint pattern: `https://registry.npmjs.org/{package}`
- downloads endpoint pattern commonly used by tools: `https://api.npmjs.org/downloads/point/last-week/{package}`

Caveat: npm downloads are noisy. They include CI installs, mirrors, bots, and caching effects. Use them as adoption signals, not user counts.

## 15.3 Stack Overflow Developer Survey

Use for:

- broad AI tooling adoption context
- TypeScript/React/Next.js adoption context
- developer sentiment around AI tools
- public CSV analysis

Source: <https://survey.stackoverflow.co/>

## 15.4 State of JS / State of Frontend

Use for:

- frontend framework/library sentiment
- TypeScript/Vite/React trends
- validation/state-management/testing trends

Sources:

- State of JS: <https://stateofjs.com/>
- State of Frontend: <https://tsh.io/state-of-frontend>

## 15.5 Web Almanac / HTTP Archive

Use for:

- accessibility context
- broad web technology adoption
- baseline web quality statistics

Source: <https://almanac.httparchive.org/>

## 15.6 Existing benchmarks

Use as comparisons, not replacements:

- SWE-bench: repo-level issue fixing — <https://www.swebench.com/>
- Design2Code: screenshot-to-code — <https://arxiv.org/abs/2403.03163>
- FrontendBench: frontend prompt/test tasks — <https://arxiv.org/html/2506.13832v2>
- FullFront: full frontend workflow — <https://arxiv.org/html/2505.17399v1>
- WebDev Arena: public web-app pairwise preferences — <https://arena.ai/blog/webdev-arena/>
- A11YN/RealUIReq-300: accessibility-aligned UI generation — <https://openreview.net/forum?id=yaL9vBuJpD>

## 15.7 Design-system repos and examples

Candidate public design systems:

- Carbon Design System — <https://github.com/carbon-design-system/carbon>
- GOV.UK Frontend — <https://github.com/alphagov/govuk-frontend>
- GitHub Primer React — <https://github.com/primer/react>
- Shopify Polaris — <https://github.com/Shopify/polaris>
- Microsoft Fluent UI — <https://github.com/microsoft/fluentui>
- MUI — <https://github.com/mui/material-ui>
- Chakra UI — <https://github.com/chakra-ui/chakra-ui>
- Radix UI — <https://github.com/radix-ui/primitives>
- Ant Design — <https://github.com/ant-design/ant-design>

---

# 16. Recommended publication sequence

## Piece 1 — practical essay + initial benchmark

**Title:** _Why AI coding agents ignore your design system — and how to measure it_  
**Output:** blog post + small benchmark demo  
**Goal:** establish the problem and your point of view.

Include:

- examples of AI-generated design drift
- taxonomy of failure modes
- first 10 benchmark tasks
- before/after screenshots
- simple scorecard
- “AI-ready design system” checklist

## Piece 2 — full benchmark report

**Title:** _PatternLock Bench: Evaluating design-system adherence in AI-generated React interfaces_  
**Output:** research report + GitHub repo + dashboard  
**Goal:** credible research artifact.

Include:

- preregistered hypotheses
- dataset/task suite
- scoring method
- model/agent comparisons
- intervention comparisons
- limitations
- reproducible scripts

## Piece 3 — Mockpit/data-provenance extension

**Title:** _Do AI coding agents make prototype debt invisible? A provenance benchmark for frontend development_  
**Output:** technical report + Mockpit demo  
**Goal:** convert research attention into open-source credibility.

Include:

- provenance failure taxonomy
- hardcoded/mock leakage examples
- data-source traceability metrics
- Mockpit instrumentation
- CI enforcement example

## Piece 4 — design-system maintainer guide

**Title:** _Making your design system AI-readable: Storybook, tokens, MCP, AGENTS.md, and tests_  
**Output:** guide/checklist  
**Goal:** audience growth among frontend/design-system engineers.

Include:

- AGENTS.md template
- token naming guidance
- Storybook MCP setup
- lint rules
- testing pipeline
- review checklist

---

# 17. Practical distribution plan

## Where to publish

- your personal site
- GitHub repo README/report
- LinkedIn article/thread
- Dev.to or Hashnode mirror
- Hacker News launch for the benchmark repo
- r/reactjs, r/frontend, r/typescript, r/webdev where appropriate
- Design Systems Slack / Discord communities
- Storybook community
- Reactiflux
- local London frontend/design-system meetups

## People/communities likely to care

- design-system maintainers
- frontend platform teams
- product engineers using AI coding agents
- accessibility engineers
- devtools founders
- Storybook/Chromatic users
- TypeScript/React/TanStack communities
- AI coding tool builders

## Launch asset checklist

- one striking visual example of AI design drift
- interactive score dashboard
- reproducible GitHub repo
- 60-second demo video
- clear “how to run the benchmark” instructions
- leaderboard or score table
- practical checklist engineers can copy

---

# 18. Suggested PatternLock scoring implementation

## 18.1 Static analysis

Use:

- `ts-morph` for TypeScript AST
- Babel parser for JSX/TSX
- PostCSS for CSS parsing
- ESLint custom rules
- dependency-cruiser for architecture constraints

Checks:

- banned raw HTML interactive elements when design-system equivalents exist
- invalid JSX props
- unapproved imports
- raw style values
- inline style usage
- unknown token usage
- local component duplication

## 18.2 Runtime/browser analysis

Use:

- Playwright E2E
- Playwright screenshots
- axe-core Playwright integration
- Storybook test runner
- Chromatic optional

Checks:

- screenshot diff
- keyboard navigation
- focus order
- interactive state behaviour
- accessibility violations
- responsive behaviour

## 18.3 Provenance analysis

Use Mockpit-style instrumentation:

- instrument fetch
- mark mock/live/fallback/hardcoded sources
- expose devtools panel
- export provenance summary JSON
- fail CI on unapproved hardcoded source

Checks:

- provenance marker coverage
- hidden hardcoded data
- fallback policy violations
- untraceable derived state

## 18.4 Human review rubric

Use a small reviewer panel of frontend/design-system engineers.

Rubric dimensions:

- “Would you merge this?”
- “Does this feel like the product?”
- “How many design-system rules were broken?”
- “How much review effort is needed?”
- “Are there hidden accessibility or data-quality risks?”

Use human review for a subset, not the whole benchmark, to validate automatic metrics.

---

# 19. Example AGENTS.md for the experiment

```md
# UI development rules for AI agents

You are working in a design-system-governed React/TypeScript codebase.

Before changing UI:

1. Inspect existing components and stories.
2. Reuse approved design-system components before creating new primitives.
3. Do not invent component props. Verify props from TypeScript types or Storybook docs.
4. Do not use raw hex/rgb/oklch colours outside token definitions.
5. Do not use arbitrary spacing values outside the spacing scale.
6. Do not introduce inline styles unless explicitly allowed.
7. Preserve loading, empty, error, and success states.
8. Preserve keyboard accessibility and visible focus states.
9. Use existing data-fetching and error-handling patterns.
10. Do not hardcode API data, demo values, or fallback values without provenance markers.

After changing UI:

1. Run TypeScript.
2. Run unit/component tests.
3. Run Storybook tests.
4. Run accessibility tests.
5. Run visual regression tests.
6. Fix failures using design-system components and tokens, not local CSS hacks.
```

---

# 20. What this says about your personal brand

The research positions you as someone who understands a problem that many teams will feel sharply in the next two years:

> AI can generate UI quickly, but product teams still need interfaces that are consistent, accessible, testable, data-correct, and maintainable.

Your brand can become:

> **Frontend systems for the AI era.**

Or more concretely:

> **I help teams make AI-generated frontend code production-ready: design-system aligned, accessible, visually tested, and provenance-aware.**

That is much sharper than simply “software engineer interested in AI”. It connects your startup experience, frontend depth, design taste, accessibility work, data visualisation, and Mockpit into a coherent research agenda.

---

# 21. Final recommendation

Do **PatternLock Bench** first.

Minimum viable plan:

1. Build one benchmark React/TypeScript app with a small design system.
2. Create 20 tasks across feature creation, refactor, dashboard, accessibility, visual polish, and data-provenance categories.
3. Run 3–4 agent setups: baseline, AGENTS.md, docs bundle, Storybook MCP.
4. Score component adherence, token adherence, visual diff, accessibility, tests, and review burden.
5. Publish a report and repo.
6. Follow with a Mockpit provenance extension.

The most compelling claim to aim for is:

> **AI frontend quality improves less from better prompts than from better systems: typed component APIs, semantic tokens, Storybook/MCP context, executable tests, visual feedback, and runtime provenance.**

That claim is measurable, useful, visually demonstrable, and deeply aligned with your work.
