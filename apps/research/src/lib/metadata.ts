export const RESEARCH_ORIGIN = "https://research.wasimarif.com";
const SITE_NAME = "Research — Wasim Arif";

interface ResearchMetadataInput {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
}

interface MetaEntry {
  title?: string;
  name?: string;
  property?: string;
  content?: string;
}

export function buildResearchMetadata({
  title,
  description,
  path,
  image = "/social/research.png",
  type = "website",
  publishedTime,
}: ResearchMetadataInput) {
  const resolvedTitle = title === SITE_NAME ? title : `${title} — ${SITE_NAME}`;
  const canonical = new URL(path, RESEARCH_ORIGIN).toString();
  const socialImage = new URL(image, RESEARCH_ORIGIN).toString();
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

  return { meta, links: [{ rel: "canonical", href: canonical }] };
}
