# Modern Software Engineering Research Opportunities

**Purpose:** identify quantifiable, portfolio-ready research projects for a software-engineer personal brand, with a strong bias toward AI-assisted software development, TypeScript, Effect, Convex/sync engines, npm/GitHub ecosystem data, and experiments that can be published as credible research rather than opinion pieces.

**Date:** 12 June 2026  
**Recommended flagship:** **Typed Agent Bench: Does agent-readable TypeScript architecture make AI-assisted software engineering more reliable?**

---

## 1. Executive summary

The strongest personal-brand research direction is not simply “does AI make developers faster?” That question is already crowded, and the best public studies show mixed results. Microsoft/GitHub’s early controlled Copilot study found a large speedup on a bounded JavaScript task, while METR’s 2025 randomized trial with experienced open-source maintainers found that AI tools made developers **19% slower** on familiar real repositories. The interesting frontier is now more specific:

> **Which kinds of software architecture make AI-assisted development better or worse?**

This is where your positioning as a software engineer becomes distinctive. You can study the interaction between AI coding agents and modern TypeScript architecture: strong typing, schema validation, typed errors, Effect, dependency injection, test-first workflows, local-first/sync engines, and repo-level agent instructions such as `AGENTS.md`, `CLAUDE.md`, `.cursor/rules`, or Copilot instructions.

The best project would combine three strands:

1. **Public ecosystem data**: mine npm, GitHub, GH Archive, Stack Overflow survey data, State of JS, and library adoption metrics to show that TypeScript, AI coding tools, agent workflows, and sync engines are all converging.
2. **Controlled agent benchmark**: build equivalent TypeScript codebases in several architectural styles, then ask coding agents to implement the same bug fixes/features against hidden tests.
3. **Human review experiment**: ask developers to review AI-generated PRs from those conditions and measure review time, confidence, false negatives, and perceived maintainability.

A good title:

> **Typed Agent Bench: Do TypeScript constraints, Effect systems, and agent-readable repos improve AI coding-agent reliability?**

A sharper paper-style claim:

> AI coding agents may not just need better models; they may need **agent-legible software architecture**. This project tests whether explicit types, schemas, error channels, dependency boundaries, and repo instructions reduce hidden-test failures, hallucinated APIs, and human review burden.

This is novel, quantifiable, highly relevant to modern software engineering, and easy to turn into a public repo, blog post, benchmark leaderboard, and conference-style preprint.

---

## 2. Why this topic is well-timed

Several current signals make this a good time to publish research here:

- **AI is now mainstream in software development.** GitHub’s Octoverse 2025 says more than 1.1 million public repositories use an LLM SDK, with 693,867 of those created in the prior 12 months, and that TypeScript became the most-used language on GitHub.
- **Developer trust is not keeping pace with adoption.** Stack Overflow’s 2025 survey has more than 49,000 responses and includes new focus on AI agent tools, LLMs and community platforms. Reporting around the survey highlights a central tension: developers use AI, but many distrust the accuracy of its output.
- **The productivity story is unsettled.** Microsoft/GitHub found a 55.8% faster completion time in an early Copilot experiment on a bounded task; METR later found a 19% slowdown for experienced developers on familiar mature repositories.
- **TypeScript has become the default language of serious web/app development.** State of JS 2025 collected 13,002 responses; third-party summaries report that TypeScript-only usage continued rising and that AI-assisted development grew substantially.
- **Modern TypeScript tools are explicitly trying to make software more structured.** Effect positions itself as a TypeScript framework for side effects, type safety and concurrency. Convex positions itself as a reactive database/back-end platform where backend code, schema, queries and APIs are expressed in TypeScript.
- **Sync engines and local-first architectures are newly important.** Convex, Electric, Zero, LiveStore and related tools represent a movement away from request/response CRUD toward real-time, cached, reactive, local-first or sync-first applications.
- **Agent infrastructure is becoming part of software engineering.** MCP servers, agent registries and repo-level instructions are now part of the developer tooling ecosystem, but security, maintainability and reliability are not yet well understood.

---

## 3. Research criteria

For personal branding, prioritize projects that meet these criteria:

| Criterion              | Why it matters                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| Quantifiable           | The output should have tables, confidence intervals, benchmarks and reproducible code, not just opinion.   |
| Public-data compatible | You should be able to use GitHub, npm, public surveys, SWE-bench, OSV, OpenSSF or your own open benchmark. |
| Engineer-led           | The project should show your ability to build tools, not only analyse survey data.                         |
| Timely                 | AI coding agents, TypeScript, Effect, Convex, MCP and sync engines are active 2025–2026 topics.            |
| Publishable            | The result should be bloggable, citable, and useful to other engineers.                                    |
| Brand-compatible       | It should present you as a thoughtful engineer who evaluates tradeoffs, not a hype-driven AI influencer.   |

---

## 4. Public datasets and data sources

### 4.1 GitHub ecosystem data

| Source                       | What it gives you                                                                           | Best use                                                                     | Caveats                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **GitHub Innovation Graph**  | Aggregated public GitHub activity by economy and quarter from 2020 onward.                  | Macro trend context: language growth, repository growth, developer activity. | Aggregated, not repo-level; useful for framing, not causal analysis. |
| **GH Archive**               | Hourly public GitHub event archives, also available through BigQuery.                       | Repo events, PR activity, stars, issue events, push events, adoption timing. | Large data; needs BigQuery/Snowflake/local sampling.                 |
| **GitHub REST API**          | Repositories, issues, PRs, releases, contents, events.                                      | Targeted repo-level studies.                                                 | Rate limits; code search has limits; API fields vary.                |
| **GitHub GraphQL API**       | More flexible querying over repos, PRs, commits, discussions and metadata.                  | Pull-request datasets, timeline analysis, repo metadata.                     | Requires careful query design and rate-limit budgeting.              |
| **GitHub Advisory Database** | CVEs, GitHub-originated advisories and malware advisories across ecosystems, including npm. | Security outcomes and dependency-risk studies.                               | Security advisories are incomplete and ecosystem-dependent.          |
| **OpenSSF Scorecard**        | Automated security-health checks for open-source projects.                                  | Repository security posture, maintainer hygiene, dependency risk.            | Heuristic; should not be treated as ground truth.                    |

### 4.2 npm and package ecosystem data

| Source                            | What it gives you                                                               | Best use                                                                                    | Caveats                                                                                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **npm registry package metadata** | Versions, release dates, dependencies, maintainers, repository URLs, dist-tags. | Adoption studies, dependency networks, library comparison.                                  | Repository metadata can be missing or stale.                                                                                                                                  |
| **npm download API**              | Package download counts over time windows.                                      | Trend comparisons: Effect, Convex, Zod, fp-ts, ts-pattern, neverthrow, Electric, Zero, etc. | npm’s own historical note says download stats are naive: they count package tarball HTTP 200 responses, including CI, mirrors and bots. Treat as usage proxy, not user count. |
| **Libraries.io open data**        | Cross-package-manager dependency and repository metadata.                       | Dependency graph and cross-ecosystem studies.                                               | Public dumps can lag; very large files.                                                                                                                                       |
| **OSV.dev**                       | Aggregated vulnerability data across ecosystems.                                | Security risk in generated dependencies, hallucinated packages and supply-chain studies.    | Vulnerability data is incomplete and time-lagged.                                                                                                                             |

### 4.3 Developer surveys

| Source                                                | What it gives you                                                                                 | Best use                                                                  | Caveats                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------- |
| **Stack Overflow Developer Survey 2025**              | 49,000+ respondents, 177 countries, 314 technologies, AI-agent/LLM/community-platform focus.      | Developer attitudes, AI use, trust, tools, languages.                     | Self-selection; cross-sectional.                         |
| **JetBrains Developer Ecosystem 2025**                | 24,534 cleaned responses, balanced by geography, employment, languages and JetBrains product use. | AI adoption, language/tool trends, developer sentiment.                   | JetBrains-user bias may remain.                          |
| **State of JS 2025**                                  | 13,002 responses from September–November 2025.                                                    | JavaScript/TypeScript ecosystem trends, AI tool usage, library sentiment. | JS-community skew; not representative of all developers. |
| **DORA 2025 AI-assisted Software Development report** | Nearly 5,000 technology professionals and 100+ hours of qualitative data.                         | Team-level AI adoption, delivery performance, organizational conditions.  | Survey research; not direct telemetry.                   |

### 4.4 AI coding-agent benchmarks and research datasets

| Source                                  | What it gives you                                                              | Best use                                                             | Caveats                                            |
| --------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------- | -------------------------------------------------- |
| **SWE-bench**                           | 2,294 GitHub issue/PR-derived tasks from 12 Python repos.                      | Agent benchmarking and comparison to published results.              | Python-heavy; potential benchmark contamination.   |
| **SWE-bench Verified**                  | 500 human-validated tasks.                                                     | Standard reference benchmark.                                        | Static benchmark; increasingly optimized against.  |
| **SWE-bench Live**                      | Continuously updated issue-resolution tasks.                                   | More contamination-resistant evaluations.                            | Setup complexity; agent costs.                     |
| **SWE-PRBench**                         | Pull-request review benchmark with human-annotated issues.                     | AI code-review quality and human reviewer burden studies.            | Newer benchmark; less established.                 |
| **METR AI developer productivity data** | Anonymized data and regression code from an RCT on experienced OSS developers. | Reanalysis, replication, power calculations, comparison methodology. | Different setting from TypeScript app engineering. |

### 4.5 Agent/MCP ecosystem data

| Source                           | What it gives you                                 | Best use                                                   | Caveats                                                      |
| -------------------------------- | ------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| **Official MCP registry**        | Public MCP servers and versions.                  | Adoption, security, permissions, install-pattern analysis. | Registry coverage is incomplete.                             |
| **modelcontextprotocol/servers** | Reference and community MCP servers.              | Baseline server classification and security checks.        | Not the whole ecosystem.                                     |
| **AISI MCP tool study**          | Large-scale analysis of 177,436 public MCP tools. | Methodological inspiration for ecosystem monitoring.       | Dataset may require request/access; not all raw data public. |

---

## 5. Ranked research directions

## Direction 1 — Flagship: Typed Agent Bench

### Working title

**Typed Agent Bench: Do TypeScript constraints, Effect systems and agent-readable repositories improve AI coding-agent reliability?**

### Core question

When AI coding agents work inside TypeScript repositories, do explicit architectural constraints — schemas, typed errors, dependency boundaries, Effect, tests and repo instructions — make them more reliable?

### Why this is compelling

Most AI productivity research asks whether AI makes developers faster. This asks a better engineering question:

> **Can we design codebases that make AI agents safer and more effective collaborators?**

That is a very strong personal-brand angle because it positions you as someone who understands AI, TypeScript, testing, architecture and empirical engineering.

### Conditions to compare

Build equivalent mini-codebases in multiple styles:

1. **Plain TypeScript**  
   `async/await`, exceptions, ad hoc validation, conventional service modules.

2. **TypeScript + schema validation**  
   Zod/Valibot-style runtime validation, typed DTOs, explicit API contracts.

3. **TypeScript + Result pattern**  
   `Result<T, E>` / `Either` style errors using neverthrow or a small in-house implementation.

4. **Effect TypeScript**  
   Explicit effects, typed errors, dependency layers, retry, resource handling, structured concurrency.

5. **Agent-readable repository variant**  
   Same as above, but with carefully written `AGENTS.md` / `CLAUDE.md` / `.cursor/rules` instructions.

### Example tasks

Each task should be realistic but bounded:

- Add exponential retry with cancellation.
- Add rate-limited API client with typed errors.
- Add background job with failure recovery.
- Add webhook verification and replay protection.
- Add schema migration and backwards-compatible parsing.
- Fix a race condition in concurrent queue processing.
- Add observability/logging without leaking secrets.
- Add pagination and cursor validation.
- Implement idempotency keys.
- Fix a hidden edge case in date/time handling.
- Add partial failure handling for third-party API downtime.
- Refactor duplicated business logic without changing behavior.

### Experimental design

**Unit of analysis:** task × codebase style × agent × run seed.

Suggested first version:

- 12 tasks
- 4 architecture conditions
- 3 agents/models
- 3 independent runs per cell

That gives **432 agent runs**, enough for a strong technical blog and preliminary statistical analysis.

### Primary outcomes

| Outcome                  | Measurement                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------- |
| Hidden test pass         | Did the submitted patch pass hidden unit/integration tests?                        |
| Safety test pass         | Did it handle failure cases, invalid inputs, retries, cancellation, secrets, etc.? |
| Compile success          | Did TypeScript build pass without suppressions?                                    |
| Dependency hallucination | Did the agent import non-existent packages/APIs?                                   |
| Runtime correctness      | Did realistic integration tests pass?                                              |
| Patch complexity         | Lines changed, files changed, cyclomatic complexity, duplication.                  |
| Review burden            | Human minutes to approve/reject; number of reviewer comments.                      |
| Token/latency cost       | Total tokens, wall-clock time, tool calls, failed attempts.                        |

### Hypotheses

- **H1: Explicit contracts improve reliability.** Schema-rich and typed-error codebases will have higher hidden-test pass rates than plain TypeScript for tasks involving invalid inputs or third-party failures.
- **H2: Effect helps most on failure-heavy tasks.** Effect will outperform plain TypeScript on retry, concurrency, resource and error-propagation tasks, but may underperform on simple CRUD tasks because of API complexity.
- **H3: Agent-readable repos reduce wasted effort.** Repositories with clear agent instructions will have fewer wrong-file edits, fewer style violations, fewer dependency hallucinations and lower token cost.
- **H4: Type-level structure reduces review uncertainty.** Human reviewers will identify defects faster in typed-contract conditions than in plain TypeScript, but Effect may increase review time for reviewers unfamiliar with the library.
- **H5: The best architecture is task-dependent.** There will not be one universal winner; the interaction between task type and architecture will matter.

### Why Effect is interesting here

Effect is not just another library. It claims to make side effects, error handling, dependency management, concurrency and observability explicit in TypeScript. Those are exactly the domains where AI-generated code often fails quietly. A benchmark can test whether this explicitness improves agent behavior or simply adds cognitive/API overhead.

### Why this is better than a generic Copilot study

A generic Copilot study would ask whether AI helps. Typed Agent Bench asks:

> **What software architecture lets AI help without increasing hidden risk?**

That is more novel, more useful to engineers, and more aligned with your brand.

### Public-data extension

Before or alongside the benchmark, publish an adoption analysis:

- npm downloads over time for `effect`, `@effect/platform-node`, `zod`, `valibot`, `neverthrow`, `fp-ts`, `ts-pattern`, `convex`, `@rocicorp/zero`, Electric packages and related tools.
- GitHub stars, releases, issue velocity and contributor growth for those projects.
- GitHub code-search counts for `Effect.gen`, `Effect.tryPromise`, `neverthrow`, `Result<`, `z.object`, `AGENTS.md`, `CLAUDE.md`, `.cursor/rules`.
- State of JS/Stack Overflow/JetBrains data for TypeScript and AI-tool adoption.

### Output artefacts

- `typed-agent-bench` GitHub repo
- benchmark tasks and hidden-test methodology
- public dashboard
- paper-style blog post
- preregistration file
- leaderboard by model/agent/architecture
- short talk/demo: “Can we write code that AI can safely modify?”

---

## Direction 2 — Agent-readable repositories: the rise of `AGENTS.md`

### Working title

**The Rise of Agent-Readable Repositories: Do repo instructions improve AI coding-agent performance?**

### Core question

Are repositories starting to contain instructions written for AI agents, and do those instructions measurably improve agent success?

### Why this is compelling

Developers increasingly add files like:

- `AGENTS.md`
- `CLAUDE.md`
- `.cursor/rules`
- `.github/copilot-instructions.md`
- `windsurf.rules`
- `aider.conf.yml`

These files are effectively a new documentation layer: not for humans, not for runtime, but for AI collaborators.

### Public-data component

Mine GitHub for adoption over time:

- count repos containing each agent-instruction file
- growth by language/ecosystem
- co-occurrence with TypeScript, Python, Rust, Go
- co-occurrence with tests, CI, coverage, docs, OpenSSF Scorecard
- repo size/stars/activity differences

### Experimental component

Take the same TypeScript repo and compare conditions:

1. no agent instructions
2. minimal instructions
3. detailed architecture instructions
4. detailed instructions plus examples
5. detailed instructions plus anti-patterns and test commands

Run the same agent tasks and measure:

- pass rate
- wrong-file edits
- time/tokens
- number of failed test loops
- style violations
- hallucinated commands/packages
- patch size

### Hypotheses

- Detailed instructions improve performance on multi-file tasks.
- Instructions help most when they include exact test commands, architecture boundaries and examples.
- Overlong instructions may reduce performance by increasing context noise.
- Anti-pattern sections reduce common agent mistakes.

### Why this could go viral

Every engineering team adopting coding agents is wondering what to put in `AGENTS.md` or equivalent files. A data-backed answer would be highly shareable.

### Good final output

> **An evidence-based template for agent-readable repositories.**

This can become a practical resource, not just a paper.

---

## Direction 3 — Sync Engine Bench

### Working title

**Sync Engine Bench: Do Convex, Zero, Electric and conventional APIs change developer velocity, agent success and runtime correctness?**

### Core question

Do modern sync-engine architectures make it easier to build reliable real-time applications, or do they shift complexity into places that are harder for humans and AI agents to reason about?

### Why this is compelling

Sync engines are a cutting-edge software engineering topic. Convex, Zero, Electric, LiveStore and related tools promise a better model for reactive apps, local-first workflows and real-time collaboration. But the claims are often qualitative.

A benchmark could make the tradeoffs visible.

### Systems to compare

Build the same application several ways:

1. **Conventional stack**  
   Postgres + REST/tRPC + React Query/TanStack Query.

2. **Convex**  
   Reactive database, TypeScript functions, automatic sync.

3. **Electric/Zero-style sync engine**  
   Postgres-backed sync/local cache approach.

4. **Firebase/Supabase realtime baseline**  
   Common managed realtime alternative.

### Benchmark app

A realistic collaborative task app or issue tracker:

- organizations/teams/projects
- tasks/issues
- comments
- assignments
- optimistic updates
- offline edit queue
- multi-user conflict handling
- permissions
- audit log
- search/filter
- attachment metadata

### Quantitative metrics

| Dimension              | Metrics                                                                           |
| ---------------------- | --------------------------------------------------------------------------------- |
| Developer effort       | time to implement, files changed, LOC, number of concepts/APIs used               |
| AI-agent performance   | pass rate on feature tasks, bug-fix tasks, migration tasks                        |
| Runtime UX             | p50/p95 interaction latency, time to consistency across clients, offline survival |
| Correctness            | conflict-resolution failures, lost updates, stale reads, permission failures      |
| Maintainability        | complexity, duplicated glue code, test coverage, onboarding task time             |
| Operational complexity | services required, local dev setup time, migration complexity, deploy steps       |

### Public-data component

- npm downloads and version cadence for Convex, Zero, Electric, LiveStore and related packages.
- GitHub stars, contributors, issue closure times and release frequency.
- State of JS backend/framework data where relevant.

### Hypotheses

- Convex-style “everything in TypeScript” improves AI-agent success on basic features because the model sees one language and one project structure.
- Conventional stacks are easier to debug with familiar tools but require more glue code.
- Sync engines improve UX latency but increase mental-model complexity for permissions, migrations and offline conflicts.
- AI agents may over-trust optimistic UI and fail to implement server-side authorization unless tests force it.

### Why this fits your brand

This is an engineer’s research project: build the same thing multiple ways, measure the tradeoffs, and give practical advice to teams choosing a stack in 2026.

---

## Direction 4 — AI code review debt

### Working title

**AI Code Review Debt: Do coding agents save implementation time while increasing reviewer burden?**

### Core question

When AI generates code or PRs, does it shift effort from writing to reviewing?

### Why this matters

The developer community increasingly reports a subjective pattern: AI makes it easier to produce code, but harder to maintain review quality. Existing productivity metrics often count completed tasks or merged PRs, but under-measure reviewer burden, false confidence, and long-term maintainability.

### Public datasets

- SWE-PRBench: human-annotated pull-request review benchmark.
- GitHub PR data: public PR metadata, review comments, review latency, revert/follow-up commits.
- GitClear-style metrics: churn, duplication, refactoring vs copy/paste trends.
- Your own AI-generated PR corpus.

### Controlled experiment

Generate PRs for a TypeScript repo under different conditions:

1. human-written PRs
2. agent-written PRs with no tests
3. agent-written PRs with tests
4. agent-written PRs with typed contracts
5. agent-written PRs with repo instructions

Ask reviewers to evaluate blind or semi-blind PRs.

### Metrics

- defects found / defects missed
- false-positive review comments
- time to first substantive comment
- time to approve/reject
- reviewer confidence
- reviewer cognitive load
- number of follow-up fixes required
- hidden test failure rate after approval

### Hypotheses

- Agent-generated PRs will look more complete than they are.
- Reviewers will miss more hidden failures when patches are large and superficially polished.
- Typed contracts and hidden tests reduce missed defects.
- AI review tools will detect some obvious issues but miss domain-specific and cross-file failures.

### Output

A practical guide:

> **How to review AI-generated PRs without drowning in review debt.**

---

## Direction 5 — Package hallucination and the npm supply chain

### Working title

**SlopSquatJS: Measuring hallucinated dependency risk in AI-generated TypeScript code**

### Core question

Do AI coding agents hallucinate npm dependencies, and are hallucinations more common for emerging stacks than mature stacks?

### Why this matters

Package hallucination is now a real software supply-chain concern. Research on package hallucinations generated hundreds of thousands of samples across models and languages, and security writers have connected the phenomenon to “slopsquatting”: attackers registering hallucinated package names.

### Experimental design

Prompt coding agents to generate apps/features across stack families:

- mature Express/React stack
- modern Hono/Elysia/Bun stack
- Effect stack
- Convex stack
- local-first/sync-engine stack
- AI/MCP tool stack

Extract:

- `package.json` dependencies
- imports
- install commands
- README setup commands
- generated `npx` commands

Then verify each package against:

- npm registry metadata
- npm download age and maintainer count
- OSV/GitHub advisories
- package-name similarity to real packages
- suspicious lifecycle scripts
- OpenSSF Scorecard where repository links exist

### Metrics

- hallucinated package rate
- typo/conflation/fabrication categories
- repeatability across models
- risk score for hallucinated names
- stack-specific hallucination rates
- effect of adding “only use packages already listed in package.json” instruction

### Hypotheses

- Emerging stacks cause more hallucinated dependency names than mature stacks.
- Agent instructions and registry-checking tools reduce hallucination rates.
- Hallucinated names cluster around plausible package naming conventions, making them squattable.

### Output

- public dataset of prompts and generated dependency names
- npm verification script
- “safe AI dependency workflow” checklist
- blog post: **When AI invents npm packages**

---

## Direction 6 — MCP server health and developer attack surface

### Working title

**The New Dev Dependency: Security and maintainability of MCP servers for software engineering agents**

### Core question

Are MCP servers becoming an ungoverned dependency layer in software engineering workflows?

### Why this is compelling

MCP servers give coding agents access to filesystems, databases, GitHub, Slack, cloud tools and local commands. That makes them powerful, but also creates a new attack surface. AISI’s MCP work shows how to study agent tools at ecosystem scale; you can focus specifically on developer tooling risk.

### Public data

- official MCP registry
- `modelcontextprotocol/servers`
- GitHub search for MCP servers
- npm packages with MCP keywords
- OpenSSF Scorecard
- OSV/GitHub Advisory Database
- package metadata and install scripts

### Measurements

- number of servers by category: filesystem, GitHub, database, browser, cloud, CI/CD, package manager
- presence of dangerous capabilities: `exec`, `spawn`, shell commands, filesystem writes, network access, token handling
- auth model: OAuth, API key, personal access token, none
- install method and lifecycle scripts
- maintainer count and release recency
- dependency vulnerabilities
- secrets-handling patterns
- documentation of permissions and threat model

### Hypotheses

- Many MCP servers expose high-impact tools with weak permission documentation.
- Developer-focused MCP servers are more likely to request file, shell, GitHub or package-manager access than general productivity servers.
- Security documentation lags behind capability exposure.
- Open-source health metrics identify some but not all MCP-specific risks.

### Output

- MCP developer-tool risk taxonomy
- open scanner for MCP server manifests/source code
- dashboard of ecosystem trends
- practical guidance: **how to approve MCP servers for engineering teams**

---

## Direction 7 — AI use and OSS code churn

### Working title

**The AI Churn Hypothesis: Are AI-visible pull requests more likely to be revised, reverted or duplicated?**

### Core question

Can we detect public signs that AI-assisted code changes impose downstream maintenance cost?

### Public-data strategy

Direct AI-use labels are hard. But you can build a cautious observational dataset using proxies:

- PRs authored by known bots or coding agents
- commits with AI signatures such as “Generated with Claude Code” or “Co-authored-by” patterns
- PR bodies containing agent templates
- repositories that publicly enable or discuss Copilot/coding-agent workflows
- compare against matched human PRs in the same repo/time period

### Metrics

- PR size
- review comment count
- time to merge
- follow-up fix commits within 7/30 days
- revert rate
- test-failure discussion
- code churn: lines modified again soon after merge
- duplication metrics
- issue reopen rate

### Causal caution

This is an observational project. Treat it as descriptive unless you can design stronger matching:

- repo fixed effects
- file path fixed effects
- issue label controls
- PR size controls
- author history controls
- time fixed effects
- matched nearest-neighbor PRs

### Why it is still useful

Even if causal inference is hard, a careful descriptive analysis of AI-visible PRs could be highly interesting if you are transparent about limitations.

---

## Direction 8 — Tests as the real AI productivity multiplier

### Working title

**Vibe Coding vs Verified Coding: Do tests, types and property checks change AI-agent success?**

### Core question

Do AI coding agents become substantially more reliable when the repository provides strong automated verification?

### Conditions

1. no tests
2. visible unit tests
3. visible unit tests + hidden tests
4. property-based tests
5. mutation tests
6. type tests
7. integration tests with seeded failure cases

### Tasks

Use the same TypeScript repo and assign agents to implement features under each verification condition.

### Metrics

- pass rate
- hidden defect rate
- number of failed loops before success
- false confidence in final answer
- amount of test-specific overfitting
- regression rate
- patch complexity

### Hypotheses

- Visible tests improve basic correctness but can induce overfitting.
- Hidden tests reveal failures in “vibe-coded” solutions.
- Property-based tests and type tests improve generalization.
- Agents benefit more from precise failing tests than from long prose instructions.

### Why this is practical

The final output can become a guide for engineering teams adopting AI:

> **Invest in test harnesses before buying more agent seats.**

---

## Direction 9 — The TypeScript adoption frontier

### Working title

**Typed by Default: Is TypeScript becoming infrastructure for AI-assisted development?**

### Core question

Is TypeScript adoption accelerating because typed code is easier for both humans and AI agents to modify safely?

### Public-data component

- GitHub Innovation Graph language trends.
- Octoverse language rankings.
- State of JS TypeScript usage.
- npm package growth for TypeScript-first libraries.
- GitHub codebase analysis: TypeScript config strictness, presence of schemas, codegen, OpenAPI/tRPC/GraphQL types.

### Experimental component

Take the same tasks and compare:

- JavaScript repo
- TypeScript loose repo
- TypeScript strict repo
- TypeScript strict + schemas
- TypeScript strict + Effect/typed errors

### Metrics

- AI-generated compile errors
- runtime hidden-test failures
- review time
- incorrect assumptions about data shape
- unsafe null/undefined handling
- refactoring success

### Hypotheses

- Strict TypeScript reduces runtime shape errors but increases compile-fix loops.
- Agents may produce more correct patches when the type system points to exact defects.
- Loose TypeScript may appear faster but fail more hidden tests.

---

## Direction 10 — Convex as “AI-native backend”

### Working title

**Everything is Code? Testing whether Convex-style TypeScript backends are easier for coding agents to build and modify**

### Core question

Does a backend platform where schema, queries, mutations, APIs and app logic are all expressed in TypeScript improve AI-agent success compared with a conventional split stack?

### Why Convex is interesting

Convex’s positioning is unusually relevant to AI-assisted software engineering: it presents the backend as TypeScript code next to the app, typechecked and autocomplete-friendly, with reactive sync. That gives you a testable claim:

> A unified TypeScript backend may be more legible to AI agents than a stack split across SQL, migrations, API handlers, cache invalidation and frontend state management.

### Experiment

Build the same product slice in:

1. Convex
2. Next.js API routes + Postgres + Prisma + React Query
3. Supabase + Postgres + Realtime
4. Zero/Electric-style sync stack

Ask agents to add features:

- add organization roles
- add audit log
- add invitation flow
- add optimistic UI
- add search filters
- add background notification
- add data migration
- fix authorization bug

### Metrics

- pass rate
- server/client type mismatch bugs
- authorization bugs
- amount of glue code
- codebase setup time
- testability
- agent token cost
- human review burden

### Possible finding

Convex may win on initial agent velocity but lose on portability or transparency; conventional stacks may be slower but easier to inspect with familiar tools. Either result is valuable.

---

## 6. Best flagship project: final recommendation

### Recommended project name

**Typed Agent Bench**

### Subtitle

**A benchmark for measuring whether modern TypeScript architecture improves AI coding-agent reliability.**

### Research question

> Do explicit types, schemas, error channels, dependency boundaries, tests and repo instructions make AI coding agents more reliable, or do they merely add complexity?

### Why this is the strongest option

It is stronger than a pure Effect paper because it is not a niche advocacy piece. It is stronger than a pure Convex paper because it is not vendor-like. It is stronger than a generic AI productivity study because it asks a new question with practical consequences.

It lets you talk about:

- AI coding agents
- TypeScript
- Effect
- Convex/sync engines
- architecture
- tests
- developer experience
- software quality
- empirical methods
- public-data analysis
- controlled experiments

That is an excellent personal-brand combination.

---

## 7. Preregistration sketch for Typed Agent Bench

This section is modelled on the style of a preregistration: lock variables, outcomes, hypotheses and diagnostics before running the experiment.

### 7.1 Research question

Do TypeScript codebases with explicit contracts and agent-readable instructions produce higher AI coding-agent success and lower human review burden than plain TypeScript codebases?

### 7.2 Experimental units

A unit is one agent run on one task in one repository condition.

```text
unit = task_id × architecture_condition × agent_model × seed
```

### 7.3 Conditions

- `plain_ts`: plain TypeScript, async/await, exceptions, minimal runtime validation.
- `schema_ts`: TypeScript plus runtime schemas and explicit API contracts.
- `result_ts`: TypeScript plus explicit `Result<T,E>` error channels.
- `effect_ts`: TypeScript plus Effect for typed effects, errors, services and concurrency.
- `agent_docs`: same as above but with detailed repo-level agent instructions.

### 7.4 Task families

- CRUD feature
- API integration
- error handling
- concurrency/cancellation
- background jobs
- authorization
- migration/backwards compatibility
- refactoring
- observability
- security-sensitive change

### 7.5 Primary outcomes

- `hidden_test_pass`: 1 if all hidden tests pass; 0 otherwise.
- `safety_test_pass`: 1 if all safety/failure-mode tests pass; 0 otherwise.
- `compile_pass`: 1 if TypeScript build passes with no new suppressions.
- `review_time_minutes`: human reviewer time to approve/reject.
- `major_defect_missed`: 1 if reviewer approves a patch with hidden critical failure.

### 7.6 Secondary outcomes

- token count
- wall-clock time
- number of tool calls
- number of failed test loops
- lines changed
- files changed
- new dependencies added
- hallucinated APIs/imports
- patch complexity
- reviewer confidence
- perceived maintainability

### 7.7 Confirmatory hypotheses

- **H1:** `schema_ts`, `result_ts` and `effect_ts` will outperform `plain_ts` on `hidden_test_pass` for tasks involving invalid inputs or third-party failure.
- **H2:** `effect_ts` will outperform all other conditions on concurrency, cancellation, retry and resource-safety tasks.
- **H3:** `agent_docs` will reduce wrong-file edits, hallucinated commands and token count compared with equivalent repos without instructions.
- **H4:** Human reviewers will miss fewer defects when reviewing patches in `schema_ts` and `result_ts` than in `plain_ts`.
- **H5:** `effect_ts` will have higher review time variance because it is more unfamiliar to many TypeScript developers.

### 7.8 Diagnostics

- Pin dependency versions and model versions where possible.
- Randomize task order.
- Run each model with the same context budget and allowed tools.
- Separate visible tests from hidden tests.
- Do not alter tasks after observing results except under labelled exploratory analysis.
- Report null results and negative results.
- Include per-task analysis to avoid hiding failure modes in aggregate pass rates.
- Release prompts, task specs, harness code and non-sensitive logs.

---

## 8. Practical build plan

### Week 1 — Public-data scan

- Build npm downloader for package time series.
- Pull GitHub repo metadata for target tools.
- Make first charts: TypeScript, Effect, Convex, Zod, neverthrow, fp-ts, ts-pattern, Electric, Zero, MCP packages, agent-instruction files.
- Write initial research note: “Why architecture may matter for AI agents.”

### Week 2 — Benchmark design

- Pick 8–12 tasks.
- Build base TypeScript repo.
- Implement architecture variants.
- Write hidden tests.
- Write preregistration.

### Week 3 — Agent harness

- Create a CLI to run agents against tasks.
- Capture logs, patches, tokens, time, commands and failures.
- Add validation: install, typecheck, lint, visible tests, hidden tests.

### Week 4 — First benchmark run

- Run small pilot: 3 tasks × 3 conditions × 2 agents.
- Fix harness issues, not task difficulty after results unless logged.
- Publish prereg before full run.

### Week 5 — Full run

- Run full matrix.
- Analyse pass rates, failure modes, token cost, patch complexity.
- Build dashboard.

### Week 6 — Human review study

- Recruit 8–20 developers.
- Give each reviewer a balanced set of PRs.
- Measure time, defect detection, confidence and maintainability ratings.

### Week 7 — Write and release

- Publish repo.
- Publish paper-style report.
- Publish blog summary with practical recommendations.
- Include charts and benchmark tables.

### Week 8 — Distribution

- Share on Hacker News, Lobsters, Reddit r/typescript, r/javascript, r/programming, Effect Discord, Convex Discord, local-first communities, LinkedIn and relevant newsletters.
- Offer the benchmark as a reproducible template for teams.

---

## 9. Suggested repo structure

```text
typed-agent-bench/
  README.md
  PREREGISTRATION.md
  datasets/
    npm_package_panel.csv
    github_repo_panel.csv
    survey_sources.md
  tasks/
    task_001_retry_cancellation/
      spec.md
      visible_tests/
      hidden_tests/
    task_002_webhook_verification/
    task_003_authorization_bug/
  repos/
    plain_ts/
    schema_ts/
    result_ts/
    effect_ts/
  agent_docs/
    minimal.md
    detailed.md
    detailed_with_examples.md
  harness/
    run_agent.ts
    apply_patch.ts
    score_run.ts
    collect_metrics.ts
  analysis/
    notebooks/
    figures/
    regressions/
  review_study/
    instructions.md
    reviewer_form.md
    anonymized_results.csv
  reports/
    typed_agent_bench_report.md
```

---

## 10. Suggested metrics dashboard

Create a small dashboard with:

- pass rate by architecture
- hidden-test failure rate by task family
- tokens per successful patch
- wall-clock time per successful patch
- dependency hallucinations
- compile-loop count
- review time by architecture
- major defects missed by reviewers
- patch size vs pass rate
- agent-docs effect size

A compelling chart would show:

> **Success per 10k tokens** by architecture and task family.

That metric avoids rewarding a slow, expensive condition that eventually passes only by brute force.

---

## 11. How to make the project credible

### Good practices

- Publish a preregistration before the full benchmark.
- Keep hidden tests hidden until after the initial run.
- Label exploratory analyses clearly.
- Report model/version/date because coding agents change quickly.
- Include negative findings.
- Use confidence intervals, not only leaderboards.
- Avoid claiming “Effect is best” or “Convex is best”; claim where each helps or hurts.
- Make tasks realistic enough that working engineers care.

### Common pitfalls

- Letting agents train against your hidden tests through repeated public runs.
- Comparing libraries with very different task difficulty.
- Treating npm downloads as real user counts.
- Overclaiming causal effects from public GitHub observational data.
- Ranking frameworks without accounting for familiarity and maturity.
- Using only toy tasks that do not involve failures, concurrency, auth or migrations.

---

## 12. Distribution strategy

### Primary audience

- senior TypeScript engineers
- engineering managers adopting AI coding agents
- developer-experience teams
- startup CTOs choosing modern stacks
- Effect/Convex/local-first communities
- AI tooling builders

### Launch assets

1. **Long report**: paper-style markdown with methods, hypotheses, results and limitations.
2. **Short blog post**: “What we learned after 400 AI coding-agent runs in TypeScript repos.”
3. **Interactive dashboard**: filter by architecture, task family and agent.
4. **GitHub repo**: benchmark harness and reproducibility instructions.
5. **Practical guide**: “How to make your repo easier for AI agents to modify safely.”
6. **Talk/demo**: run an agent against plain TypeScript vs Effect/schema-rich repo and show failure modes.

### Possible headlines

- “Does TypeScript make AI coding agents better?”
- “The best AI coding tool might be your type system.”
- “AI agents need architecture, not just context windows.”
- “Effect, Convex and the search for agent-legible software.”
- “Vibe coding vs verified coding: what hidden tests reveal.”

---

## 13. Alternative research ideas worth keeping

| Rank | Idea                   | Why it is good                                                        | Why it is not the flagship                                                        |
| ---: | ---------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
|    1 | Typed Agent Bench      | Best mix of AI, engineering, TypeScript, experiments and public data. | Requires careful harness build.                                                   |
|    2 | Agent-readable repos   | Very timely, practical and easier to execute.                         | Slightly narrower; less deep technically unless combined with benchmark.          |
|    3 | Sync Engine Bench      | Great software-engineering depth; Convex/local-first angle is fresh.  | More implementation work; comparisons can become subjective.                      |
|    4 | AI code review debt    | Strong human-workflow relevance.                                      | Needs reviewers; recruitment slows execution.                                     |
|    5 | SlopSquatJS            | Security-relevant and quantifiable.                                   | Less aligned with product/software architecture identity unless framed carefully. |
|    6 | MCP server health      | Very timely and security-facing.                                      | More security-research brand than software-engineering/productivity brand.        |
|    7 | AI churn in OSS        | Potentially viral if done well.                                       | Treatment detection and causality are hard.                                       |
|    8 | Tests as AI multiplier | Useful and publishable.                                               | Could be a sub-study inside Typed Agent Bench.                                    |

---

## 14. Final recommendation

Build **Typed Agent Bench** as the flagship.

Treat Effect and Convex not as the whole topic, but as two important examples of a broader question:

> **What does software need to look like when both humans and AI agents are contributors?**

That question is big enough to matter, narrow enough to measure, and personal enough to reflect your identity as a software engineer.

A polished final output could credibly say:

> “I built a reproducible benchmark comparing how AI coding agents perform across plain TypeScript, schema-rich TypeScript, Result-style error handling and Effect-based architectures. I combined npm/GitHub ecosystem data with 400+ controlled agent runs and a human review study. The results show when type-level constraints help, when they add overhead, and how teams can make repositories more agent-legible without giving up maintainability.”

That is a strong personal-brand research asset.

---

## 15. Reference links

### AI coding productivity and quality

- METR: “Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity”  
  https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/
- METR arXiv paper  
  https://arxiv.org/abs/2507.09089
- METR anonymized data/code repo  
  https://github.com/METR/Measuring-Early-2025-AI-on-Exp-OSS-Devs
- Microsoft Research: “The Impact of AI on Developer Productivity: Evidence from GitHub Copilot”  
  https://www.microsoft.com/en-us/research/publication/the-impact-of-ai-on-developer-productivity-evidence-from-github-copilot/
- DORA 2025 State of AI-assisted Software Development  
  https://dora.dev/dora-report-2025/
- GitClear AI code quality research  
  https://www.gitclear.com/ai_assistant_code_quality_2025_research

### Public data sources

- GitHub Innovation Graph  
  https://innovationgraph.github.com/
- GitHub Innovation Graph data repo  
  https://github.com/github/innovationgraph
- GH Archive  
  https://www.gharchive.org/
- GitHub REST API docs  
  https://docs.github.com/en/rest
- GitHub GraphQL API docs  
  https://docs.github.com/en/graphql
- npm registry API docs  
  https://api-docs.npmjs.com/
- npm package metadata docs  
  https://github.com/npm/registry/blob/master/docs/responses/package-metadata.md
- Libraries.io data  
  https://www.kaggle.com/datasets/librariesdotio/libraries-io
- OSV.dev  
  https://osv.dev/
- OpenSSF Scorecard  
  https://github.com/ossf/scorecard
- GitHub Advisory Database  
  https://github.com/advisories

### Developer surveys

- Stack Overflow Developer Survey 2025  
  https://survey.stackoverflow.co/2025
- JetBrains Developer Ecosystem 2025  
  https://devecosystem-2025.jetbrains.com/
- State of JavaScript 2025  
  https://2025.stateofjs.com/en-US
- State of JS 2025 about/methodology page  
  https://2025.stateofjs.com/en-US/about/

### AI coding benchmarks

- SWE-bench  
  https://www.swebench.com/
- SWE-bench GitHub repo  
  https://github.com/swe-bench/SWE-bench
- SWE-bench Verified  
  https://openai.com/index/introducing-swe-bench-verified/
- SWE-bench Live  
  https://github.com/microsoft/SWE-bench-Live
- SWE-agent  
  https://github.com/swe-agent/swe-agent
- SWE-PRBench arXiv page  
  https://arxiv.org/html/2603.26130v1

### TypeScript, Effect and sync engines

- Effect website  
  https://effect.website/
- Effect GitHub repo  
  https://github.com/effect-ts/effect
- Effect 3.0 release  
  https://effect.website/blog/releases/effect/30/
- Convex website  
  https://www.convex.dev/
- Convex docs  
  https://docs.convex.dev/home
- Convex sync page  
  https://www.convex.dev/sync
- Convex object sync engine article  
  https://stack.convex.dev/object-sync-engine
- ElectricSQL GitHub repo  
  https://github.com/electric-sql/electric
- Zero docs  
  https://zero.rocicorp.dev/

### MCP and agent tooling

- Anthropic: Introducing the Model Context Protocol  
  https://www.anthropic.com/news/model-context-protocol
- Official MCP registry  
  https://registry.modelcontextprotocol.io/
- MCP registry GitHub repo  
  https://github.com/modelcontextprotocol/registry
- MCP servers repo  
  https://github.com/modelcontextprotocol/servers
- AISI: How are AI agents used? Evidence from 177,000 AI agent tools  
  https://www.aisi.gov.uk/blog/how-are-ai-agents-used-evidence-from-177000-ai-agent-tools
- AISI MCP tools paper  
  https://arxiv.org/html/2603.23802v1
- Studying the Security and Maintainability of MCP Servers  
  https://arxiv.org/html/2506.13538v2
