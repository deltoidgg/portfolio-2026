import { IconArrowRight, IconArrowUpRight } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { buildMetadata } from "../lib/metadata";

const description =
  "About Wasim Arif, a product and design engineer in London who works in TypeScript and React and cares about accessibility, performance and motion.";

export const Route = createFileRoute("/about")({
  head: () => buildMetadata({ title: "About", description, path: "/about" }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="page about">
      <header className="page-intro">
        <h1>About</h1>
      </header>

      <div className="about__bio">
        <p className="about__lede">
          I&rsquo;m Wasim, a product and design engineer based in London. I work mostly in
          TypeScript and React, and I&rsquo;m happiest somewhere between design and engineering:
          working out how something should feel, then making it feel that way in the browser.
        </p>
        <p>
          I care a lot about the details people notice without realising. That usually means chasing
          smooth animation, digging into performance and analytics tools, checking things work with
          a keyboard and a screen reader, and trying out new browser features before they&rsquo;re
          everywhere.
        </p>
        <p>
          Most of my side projects grow out of things I enjoy: classic books turned into{" "}
          <Link to="/projects/$slug" params={{ slug: "rewriter" }}>
            Rewriter
          </Link>
          , football into the{" "}
          <Link to="/projects/$slug" params={{ slug: "fpl" }}>
            FPL lab
          </Link>
          , and fighting games into{" "}
          <Link to="/projects/$slug" params={{ slug: "openfgc" }}>
            OpenFGC
          </Link>
          . I also like writing things up properly, which is how a question about design systems
          turned into a{" "}
          <a href="https://research.wasimarif.com/papers/design-systems-accessibility">
            pre-registered study of 18,547 government websites
          </a>
          .
        </p>
      </div>

      <section className="about__section about__prose" aria-labelledby="habits-heading">
        <h2 id="habits-heading">How I like to work</h2>
        <p>
          If a number is on screen, I want to be able to say where it came from, whether it&rsquo;s
          a dashboard, a forecast or a research result. I build accessibility in from the start too.
          Good semantics, focus handling and readable contrast cost far less early on than they do
          in a last-minute audit.
        </p>
        <p>
          I spend a lot of time in the gaps where data, design and code meet, because that&rsquo;s
          usually where a product either feels great or falls apart. And I try to be upfront about
          what&rsquo;s unproven. Working software is one thing, whether it actually helped anyone is
          another, and I don&rsquo;t like blurring the two.
        </p>
      </section>

      <section className="about__section" aria-labelledby="more-heading">
        <h2 id="more-heading">Where to look next</h2>
        <ul className="link-list">
          <li>
            <Link to="/projects">
              <span>
                <strong>Work</strong>
                <span>Four projects, each with a write-up of how it was made.</span>
              </span>
              <IconArrowRight size={16} aria-hidden="true" />
            </Link>
          </li>
          <li>
            <Link to="/writing">
              <span>
                <strong>Writing</strong>
                <span>Longer pieces in plain English.</span>
              </span>
              <IconArrowRight size={16} aria-hidden="true" />
            </Link>
          </li>
          <li>
            <a href="https://research.wasimarif.com">
              <span>
                <strong>Research</strong>
                <span>Papers, pre-registrations and data you can query in the browser.</span>
              </span>
              <IconArrowUpRight size={16} aria-hidden="true" />
            </a>
          </li>
        </ul>
      </section>

      <section className="about__section hello" aria-labelledby="contact-heading">
        <h2 id="contact-heading">Get in touch</h2>
        <p>
          Email&rsquo;s best. I&rsquo;m always up for talking about a project, a role, or anything
          you&rsquo;ve read here.
        </p>
        <a href="mailto:wasim.arif@live.co.uk" className="hello__email">
          wasim.arif@live.co.uk
        </a>
        <p className="hello__elsewhere">
          You can also find me on <a href="https://www.linkedin.com/in/wasimarif/">LinkedIn</a>,{" "}
          <a href="https://github.com/deltoidgg">GitHub</a> and{" "}
          <a href="https://bsky.app/profile/rerixo.bsky.social">Bluesky</a>.
        </p>
      </section>
    </div>
  );
}
