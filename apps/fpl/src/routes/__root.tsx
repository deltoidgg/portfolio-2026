import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { Analytics } from "@vercel/analytics/react";
import type { ReactNode } from "react";
import barlowLatin from "@fontsource/barlow-condensed/files/barlow-condensed-latin-600-normal.woff2?url";
import geistLatin from "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url";
import { defaultOpportunitySearch } from "../lib/opportunity-search.ts";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FPL Lab by Wasim Arif" },
      {
        name: "description",
        content:
          "Fantasy Premier League tools built on betting odds and forecast ranges: a squad builder, an opportunity map and a deadline replay.",
      },
      { name: "theme-color", content: "#071018" },
    ],
    links: [
      // headings use Barlow Condensed and everything else uses Geist, so fetch both with the CSS
      {
        rel: "preload",
        href: barlowLatin,
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: geistLatin,
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundPage,
  errorComponent: ({ reset }) => <ErrorPage reset={reset} />,
});

function NotFoundPage() {
  return (
    <div className="fpl-message">
      <h1>Page not found</h1>
      <p>There’s nothing at this address. The squad lab is a good place to start.</p>
      <Link to="/squad" search={{ horizon: 3, dataset: "current" }}>
        Open the squad lab
      </Link>
    </div>
  );
}

function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="fpl-message" role="alert">
      <h1>The latest forecast isn’t ready</h1>
      <p>
        The lab won’t swap in estimated pre-season numbers for the real thing. Try again in a
        moment, or check back once the next verified 2026/27 snapshot has been published.
      </p>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}

function RootComponent() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <RootDocument>
      <header className="fpl-site-header">
        <nav aria-label="Primary">
          <Link
            to="/squad"
            search={{ horizon: 3, dataset: "current" }}
            aria-label="FPL Lab home"
            className="fpl-wordmark"
          >
            WA <span>/ FPL Lab</span>
          </Link>
          <div>
            <Link
              to="/squad"
              search={{ horizon: 3, dataset: "current" }}
              activeProps={{ "aria-current": "page" }}
            >
              Squad lab
            </Link>
            <a
              href={`/opportunities?${new URLSearchParams(
                Object.entries(defaultOpportunitySearch).map(([key, value]) => [
                  key,
                  String(value),
                ]),
              ).toString()}`}
              aria-current={pathname === "/opportunities" ? "page" : undefined}
            >
              Opportunity map
            </a>
            <Link to="/archive/2025-26/gw34" activeProps={{ "aria-current": "page" }}>
              Archive
            </Link>
            <a href="https://research.wasimarif.com">Research</a>
            <a href="https://wasimarif.com">Portfolio</a>
          </div>
        </nav>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer className="fpl-site-footer">
        <span>Experimental forecasts, not betting advice.</span>
        <div>
          <a href="https://research.wasimarif.com">Research</a>
          <a href="https://wasimarif.com">Portfolio</a>
          <a href="https://github.com/deltoidgg/portfolio-2026">Source on GitHub</a>
        </div>
      </footer>
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <a className="fpl-skip-link" href="#main">
          Skip to content
        </a>
        {children}
        <Analytics />
        <Scripts />
      </body>
    </html>
  );
}
