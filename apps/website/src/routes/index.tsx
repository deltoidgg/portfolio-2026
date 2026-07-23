import {
  IconArrowRight,
  IconBrandGithub,
  IconBrandLinkedin,
  IconMail,
  IconMapPin,
  IconRss,
} from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { govukSummary, ukResults, usResults, uswdsSummary } from "datasets/artifacts";
import { featuredPost, formatPostDate } from "../content/posts";
import { featuredProjects } from "../content/projects";
import { buildMetadata } from "../lib/metadata";

const description =
  "Product engineer and technical writer building inspectable systems, accessible interfaces, and open research.";

export const Route = createFileRoute("/")({
  head: () => buildMetadata({ title: "Wasim Arif", description, path: "/" }),
  component: Home,
});

const projectCategories: Record<string, string> = {
  fpl: "Data & analytics",
  mockpit: "Developer tools",
  rewriter: "AI & productivity",
};

const researchItems = [
  {
    date: "30 Jun, 2026",
    title: "Do design systems deliver accessibility at scale?",
    copy: "The canonical paper, frozen methodology, replication, and results.",
    href: "https://research.wasimarif.com/papers/design-systems-accessibility",
  },
  {
    date: "US data",
    title: "USWDS adoption and accessibility",
    copy: "Explore 12,252 federal websites locally in your browser.",
    href: "https://research.wasimarif.com/explore/uswds-a11y",
  },
  {
    date: "UK data",
    title: "govuk-frontend adoption and accessibility",
    copy: "Interrogate the held-out replication dataset and evidence.",
    href: "https://research.wasimarif.com/explore/govuk-a11y",
  },
];

function Home() {
  const usDrop = Math.round((1 - usResults.h1.strongVsNone.irr) * 100);
  const ukDrop = Math.round((1 - ukResults.h4.strongVsNone.irr) * 100);
  const totalSites = uswdsSummary.meta.analysedSites + govukSummary.meta.analysedSites;
  const proofEstimates = [
    {
      id: "US",
      y: 68,
      colour: "var(--ui-data-cyan)",
      estimate: usResults.h1.strongVsNone,
    },
    {
      id: "UK",
      y: 124,
      colour: "var(--ui-data-green)",
      estimate: ukResults.h4.strongVsNone,
    },
  ] as const;
  const proofTicks = [0.4, 0.6, 0.8, 1] as const;
  const plotIrr = (value: number) =>
    112 + ((Math.min(1.05, Math.max(0.3, value)) - 0.3) / 0.75) * 390;
  const post = featuredPost();
  const writingItems = [
    ...(post
      ? [
          {
            date: formatPostDate(post.date),
            title: post.title,
            copy: post.deck,
            to: "/writing/$slug" as const,
            params: { slug: post.slug },
          },
        ]
      : []),
    ...featuredProjects
      .filter((project) => project.slug !== "fpl")
      .slice(0, 2)
      .map((project) => ({
        date: project.timeframe,
        title: project.name + " — case study",
        copy: project.decision,
        to: "/projects/$slug" as const,
        params: { slug: project.slug },
      })),
  ];

  return (
    <div className="home-page mx-auto max-w-[var(--ui-page-width)] px-5 pb-2 pt-12 sm:px-8 lg:px-0 lg:pt-20">
      <header className="home-hero">
        <div>
          <p className="section-kicker">Product engineer &amp; technical writer</p>
          <h1>
            Open research<span>.</span>
            <br />
            Inspectable systems<span>.</span>
            <br />
            Product engineering<span>.</span>
          </h1>
          <p className="home-hero__deck">
            I build AI-enabled products that translate complexity into clarity. I write about
            systems, evidence, interfaces, and trust—so teams can ship with confidence.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/writing" className="primary-action">
              Read writing <IconArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link to="/projects" className="secondary-action">
              View selected work <IconArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <aside className="current-focus">
          <p className="section-kicker">
            <span className="inline-block h-2 w-2 rounded-full bg-accent-bright shadow-[0_0_10px_var(--ui-accent)]" />
            Current focus
          </p>
          <p>Systems that are observable, measurable, and built to earn trust.</p>
          <svg
            viewBox="0 0 360 70"
            role="img"
            aria-label="A calm line representing iterative systems work"
          >
            <polyline
              points="0,50 22,29 43,45 67,49 92,41 118,42 145,28 172,34 201,24 227,41 253,43 279,32 303,46 330,39 360,48"
              fill="none"
              stroke="var(--ui-accent)"
              strokeOpacity="0.38"
              strokeWidth="1.5"
            />
          </svg>
        </aside>
      </header>

      <section className="home-split border-t border-edge" aria-label="Latest writing and research">
        <div className="home-list-column">
          <div className="section-heading-row">
            <p className="section-kicker">Latest writing</p>
            <Link to="/writing">
              View all writing <IconArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="ledger-list">
            {writingItems.map((item) => (
              <Link key={item.title} to={item.to} params={item.params} className="ledger-row group">
                <time>{item.date}</time>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.copy}</small>
                </span>
                <IconArrowRight size={15} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>

        <div className="home-list-column">
          <div className="section-heading-row">
            <p className="section-kicker">Latest research</p>
            <a href="https://research.wasimarif.com">
              View all research <IconArrowRight size={14} aria-hidden="true" />
            </a>
          </div>
          <div className="ledger-list">
            {researchItems.map((item) => (
              <a key={item.title} href={item.href} className="ledger-row group">
                <time>{item.date}</time>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.copy}</small>
                </span>
                <IconArrowRight size={15} aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </section>

      <section
        className="home-section border-t border-edge"
        aria-labelledby="selected-work-heading"
      >
        <div className="section-heading-row">
          <p id="selected-work-heading" className="section-kicker">
            Selected work
          </p>
          <Link to="/projects">
            View all projects <IconArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <div className="work-ledger">
          {featuredProjects.map((project) => (
            <Link
              key={project.slug}
              to="/projects/$slug"
              params={{ slug: project.slug }}
              className="work-row group"
            >
              <strong>{project.name}</strong>
              <span>{project.summary}</span>
              <em>
                <i />
                {projectCategories[project.slug] ?? project.kind}
              </em>
              <IconArrowRight size={15} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section
        className="research-proof border-t border-edge"
        aria-labelledby="research-proof-heading"
      >
        <div className="research-proof__intro">
          <p className="section-kicker">Research proof</p>
          <h2 id="research-proof-heading">Do design systems deliver accessibility at scale?</h2>
          <p>
            Pre-registered evidence across {totalSites.toLocaleString()} production websites, with a
            held-out replication and open artifacts.
          </p>
          <a href="https://research.wasimarif.com/papers/design-systems-accessibility">
            Read the paper <IconArrowRight size={14} aria-hidden="true" />
          </a>
        </div>
        <dl className="research-proof__stats">
          <div>
            <dt>Held-out UK replication</dt>
            <dd>
              <span>−{ukDrop}%</span>
              <small>less violations</small>
            </dd>
          </div>
          <div>
            <dt>US association</dt>
            <dd>
              <span>−{usDrop}%</span>
              <small>fewer detected violations</small>
            </dd>
          </div>
        </dl>
        <div className="research-proof__chart">
          <p className="section-kicker">Adjusted incidence-rate ratio / 95% CI</p>
          <svg
            viewBox="0 0 520 180"
            role="img"
            aria-labelledby="proof-chart-title proof-chart-desc"
          >
            <title id="proof-chart-title">
              Adjusted strong-adoption estimates for the United States and United Kingdom
            </title>
            <desc id="proof-chart-desc">
              Artifact-derived incidence-rate ratios compare strong design-system adoption with the
              below-50 reference group. Both estimates and confidence intervals remain below one,
              indicating fewer detected accessibility violations.
            </desc>
            {proofTicks.map((tick) => (
              <g key={tick}>
                <line
                  x1={plotIrr(tick)}
                  x2={plotIrr(tick)}
                  y1="28"
                  y2="146"
                  stroke={tick === 1 ? "var(--ui-edge-strong)" : "var(--ui-edge)"}
                  strokeDasharray={tick === 1 ? "4 4" : undefined}
                />
                <text
                  x={plotIrr(tick)}
                  y="164"
                  fill="var(--ui-ink-subtle)"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {tick.toFixed(1)}
                </text>
              </g>
            ))}
            {proofEstimates.map(({ id, y, colour, estimate }) => (
              <g key={id}>
                <text x="8" y={y + 4} fill="var(--ui-ink-muted)" fontSize="11">
                  {id}
                </text>
                <line
                  x1={plotIrr(estimate.ciLow)}
                  x2={plotIrr(estimate.ciHigh)}
                  y1={y}
                  y2={y}
                  stroke={colour}
                  strokeWidth="3"
                />
                <line
                  x1={plotIrr(estimate.ciLow)}
                  x2={plotIrr(estimate.ciLow)}
                  y1={y - 7}
                  y2={y + 7}
                  stroke={colour}
                />
                <line
                  x1={plotIrr(estimate.ciHigh)}
                  x2={plotIrr(estimate.ciHigh)}
                  y1={y - 7}
                  y2={y + 7}
                  stroke={colour}
                />
                <circle cx={plotIrr(estimate.irr)} cy={y} r="6" fill={colour} />
                <text x={plotIrr(estimate.ciHigh) + 9} y={y + 4} fill="var(--ui-ink)" fontSize="10">
                  {estimate.irr.toFixed(2)}
                </text>
              </g>
            ))}
          </svg>
          <div className="research-proof__legend">
            <span>
              <i className="bg-data-cyan" />
              US ({uswdsSummary.meta.analysedSites.toLocaleString()})
            </span>
            <span>
              <i className="bg-data-green" />
              UK ({govukSummary.meta.analysedSites.toLocaleString()})
            </span>
            <span>1.0 = no association</span>
          </div>
        </div>
      </section>

      <section className="home-closing border-t border-edge" aria-label="About and contact">
        <div>
          <p className="section-kicker">About</p>
          <p>
            I’m Wasim Arif, a product engineer and technical writer based in London. I build systems
            that are measurable and maintainable, and write to make complex ideas actionable.
          </p>
          <Link to="/about">
            More about how I work <IconArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <address>
          <a href="mailto:wasim.arif@live.co.uk">
            <IconMail size={15} />
            wasim.arif@live.co.uk
          </a>
          <span>
            <IconMapPin size={15} />
            London, UK
          </span>
          <a href="https://www.linkedin.com/in/wasimarif/">
            <IconBrandLinkedin size={15} />
            linkedin.com/in/wasimarif
          </a>
          <a href="https://github.com/deltoidgg">
            <IconBrandGithub size={15} />
            github.com/deltoidgg
          </a>
        </address>
        <div>
          <p className="section-kicker">Stay in the loop</p>
          <p>Occasional notes on systems, research, and building with evidence.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="mailto:wasim.arif@live.co.uk" className="secondary-action">
              <IconMail size={15} />
              Email
            </a>
            <a href="/rss.xml" className="secondary-action">
              <IconRss size={15} />
              RSS
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
