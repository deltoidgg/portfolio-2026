import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/react-router";
import { Analytics } from "@vercel/analytics/react";
import type { ReactNode } from "react";
import { themeScript } from "ui";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import appCss from "../styles.css?url";

const personJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Wasim Arif",
  url: "https://wasimarif.com",
  jobTitle: "Software engineer",
  address: { "@type": "PostalAddress", addressLocality: "London", addressCountry: "GB" },
  sameAs: [
    "https://github.com/deltoidgg",
    "https://www.linkedin.com/in/wasimarif/",
    "https://bsky.app/profile/rerixo.bsky.social",
  ],
});

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Wasim Arif" },
      { name: "theme-color", content: "#020810", media: "(prefers-color-scheme: dark)" },
      { name: "theme-color", content: "#f5f2ea", media: "(prefers-color-scheme: light)" },
      {
        name: "description",
        content:
          "London-based software engineer working across product and design engineering, from AI services and developer tooling to accessible interfaces, data visualisation, and open research.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", href: "/favicon.ico" },
      {
        rel: "alternate",
        type: "application/rss+xml",
        title: "Wasim Arif — Writing",
        href: "/rss.xml",
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundPage,
  errorComponent: ({ reset }) => <ErrorPage reset={reset} />,
});

function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 sm:px-8">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-accent-ink">404</p>
      <h1 className="mb-4 text-3xl font-semibold tracking-tight text-ink">Page not found</h1>
      <p className="mb-7 leading-relaxed text-ink-muted">
        The address may have changed, or the page may never have existed.
      </p>
      <Link
        to="/"
        className="inline-flex min-h-10 items-center font-medium text-ink underline underline-offset-4"
      >
        Return home
      </Link>
    </div>
  );
}

function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 sm:px-8" role="alert">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-danger">Error</p>
      <h1 className="mb-4 text-3xl font-semibold tracking-tight text-ink">
        This page did not load
      </h1>
      <p className="mb-7 leading-relaxed text-ink-muted">
        Try the request again. If it keeps failing, the homepage remains available.
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
          Return home
        </Link>
      </div>
    </div>
  );
}

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: personJsonLd }} />
        <HeadContent />
      </head>
      <body className="antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-ink focus:outline-2 focus:outline-accent"
        >
          Skip to content
        </a>
        <div className="min-h-screen flex flex-col">
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </div>
        <Analytics />
        <Scripts />
      </body>
    </html>
  );
}
