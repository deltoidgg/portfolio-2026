import {
  IconBrandBluesky,
  IconBrandGithub,
  IconBrandLinkedin,
  IconBrandX,
  IconMail,
} from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge, StatusDot } from "ui";
import { posts } from "../content/posts";

export const Route = createFileRoute("/")({
  component: Home,
});

const socials = [
  { label: "GitHub", href: "https://github.com/deltoidgg", Icon: IconBrandGithub },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/wasimarif/", Icon: IconBrandLinkedin },
  { label: "X", href: "https://x.com/xwasim", Icon: IconBrandX },
  { label: "Bluesky", href: "https://bsky.app/profile/rerixo.bsky.social", Icon: IconBrandBluesky },
  { label: "Email", href: "mailto:wasim.arif@live.co.uk", Icon: IconMail },
];

function Home() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-20 sm:px-8 sm:py-24">
      {/* Hero */}
      <header className="mb-20">
        <div className="mb-16 flex justify-center">
          <div
            className="gradient mask w-[120px] h-[72px]"
            role="img"
            aria-label="Wasim Arif Logo"
          />
        </div>

        <h1 className="text-lg font-medium mb-2 text-ink">Wasim Arif</h1>
        <p className="text-ink-muted leading-relaxed text-base mb-6">
          I'm a design engineer in London, working across TypeScript, React, interaction design,
          accessibility, and data visualisation. I care most about the part where design meets code:
          keeping animations at 60fps, making interfaces everyone can use, and measuring whether any
          of it works.
        </p>

        <div className="flex gap-6">
          {socials.map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="text-ink-muted hover:text-ink transition-colors duration-200"
              title={label}
            >
              <Icon size={20} />
            </a>
          ))}
        </div>
      </header>

      {/* Projects */}
      <section className="mb-20">
        <h2 className="text-lg font-medium mb-8 text-ink">Projects</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-medium mb-2 flex items-center gap-2">
              <StatusDot tone="live" className="mr-2" />
              <a
                href="https://mockpit.wasimarif.com"
                className="hover:text-ink-muted transition-colors duration-200"
              >
                MockPit
              </a>
              <Badge tone="accent">Open source</Badge>
            </h3>
            <p className="text-ink-muted text-sm leading-relaxed">
              Runtime devtools built around prototype-driven development. MockPit tracks where every
              value on screen comes from, whether that's a live API, a mock, a fallback, hardcoded
              copy, or AI-generated content, so teams working with AI-assisted workflows can stay
              honest about what's real enough to ship.
            </p>
          </div>

          <div>
            <h3 className="text-base font-medium mb-2 flex items-center gap-2">
              <StatusDot tone="live" className="mr-2" />
              <a
                href="https://rewriter.wasimarif.com"
                className="hover:text-ink-muted transition-colors duration-200"
              >
                Rewriter
              </a>
            </h3>
            <p className="text-ink-muted text-sm leading-relaxed">
              Ever wished you could adjust a book's complexity on the fly? Rewriter uses LLMs to
              rewrite literature for any reading level, with realistic text-to-speech on top. Handy
              for parents who want to share the classics with their kids, or anyone who wants a
              gentler way into a difficult book.
            </p>
          </div>

          <div>
            <h3 className="text-base font-medium mb-2 flex items-center gap-2">
              <StatusDot tone="live" className="mr-2" />
              <Link to="/openfgc" className="hover:text-ink-muted transition-colors duration-200">
                OpenFGC
              </Link>
            </h3>
            <p className="text-ink-muted text-sm leading-relaxed">
              When the pandemic pushed esports online, smaller tournament organisers lost the data
              insights the big leagues take for granted. OpenFGC pulls fragmented player metrics
              from multiple APIs into clean dashboards organisers can actually use for event
              planning and sponsor conversations.
            </p>
          </div>
        </div>
      </section>

      {/* Research */}
      <section className="mb-20">
        <h2 className="text-lg font-medium mb-8 text-ink">Research</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-medium mb-2 flex items-center gap-2">
              <StatusDot tone="live" className="mr-2" />
              <a
                href="https://research.wasimarif.com"
                className="hover:text-ink-muted transition-colors duration-200"
              >
                Research Lab
              </a>
              <Badge tone="accent">Open data</Badge>
            </h3>
            <p className="text-ink-muted text-sm leading-relaxed mb-3">
              I run open, pre-registered research on how design systems, accessibility, and AI
              coding agents shape the quality of the web. Hypotheses get locked before any
              estimation runs, every figure traces back to a versioned data artifact, and you can
              explore every dataset in your browser.
            </p>
            <p className="text-ink-muted text-sm leading-relaxed">
              The first study is published:{" "}
              <a
                href="https://research.wasimarif.com/papers/design-systems-accessibility"
                className="text-ink hover:text-accent-ink transition-colors duration-200 underline underline-offset-2"
              >
                Do design systems deliver accessibility at scale?
              </a>{" "}
              Across 12,252 US federal websites, sites with strong design system adoption show about
              half the detected accessibility violations. The same locked model then replicated on
              6,295 UK public sector sites scanned for the paper. There's a{" "}
              <Link
                to="/writing/$slug"
                params={{ slug: "design-systems-accessibility" }}
                className="text-ink hover:text-accent-ink transition-colors duration-200 underline underline-offset-2"
              >
                plain English version
              </Link>{" "}
              on the blog too.
            </p>
          </div>
        </div>
      </section>

      {/* Writing */}
      <section className="mb-20">
        <h2 className="text-lg font-medium mb-8 text-ink">Writing</h2>
        <div className="space-y-6">
          {posts.map((post) => (
            <div key={post.slug}>
              <h3 className="text-base font-medium mb-2">
                <Link
                  to="/writing/$slug"
                  params={{ slug: post.slug }}
                  className="hover:text-ink-muted transition-colors duration-200"
                >
                  {post.title}
                </Link>
              </h3>
              <p className="text-ink-muted text-sm leading-relaxed">{post.deck}</p>
            </div>
          ))}
          <p className="text-sm">
            <Link
              to="/writing"
              className="text-ink-muted hover:text-ink transition-colors duration-200 underline underline-offset-2"
            >
              All writing
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
