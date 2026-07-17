export const FPL_ORIGIN = "https://fpl.wasimarif.com";
const SITE_NAME = "FPL Lab — Wasim Arif";

interface FplMetadataInput {
  title: string;
  description: string;
  path: string;
}

interface MetaEntry {
  title?: string;
  name?: string;
  property?: string;
  content?: string;
}

export function buildFplMetadata({ title, description, path }: FplMetadataInput) {
  const resolvedTitle = title === SITE_NAME ? title : `${title} — ${SITE_NAME}`;
  const canonical = new URL(path, FPL_ORIGIN).toString();
  const meta: MetaEntry[] = [
    { title: resolvedTitle },
    { name: "description", content: description },
    { property: "og:title", content: resolvedTitle },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:url", content: canonical },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: resolvedTitle },
    { name: "twitter:description", content: description },
  ];

  return { meta, links: [{ rel: "canonical", href: canonical }] };
}
