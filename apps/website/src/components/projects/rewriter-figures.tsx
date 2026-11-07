import { useId, useState } from "react";
import { projectImage, type ProjectMediaKey } from "../../content/projects";
import { ProjectPicture } from "../project-picture";
import { ArchitectureFigure, PipelineFigure } from "./case-figures";

/** The picker's own names and descriptions, from each theme's definition. */
const themes = [
  {
    id: "starlight",
    name: "Starlight",
    description: "A night sky, a big moon and soft peach light.",
    alt: "The library in Starlight: an indigo night sky with stars, a large moon on the right and the headline ‘Classic books you’ll actually finish.’ with the last two words in a peach gradient",
  },
  {
    id: "paper-worlds",
    name: "Paper Worlds",
    description: "Cut-paper scenes in bright colours, with a little world for every book.",
    alt: "The library in Paper Worlds: a sky-blue page with a cut-paper lighthouse, sea, clouds and a hot air balloon, and the headline in heavy navy type",
  },
  {
    id: "living-ink",
    name: "Living Ink",
    description: "Cream paper, big quiet type and ink that moves when you do.",
    alt: "The library in Living Ink: cream paper with swirls of peach, lilac and blue ink, a tall condensed serif headline and a hand-drawn underline",
  },
  {
    id: "lantern",
    name: "Lantern Room",
    description: "An old library at dusk, with warm lamplight and brass.",
    alt: "The library in Lantern Room: a dark painted reading room with tall shelves, an arched window and a green banker’s lamp on a desk, with brass-coloured type",
  },
] as const;

type ThemeId = (typeof themes)[number]["id"];

export function RewriterThemes() {
  const [chosen, setChosen] = useState<ThemeId>("starlight");
  const name = useId();
  return (
    <figure className="case-figure case-figure--wide theme-picker">
      <fieldset className="theme-picker__choices">
        <legend className="sr-only">Theme</legend>
        {themes.map((theme) => (
          <label key={theme.id}>
            <input
              type="radio"
              name={name}
              value={theme.id}
              checked={chosen === theme.id}
              onChange={() => setChosen(theme.id)}
            />
            <span>
              <strong>{theme.name}</strong>
              {theme.description}
            </span>
          </label>
        ))}
      </fieldset>
      <div className="case-figure__frame theme-picker__stage">
        {themes.map((theme) => (
          <div key={theme.id} className="theme-picker__shot" data-active={theme.id === chosen}>
            <ProjectPicture
              image={projectImage(`rewriter/theme-${theme.id}` as ProjectMediaKey, theme.alt)}
              sizes="(min-width: 72rem) 64rem, 100vw"
            />
          </div>
        ))}
      </div>
      <figcaption>
        The top of the library in each theme. The words, links and layout are the same in all four.
      </figcaption>
    </figure>
  );
}

/** Estimated source tokens in each part of a made-up chapter. The first part is kept short. */
const parts = [460, 1180, 1320, 1240, 640];
const total = parts.reduce((sum, part) => sum + part, 0);
const starts = parts.map((_, index) => parts.slice(0, index).reduce((sum, part) => sum + part, 0));

type PartState = "read" | "ahead" | "waiting";
const stateLabels: Record<PartState, string> = {
  read: "Rewritten as you reach it",
  ahead: "Rewritten one part ahead",
  waiting: "Not rewritten",
};

export function RewriterSegments() {
  const [position, setPosition] = useState(5);
  const id = useId();
  const reached = (position / 100) * total;
  const current = Math.max(
    0,
    starts.findLastIndex((start) => start <= reached),
  );
  const state = (index: number): PartState =>
    index <= current ? "read" : index === current + 1 ? "ahead" : "waiting";
  const written = Math.min(parts.length, current + 2);
  const left = parts.length - written;

  return (
    <figure className="case-figure case-figure--wide segments">
      <label className="segments__control" htmlFor={id}>
        How far into the chapter you are
      </label>
      <input
        id={id}
        className="segments__range"
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(event) => setPosition(Number(event.target.value))}
        aria-valuetext={`${position}% of the way through, in part ${current + 1} of ${parts.length}`}
      />
      <div className="segments__bar" aria-hidden="true">
        {parts.map((part, index) => (
          <span key={index} data-state={state(index)} style={{ flexGrow: part }}>
            Part {index + 1}
          </span>
        ))}
        <span className="segments__marker" style={{ left: `${position}%` }} />
      </div>
      <ul className="segments__key" aria-hidden="true">
        {(Object.keys(stateLabels) as PartState[]).map((key) => (
          <li key={key} data-state={key}>
            {stateLabels[key]}
          </li>
        ))}
      </ul>
      <p className="segments__readout" aria-live="polite">
        {left > 0
          ? `${written} of ${parts.length} parts rewritten. Stop reading here and the other ${left === 1 ? "one is" : `${left} are`} never paid for.`
          : `All ${parts.length} parts rewritten. They’re stored, so the next reader at this level gets them for free.`}
      </p>
      <figcaption>
        A chapter split into parts of about a page, with a shorter first one so the opening arrives
        sooner. The split is planned when the book is compiled, and it never cuts a paragraph in
        half. The chapter here is made up; the rule is the real one.
      </figcaption>
    </figure>
  );
}

export function RewriterBudget() {
  return (
    <figure className="case-figure budget">
      <div className="budget__bar" aria-hidden="true">
        <span data-zone="ahead" />
        <span data-zone="demand" />
      </div>
      <dl className="budget__zones">
        <div data-zone="ahead">
          <dt>Up to 80%</dt>
          <dd>Rewrites the part you&rsquo;re reading and the one after it.</dd>
        </div>
        <div data-zone="demand">
          <dt>80% to the cap</dt>
          <dd>Stops working ahead. Only the part you&rsquo;re on gets rewritten.</dd>
        </div>
        <div data-zone="cap">
          <dt>At the cap</dt>
          <dd>
            New parts show the original, with &ldquo;This part is shown as written.&rdquo; Anything
            already stored still works.
          </dd>
        </div>
      </dl>
      <figcaption>
        What happens as the day&rsquo;s spending fills up. The cap is $10 a day.
      </figcaption>
    </figure>
  );
}

export function RewriterPlatform() {
  return (
    <ArchitectureFigure
      hub="One Cloudflare Worker"
      hubDetail="TanStack Start’s server, built by the Cloudflare Vite plugin. It renders pages, serves the reader and handles every rewrite request."
      parts={[
        {
          name: "Static assets",
          via: "ASSETS binding",
          detail:
            "The pages and all the book text, about 3,000 JSON files, deployed with the code they belong to.",
        },
        {
          name: "R2",
          via: "DATA binding",
          detail:
            "Every rewritten part, recap and explanation, stored for good. Audio is kept for a while.",
        },
        {
          name: "D1",
          via: "DB binding",
          detail: "The daily budget, per-reader limits and the locks that stop duplicate work.",
        },
        {
          name: "Workers AI",
          via: "AI binding, through AI Gateway",
          detail: "DeepSeek V4.1 Flash. The binding is the credential, so there’s no key to leak.",
        },
      ]}
      caption="Everything the site runs on. Readers’ progress, bookmarks and profiles never leave their browser."
    />
  );
}

export function RewriterThemeParts() {
  return (
    <ArchitectureFigure
      hub="A theme"
      hubDetail="A folder with one line in the registry. It can change everything around the book, and nothing in it."
      parts={[
        {
          name: "Tokens",
          via: "theme.css",
          detail:
            "Custom properties on [data-theme] and nothing else. Components read them through StyleX.",
        },
        {
          name: "Decoration",
          via: "Five slots, loaded when idle",
          detail:
            "The moon, the paper dioramas, the ink. Hidden from screen readers and safe to drop.",
        },
        {
          name: "Scene",
          via: "One WebGL2 canvas",
          detail:
            "Behind the page. Paused while a page turns or the tab is hidden. Devices without a real GPU get the CSS backdrop instead.",
        },
        {
          name: "Rewrite transition",
          via: "rewrite.ts",
          detail: "Plays over the text when the reading level changes. The real text never moves.",
        },
      ]}
      caption="What a theme is made of. The book spread, its page colours and the page turn aren’t on the list, so no theme can change them."
    />
  );
}

export function RewriterMissSteps() {
  return (
    <PipelineFigure
      label="What happens when a part hasn’t been rewritten yet"
      steps={[
        {
          title: "Check the budget",
          detail: "Over the daily cap, the reader gets the original text.",
        },
        {
          title: "Check the reader",
          detail: "A per-reader limit, on a salted hash. Stored parts don’t count.",
        },
        {
          title: "Take the lock",
          detail: "If this part is already being written, don’t start a second copy.",
        },
        {
          title: "Ask the model",
          detail: "Numbered plain-text paragraphs in, the same numbers streamed back as JSON.",
        },
        {
          title: "Check every paragraph",
          detail:
            "Each one as it arrives, then straight to the reader. Re-ask only for the ones that fail.",
        },
        {
          title: "Store it for good",
          detail: "Keyed by the text, level, prompt version and model.",
        },
      ]}
      caption="The path a request takes when a part isn’t stored yet. Most reads never get past the first lookup, because the part is already there."
    />
  );
}
