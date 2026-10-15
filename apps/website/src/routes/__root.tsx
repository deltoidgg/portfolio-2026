import geistLatin from "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url";
import serifLatin from "@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2?url";
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
  jobTitle: "Product and design engineer",
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
      { name: "theme-color", content: "#101112", media: "(prefers-color-scheme: dark)" },
      { name: "theme-color", content: "#f6f3ec", media: "(prefers-color-scheme: light)" },
      {
        name: "description",
        content:
          "Wasim Arif is a product and design engineer in London. Projects, writing and research.",
      },
    ],
    links: [
      // the hero and body text use these two files, so fetch them alongside the CSS
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
      {
        rel: "alternate",
        type: "application/rss+xml",
        title: "Writing by Wasim Arif",
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
    <div className="page message-page">
      <h1>Nothing here</h1>
      <p>
        That page doesn&rsquo;t exist, or it moved. Sorry about that. The homepage is a good place
        to start again.
      </p>
      <Link to="/" className="button button--primary">
        Go to the homepage
      </Link>
    </div>
  );
}

function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="page message-page" role="alert">
      <h1>Something went wrong</h1>
      <p>This page didn&rsquo;t load properly. Trying again usually sorts it out.</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="button button--primary">
          Try again
        </button>
        <Link to="/" className="button">
          Go to the homepage
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
    <html lang="en-GB" suppressHydrationWarning>
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
        <div className="flex min-h-screen flex-col">
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
