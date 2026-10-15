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
          "Interactive Fantasy Premier League experiments using market prices, probabilistic forecasts, and point-in-time data.",
      },
      { name: "theme-color", content: "#071018" },
    ],
    links: [
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
      <p>404 / FPL Lab</p>
      <h1>Experiment not found</h1>
      <span>This lab is still growing. Return to the current market experiment.</span>
      <Link to="/squad" search={{ horizon: 3, dataset: "current" }}>
        Open Squad Lab
      </Link>
    </div>
  );
}

function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="fpl-message" role="alert">
      <p>Live data unavailable / FPL Lab</p>
      <h1>No current snapshot is ready</h1>
      <span>
        The lab will not substitute estimated preseason data. Retry after the collector publishes a
        verified 2026/27 snapshot.
      </span>
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
        <a href="https://github.com/deltoidgg/portfolio-2026">Source on GitHub</a>
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
