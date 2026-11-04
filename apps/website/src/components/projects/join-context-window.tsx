import { useId, useState } from "react";

/** Seconds before the key went down. A made-up podcast clip, not a real recording. */
const segments = [
  {
    start: -118,
    end: -111,
    text: "Welcome back. Today it’s what higher rates actually do to banks.",
  },
  {
    start: -110,
    end: -101,
    text: "Most people assume higher rates are good for them, and for big banks that’s mostly true.",
  },
  { start: -99, end: -92, text: "They earn more on loans, and their deposits tend to stay put." },
  { start: -90, end: -83, text: "Regional banks are a different story." },
  {
    start: -82,
    end: -71,
    text: "And what people miss about the yield curve is that it’s a forecast, not a thermometer.",
  },
  {
    start: -70,
    end: -61,
    text: "If short rates fall while long rates stay put, the spread a bank earns widens for a while.",
  },
  { start: -60, end: -52, text: "So on paper, everyone should be fine." },
  {
    start: -50,
    end: -38,
    text: "But regional banks fund themselves differently. Their deposits reprice faster than their loans.",
  },
  { start: -37, end: -29, text: "Savers move their money the moment a better rate shows up." },
  {
    start: -28,
    end: -17,
    text: "Meanwhile most of their loans are fixed for years, so the income barely moves.",
  },
  { start: -16, end: -8, text: "That gap is the squeeze." },
  { start: -7, end: -1, text: "So the real question is how long that squeeze lasts." },
];

const choices = [15, 30, 45, 90, 120] as const;
type Choice = (typeof choices)[number];

/** The ring buffer holds two minutes. */
const SPAN = 120;
/** selectContext never reaches further back than this, unless the chosen window is longer. */
const MAX_CONTEXT = 90;

const QUESTION = "Why would that hurt regional banks?";

function label(seconds: Choice) {
  return seconds >= 60 ? `last ${seconds / 60} min` : `last ${seconds}s`;
}

function offset(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** The same rule as `selectContext`: whole segments that end inside the window. */
function select(length: Choice) {
  const hardStart = -Math.max(MAX_CONTEXT, length);
  return segments.filter((segment) => segment.end > -length && segment.start >= hardStart);
}

const position = (seconds: number) => `${((seconds + SPAN) / SPAN) * 100}%`;

export function JoinContextWindow() {
  const [length, setLength] = useState<Choice>(45);
  const name = useId();
  const picked = select(length);
  const origin = picked[0]?.start ?? 0;
  const prompt = [
    `RECENT AUDIO (${label(length)})`,
    ...picked.map(
      (segment) =>
        `[${offset(segment.start - origin)}–${offset(segment.end - origin)}] ${segment.text}`,
    ),
    "",
    "USER",
    QUESTION,
  ].join("\n");

  return (
    <figure className="case-figure case-figure--wide context-window">
      <fieldset className="choices">
        <legend>Context for each question</legend>
        {choices.map((choice) => (
          <label key={choice}>
            <input
              type="radio"
              name={name}
              value={choice}
              checked={length === choice}
              onChange={() => setLength(choice)}
            />
            <span>{choice >= 60 ? `${choice / 60} min` : `${choice} s`}</span>
          </label>
        ))}
      </fieldset>

      <div className="context-window__timeline" aria-hidden="true">
        <span className="context-window__range" style={{ left: position(-length), right: 0 }} />
        {segments.map((segment) => (
          <span
            key={segment.start}
            className="context-window__segment"
            data-picked={picked.includes(segment)}
            style={{
              left: position(segment.start),
              width: `${((segment.end - segment.start) / SPAN) * 100}%`,
            }}
          />
        ))}
        <span className="context-window__now">Key down</span>
        <span className="context-window__axis">
          <span style={{ left: "0%" }}>2 min ago</span>
          <span style={{ left: "50%" }}>1 min</span>
          <span style={{ left: "100%" }}>now</span>
        </span>
      </div>

      <pre className="context-window__prompt" tabIndex={0} aria-label="The prompt the model sees">
        {prompt}
      </pre>
      <figcaption>
        Pick a window and see which lines reach the model. A line that starts before the window but
        finishes inside it goes in whole, so a line is never cut in half. The clip is made up; the
        rules and the prompt format are the app’s own.
      </figcaption>
    </figure>
  );
}
