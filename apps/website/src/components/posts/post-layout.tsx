import { useMemo, type ReactNode } from "react";
import { useActiveSection } from "ui";
import { formatPostDate, type PostMeta } from "../../content/posts";

export function PostLayout({ meta, children }: { meta: PostMeta; children: ReactNode }) {
  const sectionIds = useMemo(() => meta.sections.map((section) => section.id), [meta.sections]);
  const activeSection = useActiveSection(sectionIds);

  const articleUrl = `https://wasimarif.com/writing/${meta.slug}`;
  const encodedUrl = encodeURIComponent(articleUrl);
  const encodedTitle = encodeURIComponent(meta.title);

  return (
    <article className="page article">
      <div className="reading-progress" aria-hidden="true" />
      <header className="article__header">
        <h1>{meta.title}</h1>
        <p className="article__deck">{meta.deck}</p>
        <p className="article__byline">
          By Wasim Arif <span aria-hidden="true">·</span>{" "}
          <time dateTime={meta.date}>{formatPostDate(meta.date)}</time>{" "}
          <span aria-hidden="true">·</span> {meta.readingTime}
        </p>
      </header>

      <div className="article__layout">
        <div className="article__rail">
          <details className="article__contents-mobile">
            <summary>Contents</summary>
            <ArticleContents meta={meta} activeSection={activeSection} />
          </details>
          <nav className="article__contents" aria-label="Article contents">
            <h2>Contents</h2>
            <ArticleContents meta={meta} activeSection={activeSection} />
          </nav>
        </div>

        <div className="article__main">
          <div className="article__content">{children}</div>

          <footer className="article__footer">
            <p>
              Thanks for reading. If you&rsquo;ve got a question or spotted a mistake,{" "}
              <a href="mailto:wasim.arif@live.co.uk">email me</a>. And if it was useful, you could
              share it on{" "}
              <a href={"https://www.linkedin.com/sharing/share-offsite/?url=" + encodedUrl}>
                LinkedIn
              </a>
              ,{" "}
              <a href={"https://bsky.app/intent/compose?text=" + encodedTitle + "%20" + encodedUrl}>
                Bluesky
              </a>{" "}
              or <a href={"mailto:?subject=" + encodedTitle + "&body=" + encodedUrl}>by email</a>.
            </p>
          </footer>
        </div>
      </div>
    </article>
  );
}

function ArticleContents({ meta, activeSection }: { meta: PostMeta; activeSection: string }) {
  return (
    <ol className="toc">
      {meta.sections.map((section) => (
        <li key={section.id}>
          <a
            href={"#" + section.id}
            aria-current={activeSection === section.id ? "location" : undefined}
          >
            {section.label}
          </a>
        </li>
      ))}
    </ol>
  );
}
