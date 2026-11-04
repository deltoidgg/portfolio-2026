import { useState, type CSSProperties, type ReactNode } from "react";
import type { ProjectImage } from "../../content/projects";
import { ProjectPicture } from "../project-picture";

const wideSizes = "(min-width: 72rem) 64rem, 100vw";

/** Two screenshots of the same screen, one over the other, with a split you drag across. */
export function CompareSlider({
  under,
  over,
  label,
  describe,
  caption,
}: {
  under: ProjectImage;
  over: ProjectImage;
  /** What the slider controls, for screen readers. */
  label: string;
  /** Reads the split out, given how much of the top image shows. */
  describe: (percent: number) => string;
  caption: ReactNode;
}) {
  const [split, setSplit] = useState(50);
  return (
    <figure className="case-figure case-figure--wide theme-compare">
      <div className="case-figure__frame theme-compare__frame">
        <ProjectPicture image={under} sizes={wideSizes} />
        <div className="theme-compare__top" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
          <ProjectPicture image={over} sizes={wideSizes} />
        </div>
        <span className="theme-compare__handle" style={{ left: `${split}%` }} aria-hidden="true" />
        <input
          className="theme-compare__input"
          type="range"
          min={0}
          max={100}
          value={split}
          onChange={(event) => setSplit(Number(event.target.value))}
          aria-label={label}
          aria-valuetext={describe(split)}
        />
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

export interface ArchitecturePart {
  name: string;
  /** How the hub talks to it. */
  via: string;
  detail: string;
}

/** A hub box with the parts it talks to underneath. */
export function ArchitectureFigure({
  hub,
  hubDetail,
  parts,
  caption,
}: {
  hub: string;
  hubDetail: string;
  parts: ArchitecturePart[];
  caption: ReactNode;
}) {
  return (
    <figure className="case-figure case-figure--wide architecture">
      <div className="architecture__hub">
        <strong>{hub}</strong>
        <span>{hubDetail}</span>
      </div>
      <ul className="architecture__spokes">
        {parts.map((part) => (
          <li key={part.name}>
            <span className="architecture__via">{part.via}</span>
            <strong>{part.name}</strong>
            <span>{part.detail}</span>
          </li>
        ))}
      </ul>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

/** Numbered steps that happen in order. */
export function PipelineFigure({
  label,
  steps,
  caption,
}: {
  label: string;
  steps: { title: string; detail: string }[];
  caption: ReactNode;
}) {
  return (
    <figure className="case-figure case-figure--wide">
      <ol
        className="pipeline"
        aria-label={label}
        // five fit on one row; six or more wrap into rows of three
        style={{ "--steps": steps.length > 5 ? 3 : steps.length } as CSSProperties}
      >
        {steps.map((step) => (
          <li key={step.title} className="pipeline__step">
            <strong>{step.title}</strong>
            <span>{step.detail}</span>
          </li>
        ))}
      </ol>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
