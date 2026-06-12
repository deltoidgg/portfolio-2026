import { createFileRoute, Link } from "@tanstack/react-router";
import breakdownImage from "../assets/openfgc/breakdown.png";
import profileImage from "../assets/openfgc/profile.png";
import replayImage from "../assets/openfgc/replay.png";
import websiteImage from "../assets/openfgc/website.png";

export const Route = createFileRoute("/openfgc")({
  component: OpenFGC,
});

function OpenFGC() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-6 pt-20 sm:px-8 sm:pt-32">
        {/* Navigation */}
        <nav className="mb-16">
          <Link
            to="/"
            className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
          >
            ← Back to portfolio
          </Link>
        </nav>

        {/* Header */}
        <header className="mb-16">
          <h1 className="text-4xl sm:text-5xl font-light mb-4 tracking-tight">OpenFGC</h1>
          <p className="text-xl text-gray-400 font-light mb-6">
            Data Analysis Platform for Esports Organisations
          </p>
          <div className="flex gap-4 text-sm text-gray-500">
            <span>2020</span>
            <span>•</span>
            <span>Design, MVP Development</span>
            <span>•</span>
            <a
              href="https://openfgc.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              View live site ↗
            </a>
          </div>
        </header>
      </div>

      {/* Hero Image - Full width */}
      <section className="mb-16 px-6 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900">
            <img
              src={websiteImage}
              alt="OpenFGC Website"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-contain"
            />
          </div>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-6 sm:px-8">
        {/* Project Overview */}
        <section className="mb-16">
          <h2 className="text-lg font-medium mb-6 text-white">Overview</h2>
          <p className="text-gray-400 leading-relaxed mb-4">
            The esports industry&apos;s data is heavily fragmented, making it difficult for smaller
            teams and organisations to gain insights on their performance. OpenFGC is a project to
            present data analysis for these smaller organisations.
          </p>
          <p className="text-gray-400 leading-relaxed">
            Over the course of the pandemic, esport event organisers were forced to shift their
            events from offline to online, creating an entirely different set of organisational
            problems and changing how event success is measured and analysed.
          </p>
        </section>

        {/* Challenge */}
        <section className="mb-16">
          <h2 className="text-lg font-medium mb-6 text-white">Challenge</h2>
          <p className="text-gray-400 leading-relaxed mb-4">
            The shift online meant further reliance on appealing to advertisers and sponsors,
            requiring precise data from multiple different platforms. Event organisers needed a way
            to collate this fragmented data in a format appealing for the presentation of KPIs.
          </p>
          <p className="text-gray-400 leading-relaxed">
            After thorough research, it became clear that player popularity was a key metric - event
            success was highly variable, but having popular players compete reliably brought in
            viewership.
          </p>
        </section>
      </div>

      {/* Profile Image - Full width */}
      <section className="mb-16 px-6 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900">
            <img
              src={profileImage}
              alt="OpenFGC Player Profile View"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-contain"
            />
          </div>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-6 sm:px-8">
        {/* Solution */}
        <section className="mb-16">
          <h2 className="text-lg font-medium mb-6 text-white">Solution</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-medium mb-2 text-gray-300">Data Unification</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Created a platform to collate fragmented esports data from multiple sources into a
                unified dashboard for KPI presentation to sponsors and advertisers.
              </p>
            </div>

            <div>
              <h3 className="text-base font-medium mb-2 text-gray-300">Dual Product Approach</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Separated the product into a simplified summary page and a deeper insights section.
                The summary page cuts out everything not absolutely vital to avoid overwhelming
                users.
              </p>
            </div>

            <div>
              <h3 className="text-base font-medium mb-2 text-gray-300">Player Analytics</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Integrated player popularity metrics alongside traditional performance data to help
                organisers make informed decisions about event planning and participant selection.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Data Breakdown Image - Full width */}
      <section className="mb-16 px-6 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900">
            <img
              src={breakdownImage}
              alt="Data Breakdown Analysis View"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-contain"
            />
          </div>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-6 sm:px-8">
        {/* Key Features */}
        <section className="mb-16">
          <h2 className="text-lg font-medium mb-6 text-white">Key Features</h2>
          <div className="space-y-4">
            <div className="border-l-2 border-gray-800 pl-4">
              <h3 className="text-sm font-medium mb-1 text-gray-300">Data Dashboard</h3>
              <p className="text-gray-400 text-sm">
                Unified view of esports performance metrics across multiple platforms.
              </p>
            </div>

            <div className="border-l-2 border-gray-800 pl-4">
              <h3 className="text-sm font-medium mb-1 text-gray-300">Player Profiles</h3>
              <p className="text-gray-400 text-sm">
                Comprehensive player analytics including popularity metrics and performance data.
              </p>
            </div>

            <div className="border-l-2 border-gray-800 pl-4">
              <h3 className="text-sm font-medium mb-1 text-gray-300">Event Analysis</h3>
              <p className="text-gray-400 text-sm">
                Tools for analysing event success and predicting performance based on participant
                data.
              </p>
            </div>

            <div className="border-l-2 border-gray-800 pl-4">
              <h3 className="text-sm font-medium mb-1 text-gray-300">KPI Presentation</h3>
              <p className="text-gray-400 text-sm">
                Clean, sponsor-friendly presentation of key performance indicators.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Additional Images - Full width */}
      <section className="mb-16 px-6 sm:px-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900">
            <img
              src={replayImage}
              alt="Replay Analysis Interface"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-contain"
            />
          </div>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-6 sm:px-8">
        {/* Outcome */}
        <section className="mb-16">
          <h2 className="text-lg font-medium mb-6 text-white">Outcome</h2>
          <p className="text-gray-400 leading-relaxed mb-4">
            OpenFGC successfully addressed the need for unified esports data analysis, providing
            smaller organisations with insights previously only available to larger teams. The
            platform&apos;s focus on player popularity as a key metric proved valuable for event
            planning and sponsor presentations.
          </p>
          <p className="text-gray-400 leading-relaxed">
            The dual approach of simplified summaries and detailed analytics made complex data
            accessible to different user types, from quick decision-making to deep performance
            analysis.
          </p>
        </section>

        {/* Tech Stack */}
        <section className="mb-16">
          <h2 className="text-lg font-medium mb-6 text-white">Technology</h2>
          <div className="flex flex-wrap gap-3">
            <span className="px-3 py-1 bg-gray-900 text-gray-300 text-sm rounded">React</span>
            <span className="px-3 py-1 bg-gray-900 text-gray-300 text-sm rounded">Next.js</span>
            <span className="px-3 py-1 bg-gray-900 text-gray-300 text-sm rounded">TailwindCSS</span>
            <span className="px-3 py-1 bg-gray-900 text-gray-300 text-sm rounded">Prisma</span>
          </div>
        </section>
      </div>
    </div>
  );
}
