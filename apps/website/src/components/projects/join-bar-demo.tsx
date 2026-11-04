import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from "react";
import { type ProjectMediaKey, projectImage } from "../../content/projects";
import { ProjectPicture } from "../project-picture";

// The same thresholds as GESTURE_TIMINGS in Join's domain package.
const HOLD_MS = 400;
const DOUBLE_TAP_MS = 600;
const TAP_TIMEOUT_MS = 650;
const SPAM_MS = 600;
const THINKING_MS = 900;
/** The timing track runs to one second. */
const TRACK_MS = 1000;

type BarState = "hearing" | "asking" | "handsfree" | "thinking" | "answered" | "notice";

type Phase =
  | { tag: "idle" }
  | { tag: "held"; downAt: number }
  | { tag: "awaiting"; upAt: number }
  | { tag: "handsFree"; lockedAt: number; ignoreRelease: boolean }
  | { tag: "thinking" };

const shots: Record<BarState, string> = {
  hearing: "The bar at rest: a small handle at the bottom of the screen",
  asking: "The bar recording: a pill with a waveform and a small ear badge",
  handsfree: "The bar in hands-free mode: the waveform pill with a lock beside it",
  thinking: "The bar after letting go: a pill that says Thinking",
  answered:
    "The answer panel: the question ‘Why would that hurt regional banks?’ and a short answer about deposits repricing faster than loans, with follow-up, speak, copy and ‘Use more context’ controls",
  notice: "A notice card that says Cancelled, Pressed Esc by accident?, with an Undo button",
};

const states = Object.keys(shots) as BarState[];

const idleMessage = "Hold the button down and let go after a moment, as if you were asking.";

export function JoinBarDemo() {
  const [bar, setBar] = useState<BarState>("hearing");
  const [message, setMessage] = useState(idleMessage);
  const phase = useRef<Phase>({ tag: "idle" });
  const timer = useRef<number>(undefined);
  const frame = useRef<number>(undefined);
  const fill = useRef<HTMLSpanElement>(null);
  const readout = useRef<HTMLSpanElement>(null);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    [],
  );

  function setTimer(ms: number, run: () => void) {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(run, ms);
  }

  function showHeld(ms: number) {
    if (fill.current) fill.current.style.transform = `scaleX(${Math.min(ms / TRACK_MS, 1)})`;
    if (readout.current) readout.current.textContent = `${Math.round(ms)} ms`;
  }

  function track(downAt: number) {
    const tick = () => {
      showHeld(performance.now() - downAt);
      frame.current = requestAnimationFrame(tick);
    };
    tick();
  }

  function stopTracking() {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = undefined;
  }

  function submit(text: string) {
    phase.current = { tag: "thinking" };
    setBar("thinking");
    setMessage(text);
    setTimer(THINKING_MS, () => {
      phase.current = { tag: "idle" };
      setBar("answered");
      setMessage("The panel opens when the first word of the answer arrives.");
    });
  }

  function startHold(now: number) {
    window.clearTimeout(timer.current);
    phase.current = { tag: "held", downAt: now };
    setBar("asking");
    setMessage("Recording. Let go when you’ve finished your question.");
    track(now);
  }

  function press() {
    const now = performance.now();
    const current = phase.current;
    if (current.tag === "held" || current.tag === "thinking") return;

    if (current.tag === "awaiting" && now - current.upAt <= DOUBLE_TAP_MS) {
      window.clearTimeout(timer.current);
      phase.current = { tag: "handsFree", lockedAt: now, ignoreRelease: true };
      setBar("handsfree");
      setMessage("Double-tap, so it keeps listening hands-free. Press once more when you’re done.");
      return;
    }

    if (current.tag === "handsFree") {
      if (now - current.lockedAt <= SPAM_MS) {
        phase.current = { tag: "idle" };
        setBar("hearing");
        setMessage("A press straight after locking looks like a triple-tap, so that one cancels.");
        return;
      }
      submit("Pressed again, so the hands-free question is sent.");
      return;
    }

    startHold(now);
  }

  function release() {
    const now = performance.now();
    const current = phase.current;

    if (current.tag === "handsFree" && current.ignoreRelease) {
      phase.current = { ...current, ignoreRelease: false };
      return;
    }
    if (current.tag !== "held") return;

    stopTracking();
    const held = now - current.downAt;
    showHeld(held);

    if (held > HOLD_MS) {
      submit(`Held for ${Math.round(held)} ms, which is long enough to count as a question.`);
      return;
    }

    phase.current = { tag: "awaiting", upAt: now };
    setMessage(`Only ${Math.round(held)} ms. Still recording, in case a second tap follows.`);
    setTimer(TAP_TIMEOUT_MS, () => {
      phase.current = { tag: "idle" };
      setBar("hearing");
      setMessage("No second tap, so it was an accident. It’s dropped without a message.");
    });
  }

  function cancel() {
    const current = phase.current;
    if (current.tag === "idle") return;
    stopTracking();
    window.clearTimeout(timer.current);
    phase.current = { tag: "idle" };
    setBar("notice");
    setMessage("Esc cancels, and the notice offers Undo in case it was a slip.");
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    press();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      cancel();
      return;
    }
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    if (!event.repeat) press();
  }

  function onKeyUp(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    release();
  }

  return (
    <figure className="case-figure case-figure--wide bar-demo">
      <div className="bar-demo__layout">
        <div className="bar-demo__stage">
          <ProjectPicture
            image={projectImage(
              "join/player",
              "A video player from the app’s setup, showing a cartoon octopus clip, with the bar at the bottom of the screen in front of it",
            )}
            sizes="(min-width: 48rem) 28rem, 100vw"
          />
          {states.map((state) => (
            <div
              key={state}
              className="bar-demo__shot"
              data-active={state === bar}
              aria-hidden={state !== bar}
            >
              <ProjectPicture
                image={projectImage(`join/bar-${state}` as ProjectMediaKey, shots[state])}
                sizes="(min-width: 48rem) 24rem, 85vw"
              />
            </div>
          ))}
        </div>

        <div className="bar-demo__controls">
          <div className="bar-demo__buttons">
            <button
              type="button"
              className="bar-demo__key"
              onPointerDown={onPointerDown}
              onPointerUp={release}
              onPointerCancel={release}
              onKeyDown={onKeyDown}
              onKeyUp={onKeyUp}
              onContextMenu={(event) => event.preventDefault()}
            >
              Hold to ask
            </button>
            <button type="button" className="bar-demo__cancel" onClick={cancel}>
              Esc
            </button>
          </div>
          <div className="bar-demo__track" aria-hidden="true">
            <span className="bar-demo__fill" ref={fill} />
            <span className="bar-demo__mark" style={{ left: `${(HOLD_MS / TRACK_MS) * 100}%` }}>
              400 ms
            </span>
            <span className="bar-demo__readout" ref={readout}>
              0 ms
            </span>
          </div>
          <p className="bar-demo__status" aria-live="polite">
            {message}
          </p>
          <p className="bar-demo__hint">
            Try a quick double-tap too, or press Esc while it’s recording. With a keyboard, focus
            the button and hold Space.
          </p>
        </div>
      </div>
      <figcaption>
        Screenshots of the real bar, in front of the clip from setup. The button follows the same
        rules as the shortcut: 400 ms to count as a hold, 600 ms for a second tap and 650 ms before
        a lone tap is dropped.
      </figcaption>
    </figure>
  );
}
