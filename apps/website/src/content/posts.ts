export interface PostMeta {
  slug: string;
  title: string;
  /** One-or-two sentence standfirst shown on the index and in meta tags. */
  deck: string;
  /** ISO date of publication. */
  date: string;
  readingTime: string;
  tags: string[];
}

export const posts: PostMeta[] = [
  {
    slug: "design-systems-accessibility",
    title: "Do design systems actually deliver on accessibility?",
    deck: "I tested the claim on 18,500 government websites in two countries. Sites built on a design system showed about half the accessibility violations, and the result survived every attempt I made to break it.",
    date: "2026-06-12",
    readingTime: "9 min read",
    tags: ["accessibility", "design systems", "data"],
  },
];

export function postBySlug(slug: string): PostMeta | undefined {
  return posts.find((post) => post.slug === slug);
}

export function formatPostDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
