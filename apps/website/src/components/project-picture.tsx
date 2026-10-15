import type { CSSProperties } from "react";
import type { ProjectImage } from "../content/projects";

function srcSet(image: ProjectImage, format: "avif" | "webp") {
  return image.widths.map((width) => `${image.src}-${width}.${format} ${width}w`).join(", ");
}

/**
 * Pairs a screenshot frame with the same frame on another page, so route changes can morph
 * from a project card into the case study cover. Applied to the rounded frame rather than the
 * image so the corners stay clipped during the transition.
 */
export function projectTransition(slug: string): CSSProperties {
  return { viewTransitionName: `project-${slug}` };
}

/**
 * A responsive screenshot. `sizes` should describe the rendered width so the browser can pick
 * the smallest variant that stays sharp.
 */
export function ProjectPicture({
  image,
  sizes,
  priority = false,
}: {
  image: ProjectImage;
  sizes: string;
  priority?: boolean;
}) {
  const fallbackWidth = image.widths.find((width) => width >= 1280) ?? image.widths.at(-1);

  return (
    <picture>
      <source type="image/avif" srcSet={srcSet(image, "avif")} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(image, "webp")} sizes={sizes} />
      <img
        src={`${image.src}-${fallbackWidth}.webp`}
        alt={image.alt}
        width={image.width}
        height={image.height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding={priority ? undefined : "async"}
      />
    </picture>
  );
}
