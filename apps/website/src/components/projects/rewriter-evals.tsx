import { PipelineFigure } from "./case-figures";

export function RewriterEvalLoop() {
  return (
    <PipelineFigure
      label="How each change to the prompt was tested"
      steps={[
        {
          title: "Rewrite the set",
          detail: "24 passages at all four levels: 96 rewrites through the real prompt and model.",
        },
        {
          title: "Check the text",
          detail: "Sentence length, reading grade, names, missing paragraphs and added chatter.",
        },
        {
          title: "Judge it twice",
          detail: "A second model scores every rewrite out of 5 and quotes its worst faults.",
        },
        {
          title: "Read it myself",
          detail: "The quoted faults first, then whole passages, to see which faults are real.",
        },
        {
          title: "Change one thing",
          detail: "Keep it only if the same passages score better in both judgings.",
        },
      ]}
      caption="The loop behind every prompt change. A full run, judged twice, costs under 50 cents, so it runs after every change."
    />
  );
}

/** Mean judge scores out of 5 on the 24 passages: the first judged run, then the final prompt. */
const levelScores = [
  {
    level: "6 to 8",
    scores: [
      [3.92, 4.42],
      [4.08, 4.33],
      [3.5, 3.75],
      [3.58, 3.96],
    ],
    passing: [10, 16],
  },
  {
    level: "9 to 11",
    scores: [
      [4.67, 4.46],
      [4.33, 4.38],
      [3.67, 3.75],
      [4.08, 4.08],
    ],
    passing: [16, 15],
  },
  {
    level: "12 to 14",
    scores: [
      [4.33, 4.5],
      [4.08, 4.25],
      [3.67, 3.79],
      [3.83, 4.04],
    ],
    passing: [16, 18],
  },
  {
    level: "15 and up",
    scores: [
      [4.96, 4.71],
      [4.54, 4.46],
      [3.83, 4.13],
      [4.29, 4.33],
    ],
    passing: [18, 19],
  },
] as const;

const rubric = ["Level fit", "Faithful", "Flow", "Voice"] as const;

function Change({ before, after }: { before: string; after: string }) {
  return (
    <span className="eval-table__change">
      <span className="eval-table__before">{before}</span>
      <span aria-hidden="true"> → </span>
      <span className="sr-only"> to </span>
      <strong>{after}</strong>
    </span>
  );
}

export function RewriterJudgeScores() {
  return (
    <figure className="case-figure case-figure--wide eval-figure">
      <div className="eval-table__scroll">
        <table className="eval-table">
          <caption>
            The judge&rsquo;s mean scores out of 5, first judged run to final prompt
          </caption>
          <thead>
            <tr>
              <th scope="col">Ages</th>
              {rubric.map((name) => (
                <th key={name} scope="col">
                  {name}
                </th>
              ))}
              <th scope="col">Pass every score</th>
            </tr>
          </thead>
          <tbody>
            {levelScores.map((row) => (
              <tr key={row.level}>
                <th scope="row">{row.level}</th>
                {row.scores.map(([before, after], index) => (
                  <td key={rubric[index]}>
                    <Change before={before.toFixed(2)} after={after.toFixed(2)} />
                  </td>
                ))}
                <td>
                  <Change before={`${row.passing[0]}`} after={`${row.passing[1]} of 24`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption>
        The same 24 passages, before and after the judge-led changes. A passage passes a score at 4
        or more. The judge&rsquo;s instructions were tightened once in between, and one
        passage&rsquo;s score can move by a point from run to run, so read small differences as
        noise.
      </figcaption>
    </figure>
  );
}

/** Ages 6 to 8, each rewrite judged twice; the wait is the median for one part of a chapter. */
const models = [
  { name: "DeepSeek V4.1 Flash", note: "In use", scores: [4.06, 4.06, 3.65, 3.69], wait: 10 },
  { name: "DeepSeek V4 Pro", scores: [4.06, 3.94, 3.63, 3.63], wait: 36 },
  { name: "Gemma 4 26B", scores: [4.35, 3.78, 3.74, 3.65], wait: 22 },
  { name: "Qwen 3.8 27B", scores: [4.25, 3.46, 3.65, 3.46], wait: 29 },
  { name: "Kimi K2.6", scores: [3.56, 3.98, 3.27, 3.38], wait: 18 },
] as const;
const slowest = Math.max(...models.map((model) => model.wait));

export function RewriterModelComparison() {
  return (
    <figure className="case-figure case-figure--wide eval-figure">
      <div className="eval-table__scroll">
        <table className="eval-table">
          <caption>Five models on the same passages for ages 6 to 8</caption>
          <thead>
            <tr>
              <th scope="col">Model</th>
              {rubric.map((name) => (
                <th key={name} scope="col">
                  {name}
                </th>
              ))}
              <th scope="col" className="eval-table__wait-head">
                Wait for one part
              </th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => (
              <tr key={model.name} data-chosen={"note" in model ? true : undefined}>
                <th scope="row">
                  {model.name}
                  {"note" in model ? <small>{model.note}</small> : null}
                </th>
                {model.scores.map((score, index) => (
                  <td key={rubric[index]}>{score.toFixed(2)}</td>
                ))}
                <td>
                  <span className="eval-table__wait">
                    <span
                      className="eval-table__bar"
                      // the slowest bar leaves room for its label
                      style={{ width: `${(model.wait / slowest) * 75}%` }}
                      aria-hidden="true"
                    />
                    <span>{model.wait} s</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption>
        Five text models on Workers AI, with every rewrite judged twice and averaged. Two others
        failed the length checks on the first passages, and GLM-5.3 kept thinking and never finished
        one. The prompt was tuned on DeepSeek V4.1 Flash, which favours it a little.
      </figcaption>
    </figure>
  );
}
