import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/react-router";
import { Analytics } from "@vercel/analytics/react";
import type { ReactNode } from "react";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FPL Lab — Wasim Arif" },
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
      <span>This lab is still growing. Return to the current deadline experiment.</span>
      <Link to="/">Open Deadline Intelligence</Link>
    </div>
  );
}

function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="fpl-message" role="alert">
      <p>System error / FPL Lab</p>
      <h1>The experiment did not load</h1>
      <span>The data source may be refreshing. You can retry without leaving this page.</span>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}

function RootComponent() {
  return (
    <RootDocument>
      <header className="fpl-site-header">
        <nav aria-label="Primary">
          <Link to="/" aria-label="FPL Lab home" className="fpl-wordmark">
            WA <span>/ FPL Lab</span>
          </Link>
          <div>
            <Link to="/" activeProps={{ "aria-current": "page" }}>
              Deadline room
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
