import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { Analytics } from "@vercel/analytics/react";
import type { ReactNode } from "react";
import { SiteHeader } from "../components/site-header";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Research — Wasim Arif" },
      {
        name: "description",
        content:
          "Open, pre-registered research on design systems, accessibility, and AI coding agents — with interactive data explorers. By Wasim Arif, London-based design engineer.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <SiteHeader />
      <main id="main">
        <Outlet />
      </main>
      <footer className="border-t border-edge">
        <div className="max-w-3xl mx-auto px-6 sm:px-8 py-8 text-xs text-ink-subtle leading-relaxed">
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
    <html lang="en">
      <head>
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
