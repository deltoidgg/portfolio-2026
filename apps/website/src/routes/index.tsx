import { IconArrowRight, IconArrowUpRight } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { researchHeadlines } from "../content/research-headlines";
import { ProjectPicture, projectTransition } from "../components/project-picture";
import { featuredPost, formatPostDate } from "../content/posts";
import { featuredProjects } from "../content/projects";
import { buildMetadata } from "../lib/metadata";

const description =
  "Wasim Arif is a product and design engineer in London. Projects, writing and research.";

const PAPER_URL = "https://research.wasimarif.com/papers/design-systems-accessibility";

export const Route = createFileRoute("/")({
  head: () => buildMetadata({ title: "Wasim Arif", description, path: "/" }),
  component: Home,
});

function Home() {
  const post = featuredPost();
  const totalSites = researchHeadlines.usSites + researchHeadlines.ukSites;

  return (
    <div className="page">
      <header className="intro">
        <h1 className="intro__title">Hi, I&rsquo;m Wasim.</h1>
        <p className="intro__lede">
          I&rsquo;m a product and design engineer in London. I build for the web with TypeScript and
          React, and I care about the bits that are easy to skip: accessibility, performance, and
          animation that actually feels smooth.
        </p>
        <p className="intro__body">
          Lately I&rsquo;ve been making a reading app for classic novels, a Fantasy Premier League
          lab and some devtools. I also ran a study on whether design systems make government
          websites more accessible. Short version: they seem to help, a lot.
        </p>
        <div className="intro__actions">
          <Link to="/projects" className="button button--primary">
            See my work
          </Link>
          <a href="mailto:wasim.arif@live.co.uk" className="button">
            Email me
          </a>
        </div>
      </header>

      <section className="home-section" aria-labelledby="work-heading">
        <div className="section-head">
          <h2 id="work-heading">Recent work</h2>
          <Link to="/projects" className="section-head__link">
            All projects <IconArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <div className="work-grid">
          {featuredProjects.map((project, index) => (
            <Link
              key={project.slug}
              to="/projects/$slug"
              params={{ slug: project.slug }}
              className="work-card"
            >
              <span
                className={index === 0 ? "work-card__media" : "work-card__media reveal-media"}
                style={projectTransition(project.slug)}
              >
                <ProjectPicture
                  image={project.cover}
                  sizes={
                    index === 0
                      ? "(min-width: 72rem) 72rem, 100vw"
                      : "(min-width: 72rem) 36rem, (min-width: 48rem) 50vw, 100vw"
                  }
                  priority={index === 0}
                />
              </span>
              <span className="work-card__body">
                <span className="work-card__title">
                  <strong>{project.name}</strong>
                  <span>{project.timeframe}</span>
                </span>
                <span className="work-card__summary">{project.summary}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section study" aria-labelledby="study-heading">
        <div className="study__text">
          <h2 id="study-heading">Do design systems actually help with accessibility?</h2>
          <p>
            I looked at {totalSites.toLocaleString()} government websites in the US and UK. Sites
            built properly on a design system had about half as many of the accessibility problems
            automated tools can catch. I wrote the whole method down before touching the UK data,
            and the result held up there too.
          </p>
          <ul className="study__links">
            {post ? (
              <li>
                <Link to="/writing/$slug" params={{ slug: post.slug }}>
                  Read the write-up <IconArrowRight size={15} aria-hidden="true" />
                </Link>
              </li>
            ) : null}
            <li>
              <a href={PAPER_URL}>
                Read the paper <IconArrowUpRight size={15} aria-hidden="true" />
              </a>
            </li>
            <li>
              <a href="https://research.wasimarif.com/#datasets">
                Explore the data <IconArrowUpRight size={15} aria-hidden="true" />
              </a>
            </li>
          </ul>
        </div>
        <EstimateChart />
      </section>

      {post ? (
        <section className="home-section" aria-labelledby="writing-heading">
          <div className="section-head">
            <h2 id="writing-heading">Writing</h2>
            <Link to="/writing" className="section-head__link">
              All writing <IconArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <Link to="/writing/$slug" params={{ slug: post.slug }} className="post-row">
            <time dateTime={post.date}>{formatPostDate(post.date)}</time>
            <span>
              <strong>{post.title}</strong>
              <span>{post.deck}</span>
            </span>
          </Link>
        </section>
      ) : null}

      <section className="home-section hello" aria-labelledby="hello-heading">
        <h2 id="hello-heading">Say hello</h2>
        <p>
          Want to talk about a project, a role, or anything on here? Email&rsquo;s the easiest way
          to reach me.
        </p>
        <a href="mailto:wasim.arif@live.co.uk" className="hello__email">
          wasim.arif@live.co.uk
        </a>
        <p className="hello__elsewhere">
          I&rsquo;m also on <a href="https://www.linkedin.com/in/wasimarif/">LinkedIn</a>,{" "}
          <a href="https://github.com/deltoidgg">GitHub</a> and{" "}
          <a href="https://bsky.app/profile/rerixo.bsky.social">Bluesky</a>.
        </p>
      </section>
    </div>
  );
}

function EstimateChart() {
  const estimates = [
    {
      id: "US",
      label: `US, ${researchHeadlines.usSites.toLocaleString()} sites`,
      y: 56,
      colour: "var(--ui-data-cyan)",
      estimate: researchHeadlines.us,
    },
    {
      id: "UK",
      label: `UK, ${researchHeadlines.ukSites.toLocaleString()} sites`,
      y: 116,
      colour: "var(--ui-data-green)",
      estimate: researchHeadlines.uk,
    },
  ] as const;
  const ticks = [0.4, 0.6, 0.8, 1] as const;
  const x = (value: number) => 140 + ((Math.min(1.05, Math.max(0.3, value)) - 0.3) / 0.75) * 310;

  return (
    <figure className="study__chart">
      <svg viewBox="0 0 520 186" role="img" aria-labelledby="study-chart-title study-chart-desc">
        <title id="study-chart-title">
          Violations on sites built on a design system, compared with sites that aren&rsquo;t
        </title>
        <desc id="study-chart-desc">
          US estimate {researchHeadlines.us.irr.toFixed(2)}, UK estimate{" "}
          {researchHeadlines.uk.irr.toFixed(2)}, both with 95% confidence intervals below 1, meaning
          fewer detected accessibility violations.
        </desc>
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={x(tick)}
              x2={x(tick)}
              y1="22"
              y2="146"
              stroke={tick === 1 ? "var(--ui-edge-strong)" : "var(--ui-edge)"}
              strokeDasharray={tick === 1 ? "4 4" : undefined}
            />
            <text x={x(tick)} y="166" fill="var(--ui-ink-subtle)" fontSize="11" textAnchor="middle">
              {tick === 1 ? "1.0 (no difference)" : tick.toFixed(1)}
            </text>
          </g>
        ))}
        {estimates.map(({ id, label, y, colour, estimate }) => (
          <g key={id}>
            <text x="0" y={y + 4} fill="var(--ui-ink-muted)" fontSize="12">
              {label}
            </text>
            <g className="study__interval">
              <line
                x1={x(estimate.ciLow)}
                x2={x(estimate.ciHigh)}
                y1={y}
                y2={y}
                stroke={colour}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx={x(estimate.irr)} cy={y} r="6" fill={colour} />
            </g>
            <text x={x(estimate.ciHigh) + 10} y={y + 4} fill="var(--ui-ink)" fontSize="12">
              {estimate.irr.toFixed(2)}
            </text>
          </g>
        ))}
      </svg>
      <figcaption>
        Detected violations compared with sites that don&rsquo;t use a design system. Lower is
        better. Lines show 95% confidence intervals.
      </figcaption>
    </figure>
  );
}
