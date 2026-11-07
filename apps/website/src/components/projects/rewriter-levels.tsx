import { useId, useState } from "react";

/**
 * The opening paragraph of Treasure Island, as written and as the production model rewrote it
 * for each level. Copied from Rewriter's home page demo (`passage.data.ts`, DeepSeek V4.1 Flash,
 * prompt `segments-v3`), which saves real output rather than asking a model on every visit.
 */
const versions = [
  {
    id: "original",
    label: "As written",
    text: "Squire Trelawney, Dr. Livesey, and the rest of these gentlemen having asked me to write down the whole particulars about Treasure Island, from the beginning to the end, keeping nothing back but the bearings of the island, and that only because there is still treasure not yet lifted, I take up my pen in the year of grace 17__ and go back to the time when my father kept the Admiral Benbow inn and the brown old seaman with the sabre cut first took up his lodging under our roof.",
  },
  {
    id: "advanced",
    label: "15 and up",
    text: "Squire Trelawney, Dr. Livesey, and the rest of these gentlemen have asked me to write down the whole story of Treasure Island, from beginning to end, keeping nothing back except the location of the island, and that only because there is still treasure there that has not yet been taken. So I take up my pen in the year of grace 17__ and go back to the time when my father kept the Admiral Benbow inn, and the brown old seaman with the sabre cut first came to lodge under our roof.",
  },
  {
    id: "independent",
    label: "12 to 14",
    text: "Squire Trelawney, Dr. Livesey, and the rest of these gentlemen have asked me to write down the whole story of Treasure Island, from beginning to end. I must keep nothing back except where the island lies, and only because there is still treasure there that has not been dug up. So I take up my pen in the year 17__ and go back to the time when my father kept the Admiral Benbow inn. That was when the brown old seaman with the sabre cut first came to lodge under our roof.",
  },
  {
    id: "developing",
    label: "9 to 11",
    text: "Squire Trelawney, Dr. Livesey, and the other gentlemen have asked me to write down the whole story of Treasure Island, from beginning to end. I must keep nothing back except where the island is, and only because there is still treasure buried there. So I take up my pen in the year 17__ and go back to the time when my father kept the Admiral Benbow inn. That was when the brown old seaman with the sabre cut first came to stay under our roof.",
  },
  {
    id: "early",
    label: "6 to 8",
    text: "Squire Trelawney, Dr. Livesey, and the other gentlemen asked me to write down the whole story of Treasure Island. I must tell it all, from start to finish. I will hide only where the island is. I hide that because there is still treasure there. So I take up my pen. The year is 17__. I go back to the time when my father ran the Admiral Benbow inn. That was when the old brown sailor first came to stay with us. He had a scar from a sword cut on his face.",
  },
] as const;

type VersionId = (typeof versions)[number]["id"];

/** Words in each sentence, using the same rough splitting as Rewriter's own demo. */
function sentenceLengths(text: string) {
  return text
    .replace(/\b(?:Mr|Mrs|Dr|St)\./g, (match) => match.slice(0, -1))
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"])/)
    .map((sentence) => sentence.split(/\s+/).filter(Boolean).length);
}

const shapes = versions.map((version) => {
  const lengths = sentenceLengths(version.text);
  const words = lengths.reduce((total, length) => total + length, 0);
  return { ...version, lengths, words, average: Math.round(words / lengths.length) };
});
const longest = Math.max(...shapes.map((shape) => shape.words));

function summary(shape: (typeof shapes)[number]) {
  const sentences = shape.lengths.length;
  return sentences === 1
    ? `1 sentence of ${shape.words} words`
    : `${sentences} sentences, about ${shape.average} words each`;
}

export function RewriterLevels() {
  const [chosen, setChosen] = useState<VersionId>("original");
  const name = useId();
  const current = shapes.find((shape) => shape.id === chosen)!;

  return (
    <figure className="case-figure case-figure--wide levels">
      <fieldset className="choices">
        <legend>Reading level</legend>
        {versions.map((version) => (
          <label key={version.id}>
            <input
              type="radio"
              name={name}
              value={version.id}
              checked={chosen === version.id}
              onChange={() => setChosen(version.id)}
            />
            <span>{version.label}</span>
          </label>
        ))}
      </fieldset>

      {/* every version sits in the same grid cell, so the box is as tall as the longest */}
      <div className="levels__passage">
        {versions.map((version) => (
          <p key={version.id} data-active={version.id === chosen}>
            {version.text}
          </p>
        ))}
      </div>

      <p className="levels__readout" aria-live="polite">
        {current.id === "original" ? "As written: " : `For ages ${current.label}: `}
        {summary(current)}.
      </p>

      <table className="levels__chart">
        <caption className="sr-only">Sentence lengths at each level, in words</caption>
        <tbody>
          {shapes.map((shape) => (
            <tr key={shape.id} data-active={shape.id === chosen}>
              <th scope="row">{shape.label}</th>
              <td>
                <span
                  className="levels__strip"
                  style={{ width: `${(shape.words / longest) * 100}%` }}
                >
                  {shape.lengths.map((length, index) => (
                    <span key={index} style={{ flexGrow: length }} />
                  ))}
                </span>
                <span className="sr-only">{summary(shape)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <figcaption>
        The first paragraph of Treasure Island, rewritten by the model Rewriter uses. Each bar is a
        sentence, as long as its word count. The paragraph stays about the same length; it gets
        broken into shorter sentences, and at the easier levels, old words like
        &ldquo;bearings&rdquo; go.
      </figcaption>
    </figure>
  );
}
