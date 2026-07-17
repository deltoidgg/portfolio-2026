import {
  IconArrowRight,
  IconArrowUpRight,
  IconBrandBluesky,
  IconBrandGithub,
  IconBrandLinkedin,
  IconBrandX,
  IconMail,
} from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { govukSummary, ukResults, usResults, uswdsSummary } from "datasets/artifacts";
import { FplSpotlight } from "../components/fpl-spotlight";
import { ProjectCard } from "../components/project-card";
import { featuredProjects, projectBySlug } from "../content/projects";
import { buildMetadata } from "../lib/metadata";

const description =
  "Software engineer across product and design engineering, building AI-enabled products from agent workflows and APIs to accessible interfaces and data visualisation.";

export const Route = createFileRoute("/")({
  head: () => buildMetadata({ title: "Wasim Arif", description, path: "/" }),
  component: Home,
});

const socials = [
  { label: "GitHub", href: "https://github.com/deltoidgg", Icon: IconBrandGithub },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/wasimarif/", Icon: IconBrandLinkedin },
  { label: "X", href: "https://x.com/xwasim", Icon: IconBrandX },
  { label: "Bluesky", href: "https://bsky.app/profile/rerixo.bsky.social", Icon: IconBrandBluesky },
] as const;

function Home() {
  const usDrop = Math.round((1 - usResults.h1.strongVsNone.irr) * 100);
  const ukDrop = Math.round((1 - ukResults.h4.strongVsNone.irr) * 100);
  const totalSites = uswdsSummary.meta.analysedSites + govukSummary.meta.analysedSites;
  const fplProject = projectBySlug("fpl");
  const otherFeaturedProjects = featuredProjects.filter((project) => project.slug !== "fpl");

  return (
    <div>
      <header className="mx-auto max-w-2xl px-6 pb-20 pt-16 sm:px-8 sm:pb-24 sm:pt-24">
        <span className="gradient mask mb-9 block h-12 w-20" role="img" aria-hidden="true" />
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.16em] text-accent-ink">
          Software engineer · London
        </p>
        <h1 className="mb-5 text-4xl font-semibold tracking-[-0.04em] text-ink text-balance sm:text-5xl">
          Wasim Arif
        </h1>
        <p className="mb-6 text-xl leading-snug tracking-tight text-ink-muted text-balance sm:text-2xl">
          Software engineer across product &amp; design engineering.
        </p>
        <p className="max-w-xl text-base leading-relaxed text-ink-muted text-pretty sm:text-lg">
          I build AI-enabled products end to end—from agent workflows and APIs to accessible
          interfaces, interaction, and data visualisation. I like the point where a half-formed idea
          becomes something people can understand, trust, and use.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/projects"
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-canvas transition-opacity hover:opacity-85"
          >
            View selected work
            <IconArrowRight size={16} aria-hidden="true" />
          </Link>
          <a
            href="mailto:wasim.arif@live.co.uk"
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-edge bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-edge-strong hover:bg-surface-raised"
          >
            <IconMail size={17} aria-hidden="true" />
            Email me
          </a>
          <a
            href="https://www.linkedin.com/in/wasimarif/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 px-2 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            LinkedIn
            <IconArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>

        <nav aria-label="Social profiles" className="mt-7 flex items-center gap-1">
          {socials.map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface hover:text-ink"
              aria-label={label}
              title={label}
            >
              <Icon size={19} aria-hidden="true" />
            </a>
          ))}
        </nav>
      </header>

      <div>
        <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-8" aria-labelledby="selected-work">
          <div className="mx-auto mb-9 flex max-w-2xl items-end justify-between gap-6">
            <div>
              <p className="mb-2 font-mono text-xs uppercase tracking-[0.16em] text-accent-ink">
                Selected work
              </p>
              <h2 id="selected-work" className="text-2xl font-semibold tracking-tight text-ink">
                Products with inspectable proof
              </h2>
            </div>
            <Link
              to="/projects"
              className="hidden min-h-10 items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink sm:inline-flex"
            >
              All work <IconArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          {fplProject ? <FplSpotlight project={fplProject} /> : null}
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {otherFeaturedProjects.map((project, index) => (
              <ProjectCard key={project.slug} project={project} priority={index === 0} />
            ))}
          </div>
        </section>

        <section className="border-y border-edge bg-surface/45" aria-labelledby="research-heading">
          <div className="mx-auto grid max-w-5xl gap-10 px-6 py-20 sm:px-8 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-accent-ink">
                Independent research
              </p>
              <h2
                id="research-heading"
                className="mb-5 text-3xl font-semibold tracking-[-0.03em] text-ink text-balance"
              >
                Do design systems deliver accessibility at scale?
              </h2>
              <p className="mb-5 leading-relaxed text-ink-muted text-pretty">
                Strong design-system adoption signals were associated with roughly half as many
                automatically detected accessibility violations. The pre-registered specification
                then replicated on held-out UK data.
              </p>
              <p className="leading-relaxed text-ink-muted text-pretty">
                I built the scanner, ETL, confirmatory analysis, frozen artifacts, accessible
                visualisations, and DuckDB-WASM explorers. The paper reports nulls and detector
                limitations alongside the result.
              </p>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium">
                <a
                  href="https://research.wasimarif.com/papers/design-systems-accessibility"
                  className="inline-flex min-h-10 items-center gap-1.5 text-ink transition-colors hover:text-accent-ink"
                >
                  Read the paper <IconArrowUpRight size={16} aria-hidden="true" />
                </a>
                <Link
                  to="/writing/$slug"
                  params={{ slug: "design-systems-accessibility" }}
                  className="inline-flex min-h-10 items-center gap-1.5 text-ink-muted transition-colors hover:text-ink"
                >
                  Plain-English version <IconArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="research-evidence" aria-label="Research result summary">
              <div className="research-evidence__plot" aria-hidden="true">
                <span style={{ width: "50%" }} />
                <span style={{ width: "56%" }} />
                <i />
              </div>
              <dl className="grid gap-px overflow-hidden rounded-lg border border-edge bg-edge sm:grid-cols-3">
                <div className="bg-canvas p-5">
                  <dt className="mb-2 text-xs leading-snug text-ink-subtle">
                    US strong-adoption association
                  </dt>
                  <dd className="font-mono text-3xl font-semibold tracking-tight text-ink">
                    −{usDrop}%
                  </dd>
                </div>
                <div className="bg-canvas p-5">
                  <dt className="mb-2 text-xs leading-snug text-ink-subtle">
                    Held-out UK replication
                  </dt>
                  <dd className="font-mono text-3xl font-semibold tracking-tight text-ink">
                    −{ukDrop}%
                  </dd>
                </div>
                <div className="bg-canvas p-5">
                  <dt className="mb-2 text-xs leading-snug text-ink-subtle">
                    Government sites analysed
                  </dt>
                  <dd className="font-mono text-3xl font-semibold tracking-tight text-ink">
                    {totalSites.toLocaleString()}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-xs leading-relaxed text-ink-subtle">
                Incidence-rate models with agency or organisation controls. Observational evidence;
                automated checks measure the floor of accessibility, not the whole experience.
              </p>
            </div>
          </div>
        </section>

        <section
          className="mx-auto max-w-2xl px-6 py-20 sm:px-8 sm:py-24"
          aria-labelledby="contact-heading"
        >
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-accent-ink">
            Contact
          </p>
          <h2 id="contact-heading" className="mb-4 text-2xl font-semibold tracking-tight text-ink">
            Building across product and interface?
          </h2>
          <p className="mb-7 max-w-xl leading-relaxed text-ink-muted text-pretty">
            I am interested in software engineering roles where product judgement, frontend craft,
            and the systems underneath the interface all matter.
          </p>
          <a
            href="mailto:wasim.arif@live.co.uk"
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-canvas transition-opacity hover:opacity-85"
          >
            <IconMail size={17} aria-hidden="true" />
            Email me
          </a>
        </section>
      </div>
    </div>
  );
}
