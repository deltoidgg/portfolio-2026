import geistLatin from "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url";
import serifLatin from "@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2?url";
import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/react-router";
import { Analytics } from "@vercel/analytics/react";
import type { ReactNode } from "react";
import { themeScript } from "ui";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Wasim Arif Research" },
      { name: "theme-color", content: "#101112", media: "(prefers-color-scheme: dark)" },
      { name: "theme-color", content: "#f6f3ec", media: "(prefers-color-scheme: light)" },
      {
        name: "description",
        content:
          "Pre-registered research on design systems and web accessibility by Wasim Arif, with open data, code and in-browser data explorers.",
      },
    ],
    links: [
      {
        rel: "preload",
        href: serifLatin,
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
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundPage,
  errorComponent: ({ reset }) => <ErrorPage reset={reset} />,
});

function NotFoundPage() {
  return (
    <div className="page message-page">
      <h1>Page not found</h1>
      <p>
        There is nothing at this address. The published paper, its supporting documents and the
        datasets are all linked from the research index.
      </p>
      <Link to="/" className="button button--primary">
        Go to the research index
      </Link>
    </div>
  );
}

function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="page message-page" role="alert">
      <h1>This page didn&rsquo;t load</h1>
      <p>Please try again. The data downloads remain available from the research index.</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="button button--primary">
          Try again
        </button>
        <Link to="/" className="button">
          Go to the research index
        </Link>
      </div>
    </div>
  );
}

function RootComponent() {
  return (
    <RootDocument>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main id="main" className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <HeadContent />
      </head>
      <body className="antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-surface-raised focus:text-ink focus:px-3 focus:py-2 focus:rounded focus:outline-2 focus:outline-accent"
        >
          Skip to content
        </a>
        {children}
        <Analytics />
        <Scripts />
      </body>
    </html>
  );
}
