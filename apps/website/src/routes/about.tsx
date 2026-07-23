import {
  IconArrowRight,
  IconBrandGithub,
  IconBrandLinkedin,
  IconMail,
  IconMapPin,
} from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { buildMetadata } from "../lib/metadata";

const description =
  "About Wasim Arif: a London-based product engineer and technical writer building inspectable systems and accessible interfaces.";

export const Route = createFileRoute("/about")({
  head: () => buildMetadata({ title: "About", description, path: "/about" }),
  component: AboutPage,
});

const principles = [
  {
    number: "01",
    title: "Make the evidence inspectable",
    copy: "A decision is easier to trust when its inputs, assumptions, and limitations stay visible.",
  },
  {
    number: "02",
    title: "Treat accessibility as infrastructure",
    copy: "Semantics, focus, resilient states, and reader control belong in the system, not at the end.",
  },
  {
    number: "03",
    title: "Design the seam",
    copy: "The quality of a product often lives where data, interface, model, and human judgement meet.",
  },
  {
    number: "04",
    title: "Say what remains unproven",
    copy: "Working software and public artifacts are evidence. Adoption and outcomes require different proof.",
  },
];

function AboutPage() {
  return (
    <div className="about-page mx-auto max-w-[var(--ui-page-width)] px-5 py-14 sm:px-8 lg:px-0 lg:py-20">
      <header className="about-hero">
        <div>
          <p className="section-kicker">About / Product &amp; design engineering</p>
          <h1>I build systems people can inspect, trust, and use.</h1>
        </div>
        <div>
          <p>
            I’m Wasim Arif, a London-based product engineer and technical writer. I work across
            product judgement, frontend craft, data, AI-enabled workflows, and the systems beneath
            the interface.
          </p>
          <p>
            I like the point where a half-formed idea becomes something measurable, maintainable,
            and clear enough for another person to reason about.
          </p>
        </div>
      </header>

      <section
        className="about-principles border-t border-edge"
        aria-labelledby="principles-heading"
      >
        <div className="section-heading-row">
          <p id="principles-heading" className="section-kicker">
            Working principles
          </p>
        </div>
        <div className="about-principles__grid">
          {principles.map((principle) => (
            <article key={principle.number}>
              <span>{principle.number}</span>
              <h2>{principle.title}</h2>
              <p>{principle.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-proof border-t border-edge" aria-labelledby="proof-heading">
        <div>
          <p className="section-kicker">Selected proof</p>
          <h2 id="proof-heading">The work joins product craft with evidence.</h2>
        </div>
        <div className="about-proof__links">
          <Link to="/projects">
            <span>
              <strong>Product case studies</strong>
              <small>Decisions, architecture, interface consequences, and what remains.</small>
            </span>
            <IconArrowRight size={16} aria-hidden="true" />
          </Link>
          <a href="https://research.wasimarif.com">
            <span>
              <strong>Open research</strong>
              <small>Pre-registration, data, code, replication, and browser-local explorers.</small>
            </span>
            <IconArrowRight size={16} aria-hidden="true" />
          </a>
          <Link to="/writing">
            <span>
              <strong>Writing</strong>
              <small>Technical evidence translated into practical engineering language.</small>
            </span>
            <IconArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="about-contact border-t border-edge" aria-labelledby="contact-heading">
        <div>
          <p className="section-kicker">Contact</p>
          <h2 id="contact-heading">
            Interested in systems where the interface and the evidence both matter?
          </h2>
        </div>
        <address>
          <a href="mailto:wasim.arif@live.co.uk">
            <IconMail size={16} />
            wasim.arif@live.co.uk
          </a>
          <span>
            <IconMapPin size={16} />
            London, UK
          </span>
          <a href="https://www.linkedin.com/in/wasimarif/">
            <IconBrandLinkedin size={16} />
            LinkedIn
          </a>
          <a href="https://github.com/deltoidgg">
            <IconBrandGithub size={16} />
            GitHub
          </a>
          <a href="mailto:wasim.arif@live.co.uk" className="primary-action mt-4 not-italic">
            Start a conversation <IconArrowRight size={15} aria-hidden="true" />
          </a>
        </address>
      </section>
    </div>
  );
}
