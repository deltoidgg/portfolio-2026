import { projectImage } from "../../content/projects";
import { ArchitectureFigure, CompareSlider, PipelineFigure } from "./case-figures";

const processes = [
  {
    name: "Native audio host",
    via: "Control messages in, audio frames out",
    detail:
      "Swift on macOS, C++ on Windows. Captures system audio, opens the mic while the key is held and watches the shortcut.",
  },
  {
    name: "Inference servers",
    via: "HTTP on loopback",
    detail:
      "whisper.cpp or Parakeet for speech and llama.cpp for answers, started on demand and restarted if they crash.",
  },
  {
    name: "Utility processes",
    via: "Electron utilityProcess",
    detail: "Silero voice detection and the Kokoro voice, kept off the main thread.",
  },
  {
    name: "Windows",
    via: "Typed IPC: requests in, state out",
    detail: "The bar, main window, tip card and tour, each a sandboxed FoldKit program.",
  },
];

export function JoinArchitecture() {
  return (
    <ArchitectureFigure
      hub="Electron main process"
      hubDetail="One Effect runtime: capture, transcription, asking, models, storage and settings. It owns every bit of state."
      parts={processes}
      caption="The processes and what they talk over. The windows can only send typed requests, so none of them can reach the file system or an API key."
    />
  );
}

/** Release to first answer word, from docs/performance.md (reference machine A). */
const latency = [
  { setup: "Parakeet and Qwen3.5 4B, both on the GPU", min: 0.3, max: 0.39 },
  { setup: "whisper base on the CPU, Qwen3.5 4B on the GPU", min: 0.6, max: 0.69 },
  { setup: "whisper base and Qwen3.5 2B, both on the CPU", min: 0.59, max: 0.89 },
  { setup: "whisper small on the CPU, Qwen3.5 4B on the GPU", min: 1.47, max: 1.62 },
  { setup: "whisper base and Qwen3.5 4B, both on the CPU", min: 0.93, max: 2.04 },
];
const TARGET = 2.5;
const AXIS_MAX = 3;
const ticks = [0, 1, 2, 3];
const at = (seconds: number) => `${(seconds / AXIS_MAX) * 100}%`;
const seconds = (value: number) => value.toFixed(2);

export function JoinLatencyChart() {
  return (
    <figure className="case-figure case-figure--wide latency">
      <table className="latency__table">
        <caption>Letting go of the key to the first word of the answer, in seconds</caption>
        <thead>
          <tr>
            <th scope="col">Speech and answer models</th>
            <th scope="col" className="latency__plot-head">
              <span className="sr-only">Range</span>
              <span className="latency__axis" aria-hidden="true">
                {ticks.map((tick) => (
                  <span key={tick} style={{ left: at(tick) }}>
                    {tick} s
                  </span>
                ))}
              </span>
            </th>
            <th scope="col">Fastest to slowest</th>
          </tr>
        </thead>
        <tbody>
          {latency.map((row) => (
            <tr key={row.setup}>
              <th scope="row">{row.setup}</th>
              <td className="latency__plot" aria-hidden="true">
                <span className="latency__target" style={{ left: at(TARGET) }} />
                <span
                  className="latency__bar"
                  style={{ left: at(row.min), width: `max(8px, ${at(row.max - row.min)})` }}
                />
              </td>
              <td className="latency__value">
                {seconds(row.min)}–{seconds(row.max)} s
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="latency__key" aria-hidden="true">
        <span className="latency__key-target" /> The 2.5 second target
      </p>
      <figcaption>
        Measured by the end-to-end test on one PC (Ryzen 7 7700, RTX 3060), with a 2.4 second spoken
        question. Each bar runs from the fastest to the slowest run. Every run answered correctly.
      </figcaption>
    </figure>
  );
}

const wines = [
  {
    name: "Burgundy",
    job: "Action. One coloured button per screen.",
    light: "#7f1b3a",
    dark: "#ac3a5c",
  },
  {
    name: "Berry",
    job: "Signal: live, hands-free, focus and the tour.",
    light: "#ae3368",
    dark: "#d9588c",
  },
  {
    name: "Merlot",
    job: "Depth: shadows, gradient ends and the mark.",
    light: "#4d1420",
    dark: "#7a2b3d",
  },
  {
    name: "Porcelain and Black Cherry",
    job: "The neutrals, pulled about 1% towards wine.",
    light: "#f6efee",
    dark: "#120d0e",
  },
];

export function JoinPalette() {
  return (
    <figure className="case-figure palette">
      <ul className="palette__list">
        {wines.map((wine) => (
          <li key={wine.name}>
            <span className="palette__chips" aria-hidden="true">
              <span style={{ background: wine.light }} />
              <span style={{ background: wine.dark }} />
            </span>
            <strong>{wine.name}</strong>
            <span>{wine.job}</span>
            <code>
              {wine.light} / {wine.dark}
            </code>
          </li>
        ))}
      </ul>
      <figcaption>
        Each colour shown in its light theme value, then its dark one. Danger is a vermilion about
        35° away from the wines, so an error never looks like a brand colour.
      </figcaption>
    </figure>
  );
}

export function JoinThemeCompare() {
  return (
    <CompareSlider
      under={projectImage(
        "join/home-dark",
        "The home screen in the dark theme, black cherry with a berry accent",
      )}
      over={projectImage(
        "join/home",
        "The same home screen in the light theme, warm porcelain with a burgundy accent",
      )}
      label="How much of the light theme to show"
      describe={(split) => `${split}% light, ${100 - split}% dark`}
      caption="Home in light and dark, with sample data. Drag across it to compare. In dark, the accent moves up to berry so buttons glow against black cherry instead of sinking into it."
    />
  );
}

const manifestSteps = [
  {
    title: "Sign offline",
    detail: "Ed25519 over canonical JSON. The private key never goes near Cloudflare.",
  },
  {
    title: "Publish",
    detail:
      "The Worker checks the signature again, so a leaked admin token alone can’t ship one the app would accept.",
  },
  {
    title: "Fetch",
    detail: "The app asks with a short timeout. Being offline is normal.",
  },
  {
    title: "Verify first",
    detail: "The signature is checked before any decoding, because decoding can reorder keys.",
  },
  {
    title: "Fall back",
    detail:
      "Any failure means the manifest built into the app. Files are still checked by SHA-256.",
  },
];

export function JoinManifestSteps() {
  return (
    <PipelineFigure
      label="How a model manifest gets to the app"
      steps={manifestSteps}
      caption="How the list of downloadable models gets from me to the app. A broken or hostile server can at worst send the app back to the list it shipped with."
    />
  );
}
