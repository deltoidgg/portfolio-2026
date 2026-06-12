import {
  IconBrandBluesky,
  IconBrandGithub,
  IconBrandLinkedin,
  IconBrandX,
  IconMail,
} from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge, StatusDot } from "ui";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-6 py-20 sm:px-8 sm:py-24">
        {/* Header */}
        <header className="mb-20">
          {/* Logo */}
          <div className="mb-16 flex justify-center">
            <div
              className="gradient mask w-[120px] h-[72px]"
              role="img"
              aria-label="Wasim Arif Logo"
            />
          </div>

          <h1 className="text-lg font-medium mb-2 text-white">Wasim Arif</h1>
          <p className="text-gray-400 leading-relaxed text-base mb-6">
            London based design engineer, specialising in TypeScript, React, interaction design,
            accessibility, and data visualisation. I am passionate about putting the user first in
            both my design and development approaches, which is why I can often be found chasing
            60fps animations, diving into analytics/performance tools, or experimenting with the
            latest libraries and browser features.
          </p>

          <div className="flex gap-6">
            <a
              href="https://github.com/deltoidgg"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors duration-200"
              title="GitHub"
            >
              <IconBrandGithub size={20} />
            </a>
            <a
              href="https://www.linkedin.com/in/wasimarif/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors duration-200"
              title="LinkedIn"
            >
              <IconBrandLinkedin size={20} />
            </a>
            <a
              href="https://x.com/xwasim"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors duration-200"
              title="X"
            >
              <IconBrandX size={20} />
            </a>
            <a
              href="https://bsky.app/profile/rerixo.bsky.social"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors duration-200"
              title="Bluesky"
            >
              <IconBrandBluesky size={20} />
            </a>
            <a
              href="mailto:wasim.arif@live.co.uk"
              className="text-gray-400 hover:text-white transition-colors duration-200"
              title="Email"
            >
              <IconMail size={20} />
            </a>
          </div>
        </header>

        {/* Work Section */}
        <section className="mb-20">
          <h2 className="text-lg font-medium mb-8 text-white">Projects</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-medium mb-2 flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 animate-pulse animation-duration-5000"
                  title="Live"
                ></div>
                <a
                  href="https://mockpit.wasimarif.com"
                  className="hover:text-gray-300 transition-colors duration-200 cursor-pointer"
                >
                  MockPit
                </a>
                <a
                  href="https://mockpit.wasimarif.com"
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors duration-200 no-underline"
                >
                  Open Source
                </a>
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Built around the idea of prototype-driven development, MockPit is a set of runtime
                devtools that track where every value on screen actually comes from: live APIs,
                mocks, fallbacks, hardcoded copy, or AI-generated content. It helps teams working
                with modern AI-assisted workflows stay honest about what is real enough to ship.
              </p>
            </div>

            {/* <div>
              <h3 className="text-base font-medium mb-2 flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-2 animate-pulse animation-duration-5000"
                  title="Work in Progress"
                ></div>
                <a
                  href="https://schools.wasimarif.com"
                  className="text-gray-400 hover:text-gray-300 transition-colors duration-200 cursor-pointer"
                >
                  School Analyser 🚧 Under Construction
                </a>
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                An AI agent system that analyses UK school quality by
                processing Ofsted reports and survey data. It provides
                comprehensive school assessments beyond traditional metrics,
                helping parents make informed decisions and enabling early
                identification of performance trends.
              </p>
            </div> */}

            <div>
              <h3 className="text-base font-medium mb-2 flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 animate-pulse animation-duration-5000"
                  title="Live"
                ></div>
                <a
                  href="https://rewriter.wasimarif.com"
                  className="hover:text-gray-300 transition-colors duration-200 cursor-pointer"
                >
                  Rewriter
                </a>
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Ever wished you could adjust a book&apos;s complexity on the fly? I created a
                platform that does exactly that using LLMs to rewrite literature for any reading
                level, complete with realistic text-to-speech. Perfect for parents wanting to share
                classics with their children, or anyone looking to make timeless stories more
                accessible.
              </p>
            </div>

            <div>
              <h3 className="text-base font-medium mb-2 flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 animate-pulse animation-duration-5000"
                  title="Live"
                ></div>
                <Link
                  to="/openfgc"
                  className="hover:text-gray-300 transition-colors duration-200 cursor-pointer"
                >
                  OpenFGC
                </Link>
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                When the pandemic forced esports online, smaller tournament organisers lost access
                to the data insights that major leagues take for granted. I built a data aggregation
                platform that unifies fragmented player metrics from multiple APIs into clean
                analytics dashboards, turning fragmented player data into actionable insights for
                event planning and sponsor presentations.
              </p>
            </div>
          </div>
        </section>

        {/* Research Section */}
        <section className="mb-20">
          <h2 className="text-lg font-medium mb-8 text-white">Research</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-medium mb-2 flex items-center gap-2">
                <StatusDot tone="live" className="mr-2" />
                <a
                  href="https://research.wasimarif.com"
                  className="hover:text-gray-300 transition-colors duration-200 cursor-pointer"
                >
                  Research Lab
                </a>
                <Badge tone="accent">Open data</Badge>
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-3">
                Open, pre-registered research on how design systems, accessibility, and AI coding
                agents shape the quality of the web — with every dataset explorable in the browser.
                Hypotheses are locked before estimation and every figure traces to a versioned data
                artifact.
              </p>
              <p className="text-gray-400 text-sm leading-relaxed">
                First study, published:{" "}
                <a
                  href="https://research.wasimarif.com/papers/design-systems-accessibility"
                  className="text-gray-300 hover:text-white transition-colors duration-200 underline underline-offset-2"
                >
                  Do design systems deliver accessibility at scale?
                </a>{" "}
                — across 12,252 US federal websites, strong design-system adoption predicts ~50%
                fewer detected accessibility violations; the pre-registered specification then
                replicated on 6,295 UK public-sector sites scanned for the paper (IRR 0.56 vs 0.50,
                within the locked ±0.20 window).
              </p>
            </div>
          </div>
        </section>

        {/* Writing Section */}
        <section className="mb-20">
          <h2 className="text-lg font-medium mb-8 text-white">Writing</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-medium mb-2">
                <a
                  href="#"
                  className="hover:text-gray-300 transition-colors duration-200 cursor-pointer"
                >
                  How to sync design tokens between Figma and your React app
                </a>
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Tired of manually copying spacing values and hex codes from Figma to your code?
                Learn how to automate design token sync and eliminate the frustrating
                inconsistencies between design and development.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
