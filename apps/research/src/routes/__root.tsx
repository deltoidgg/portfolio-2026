import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/react-router";
import { Analytics } from "@vercel/analytics/react";
import type { ReactNode } from "react";
import { themeScript } from "ui";
import { SiteHeader } from "../components/site-header";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Research — Wasim Arif" },
      { name: "theme-color", content: "#000000", media: "(prefers-color-scheme: dark)" },
      { name: "theme-color", content: "#ffffff", media: "(prefers-color-scheme: light)" },
      {
        name: "description",
        content:
          "Open, pre-registered research on design systems and accessibility, with versioned artifacts and interactive data explorers. By software engineer Wasim Arif.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundPage,
  errorComponent: ({ reset }) => <ErrorPage reset={reset} />,
});

function NotFoundPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24 sm:px-8">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-accent-ink">404</p>
      <h1 className="mb-4 text-3xl font-semibold tracking-tight text-ink">
        Research page not found
      </h1>
      <p className="mb-7 leading-relaxed text-ink-muted">
        Browse the published paper, frozen artifacts, and interactive datasets from the research
        index.
      </p>
      <Link
        to="/"
        className="inline-flex min-h-10 items-center font-medium text-ink underline underline-offset-4"
      >
        Return to research
      </Link>
    </div>
  );
}

function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24 sm:px-8" role="alert">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-danger">Error</p>
      <h1 className="mb-4 text-3xl font-semibold tracking-tight text-ink">
        The research page did not load
      </h1>
      <p className="mb-7 leading-relaxed text-ink-muted">
        Try again. Published downloads remain linked from the research index.
      </p>
      <div className="flex flex-wrap gap-5">
        <button
          type="button"
          onClick={reset}
          className="min-h-10 rounded-md bg-ink px-4 py-2 font-medium text-canvas"
        >
          Try again
        </button>
        <Link
          to="/"
          className="inline-flex min-h-10 items-center font-medium text-ink underline underline-offset-4"
        >
          Return to research
        </Link>
      </div>
    </div>
  );
}

function RootComponent() {
  return (
    <RootDocument>
      <SiteHeader />
      <main id="main">
        <Outlet />
      </main>
      <footer className="border-t border-edge">
        <div className="mx-auto max-w-5xl px-6 py-8 text-xs leading-relaxed text-ink-subtle sm:px-8">
          <p>
            Every figure traces to a versioned data artifact and a committed transform script.{" "}
            <a
              href="https://github.com/deltoidgg/portfolio-2026"
              className="underline underline-offset-2 hover:text-ink-muted transition-colors"
            >
              Source on GitHub
            </a>
          </p>
        </div>
      </footer>
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <HeadContent />
      </head>
      <body className="antialiased min-h-screen bg-canvas text-ink">
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
