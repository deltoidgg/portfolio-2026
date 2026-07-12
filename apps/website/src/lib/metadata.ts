export const PORTFOLIO_ORIGIN = "https://wasimarif.com";
export const SITE_NAME = "Wasim Arif";

type MetadataType = "website" | "article";

interface MetadataInput {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: MetadataType;
  publishedTime?: string;
}

interface MetaEntry {
  title?: string;
  name?: string;
  property?: string;
  content?: string;
}

interface LinkEntry {
  rel: string;
  href: string;
}

export interface PageMetadata {
  meta: MetaEntry[];
  links: LinkEntry[];
}

function absoluteUrl(path: string): string {
  return new URL(path, PORTFOLIO_ORIGIN).toString();
}

export function buildMetadata({
  title,
  description,
  path,
  image = "/social/default.png",
  type = "website",
  publishedTime,
}: MetadataInput): PageMetadata {
  const canonical = absoluteUrl(path);
  const socialImage = absoluteUrl(image);
  const resolvedTitle =
    title === SITE_NAME || title.endsWith(`· ${SITE_NAME}`) ? title : `${title} · ${SITE_NAME}`;
  const meta: MetaEntry[] = [
    { title: resolvedTitle },
    { name: "description", content: description },
    { property: "og:title", content: resolvedTitle },
    { property: "og:description", content: description },
    { property: "og:type", content: type },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:url", content: canonical },
    { property: "og:image", content: socialImage },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: resolvedTitle },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: socialImage },
  ];

  if (type === "article" && publishedTime) {
    meta.push({ property: "article:published_time", content: publishedTime });
  }

  return {
    meta,
    links: [{ rel: "canonical", href: canonical }],
  };
}
