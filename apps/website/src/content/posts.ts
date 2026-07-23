export interface PostMeta {
  slug: string;
  title: string;
  /** One-or-two sentence standfirst shown on the index and in meta tags. */
  deck: string;
  /** ISO date of publication. */
  date: string;
  readingTime: string;
  tags: string[];
  category: string;
  sections: Array<{ id: string; label: string }>;
  /** Pin to the top and feature on the homepage. */
  featured?: boolean;
}

export const posts: PostMeta[] = [
  {
    slug: "design-systems-accessibility",
    title: "Do design systems actually deliver on accessibility?",
    deck: "I tested the claim on 18,500 government websites in two countries. Sites built on a design system showed about half the accessibility violations, and the result survived every attempt I made to break it.",
    date: "2026-06-12",
    readingTime: "9 min read",
    tags: ["accessibility", "design systems", "data"],
    category: "Research",
    sections: [
      { id: "what-i-measured", label: "What I measured" },
      { id: "the-result", label: "The result" },
      { id: "better-teams", label: "Could it be better teams?" },
      { id: "replication", label: "Replication" },
      { id: "what-failed", label: "What did not replicate" },
      { id: "engineering-takeaways", label: "Engineering takeaways" },
      { id: "dig-deeper", label: "Dig deeper" },
    ],
  },
];

/** Newest first, used by the writing index page. */
export const sortedPosts: PostMeta[] = [...posts].sort((a, b) => b.date.localeCompare(a.date));

export function postBySlug(slug: string): PostMeta | undefined {
  return posts.find((post) => post.slug === slug);
}

/** The pinned post, falling back to the most recent one. */
export function featuredPost(): PostMeta | undefined {
  return posts.find((post) => post.featured) ?? sortedPosts[0];
}

export function formatPostDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
