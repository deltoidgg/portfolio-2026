import {
  IconArrowRight,
  IconBrandLinkedin,
  IconBrandX,
  IconFileText,
  IconFlask,
  IconMail,
} from "@tabler/icons-react";
import { useEffect, useState, type ReactNode } from "react";
import { formatPostDate, type PostMeta } from "../../content/posts";

const articleUrl = "https://wasimarif.com/writing/design-systems-accessibility";

export function PostLayout({ meta, children }: { meta: PostMeta; children: ReactNode }) {
  const [activeSection, setActiveSection] = useState(meta.sections[0]?.id ?? "");

  useEffect(() => {
    const nodes = meta.sections
      .map((section) => document.getElementById(section.id))
      .filter((node): node is HTMLElement => Boolean(node));
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActiveSection(visible.target.id);
      },
      { rootMargin: "-18% 0px -68% 0px", threshold: [0, 1] },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [meta.sections]);

  const encodedUrl = encodeURIComponent(articleUrl);
  const encodedTitle = encodeURIComponent(meta.title);

  return (
    <article className="article-page mx-auto max-w-[var(--ui-shell-width)] px-5 pb-4 pt-10 sm:px-8 lg:px-[var(--ui-shell-gutter)] lg:pt-16">
      <div className="article-layout">
        <aside className="article-rail" aria-label="Article navigation and sharing">
          <details className="article-mobile-contents">
            <summary>On this page</summary>
            <ArticleContents meta={meta} activeSection={activeSection} />
          </details>
          <div className="article-desktop-contents">
            <p className="section-kicker">On this page</p>
            <ArticleContents meta={meta} activeSection={activeSection} />
            <div className="article-share">
              <p className="section-kicker">Share this article</p>
              <div className="flex items-center gap-4">
                <a
                  href={"https://www.linkedin.com/sharing/share-offsite/?url=" + encodedUrl}
                  aria-label="Share on LinkedIn"
                  className="text-ink-subtle transition-colors hover:text-ink"
                >
                  <IconBrandLinkedin size={17} aria-hidden="true" />
                </a>
                <a
                  href={"https://x.com/intent/post?url=" + encodedUrl + "&text=" + encodedTitle}
                  aria-label="Share on X"
                  className="text-ink-subtle transition-colors hover:text-ink"
                >
                  <IconBrandX size={17} aria-hidden="true" />
                </a>
                <a
                  href={"mailto:?subject=" + encodedTitle + "&body=" + encodedUrl}
                  aria-label="Share by email"
                  className="text-ink-subtle transition-colors hover:text-ink"
                >
                  <IconMail size={17} aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </aside>

        <div className="article-main">
          <header className="article-hero">
            <div className="mb-5 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.13em] text-ink-subtle">
              <span className="text-accent-ink">{meta.category}</span>
              <span aria-hidden="true">|</span>
              <time dateTime={meta.date}>{formatPostDate(meta.date)}</time>
              <span aria-hidden="true">|</span>
              <span>{meta.readingTime}</span>
            </div>
            <h1>{meta.title}</h1>
            <p className="article-deck">{meta.deck}</p>
            <div className="article-author">
              <span className="article-author__mark" aria-hidden="true">
                WA
              </span>
              <span>
                <strong>Wasim Arif</strong>
                <small>Product &amp; Design Engineer</small>
              </span>
              <a href="https://www.linkedin.com/in/wasimarif/" aria-label="Wasim Arif on LinkedIn">
                <IconBrandLinkedin size={14} aria-hidden="true" />
              </a>
            </div>
          </header>

          <div className="article-content">{children}</div>

          <section className="article-explore" aria-labelledby="article-explore-heading">
            <h2 id="article-explore-heading" className="font-display text-3xl text-ink">
              Explore more
            </h2>
            <div className="article-explore__grid">
              <a href="https://research.wasimarif.com/papers/design-systems-accessibility">
                <IconFileText size={22} aria-hidden="true" />
                <span>
                  <strong>Read the paper</strong>
                  <small>Full study, methodology, results, and appendices.</small>
                </span>
                <IconArrowRight size={15} aria-hidden="true" />
              </a>
              <a href="https://research.wasimarif.com">
                <IconFlask size={22} aria-hidden="true" />
                <span>
                  <strong>Research Lab</strong>
                  <small>More studies on design systems, evidence, and outcomes.</small>
                </span>
                <IconArrowRight size={15} aria-hidden="true" />
              </a>
            </div>
          </section>
        </div>

        <aside className="article-pullquote" aria-label="Key quotation">
          <span aria-hidden="true">“</span>
          <blockquote>Consistency is only valuable if it raises the floor for everyone.</blockquote>
          <p>— Wasim Arif</p>
        </aside>
      </div>
    </article>
  );
}

function ArticleContents({ meta, activeSection }: { meta: PostMeta; activeSection: string }) {
  return (
    <ol className="article-toc">
      {meta.sections.map((section) => (
        <li key={section.id}>
          <a
            href={"#" + section.id}
            aria-current={activeSection === section.id ? "location" : undefined}
          >
            <span aria-hidden="true" />
            {section.label}
          </a>
        </li>
      ))}
    </ol>
  );
}
