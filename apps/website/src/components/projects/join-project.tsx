import { projectImage } from "../../content/projects";
import { JoinBarDemo } from "./join-bar-demo";
import { JoinContextWindow } from "./join-context-window";
import {
  JoinArchitecture,
  JoinLatencyChart,
  JoinManifestSteps,
  JoinPalette,
  JoinThemeCompare,
} from "./join-figures";
import { ProjectFigure, ProjectNote, ProjectSection } from "./project-layout";
import { ProjectTabs } from "./project-tabs";

export function JoinProject() {
  return (
    <>
      <ProjectSection id="idea" title="Asking the people on the podcast">
        <p>
          When someone on a podcast or in a lecture says something you don&rsquo;t follow, the usual
          fix is to pause, open a browser and try to describe something you only half heard. I
          wanted to be able to ask the conversation itself.
        </p>
        <p>
          Join the Conversation keeps a rolling two-minute transcript of whatever your computer
          plays: a video, a course, an audiobook, a podcast or a meeting. Hold a key, ask out loud
          and let go, and the answer streams into a small bar at the bottom of the screen. It
          answers from what was just said, so it feels a bit like putting your hand up
          mid-conversation. Then you carry on listening.
        </p>
      </ProjectSection>

      <ProjectTabs
        label="Case study"
        tabs={[
          {
            id: "design",
            label: "Design",
            detail: "The product, the bar and the visual system",
            content: <DesignTab />,
          },
          {
            id: "technical",
            label: "Technical",
            detail: "Electron, FoldKit, Effect and Cloudflare",
            content: <TechnicalTab />,
          },
        ]}
      />

      <ProjectSection id="status" title="Where it’s at">
        <p>
          The whole loop works on my PC. The real-model test passes, including with the network
          switched off, and I&rsquo;ve run the Electron app through onboarding, scripted spoken
          questions, follow-ups and hands-free on a Linux dev build. The Windows audio host is built
          and tested on Windows 11 but hasn&rsquo;t run inside the packaged app yet. The macOS host
          is written and unit tested, but I haven&rsquo;t had a Mac to compile it on.
        </p>
        <p>
          Nothing is signed or released yet. Next on the list are running it on a Mac and pausing
          whatever&rsquo;s playing when you hold the key. For now you pause it yourself.
        </p>
      </ProjectSection>
    </>
  );
}

function DesignTab() {
  return (
    <>
      <ProjectSection id="one-key" title="One key to ask">
        <p>
          You hold a key, ask and let go. It&rsquo;s fn on a Mac and Ctrl with the Windows key on a
          PC, and you can change both. Double-tap it and it keeps listening, so you can talk for a
          while without holding anything. Esc cancels, with an Undo in case you hit it by accident.
        </p>
        <p>
          A press longer than 400 ms is a question, and letting go sends it. A shorter one is
          treated as the start of a double-tap, and if no second tap comes it&rsquo;s dropped
          without a message. Brushing the key should never ask the model anything.
        </p>
        <JoinBarDemo />
      </ProjectSection>

      <ProjectSection id="bar" title="Quiet until you need it">
        <p>
          At rest the bar is a 32 by 6 pixel handle. It grows into a pill while you talk, says
          &ldquo;Thinking&hellip;&rdquo; once you let go, and opens into the answer panel when the
          first word arrives. There&rsquo;s only ever one thing on screen. The bar never takes
          focus, and clicks pass straight through it unless there&rsquo;s something to press, so
          whatever you were doing keeps working.
        </p>
        <p>
          I studied a voice dictation app I like for this part, and measured its interface to get
          the sizes, motion and timings right. The icons, sounds and words are my own.
        </p>
        <p>
          The start sound plays when the microphone is actually sending audio, not when you press
          the key, and the waveform is drawn from your real mic levels. If the bar says it&rsquo;s
          listening, it is.
        </p>
        <p>
          Answers are text, and you can have them read aloud. Each answer says how much it heard,
          like &ldquo;Last 45 s &middot; on this computer&rdquo;. If that wasn&rsquo;t enough,
          &ldquo;Use more context&rdquo; asks again with the last two minutes, and holding the key
          while an answer is open asks a follow-up.
        </p>
        <ProjectNote title="One place for messages.">
          Errors, warnings and confirmations all show up as a card in the bar, one at a time, and
          never while you&rsquo;re talking. There are no dialogs and no raw error text. A failure
          gets a plain title and, if there&rsquo;s a fix, a button for it, like Open Settings or
          Restart.
        </ProjectNote>
      </ProjectSection>

      <ProjectSection id="onboarding" title="Learning it with the real thing">
        <p>
          There are no videos of the product pretending to work. Setup tests your real microphone on
          a live meter, asks you to hold your shortcut and checks it lights up, then gives you a
          short clip to ask about. The answer arrives in the real bar.
        </p>
        <ProjectFigure
          image={projectImage(
            "join/onboarding-tryit",
            "The ‘Try asking about a clip’ onboarding step: a framed video player with a cartoon octopus, and an instruction to hold fn and ask how an octopus arm can make decisions on its own",
          )}
          caption="The try-it step. You play the clip, then hold the key and ask about it."
          wide
        />
        <p>
          After that, tips are rationed. You get at most two a day, each one only once, and never
          while you&rsquo;re recording. The Home checklist only ticks things off when you&rsquo;ve
          actually done them, like asking a follow-up or trying hands-free.
        </p>
      </ProjectSection>

      <ProjectSection id="trust" title="Being clear about what it heard">
        <p>
          An app that&rsquo;s always listening has to be obvious about what it keeps. The second
          screen of setup asks where your data goes, and the default is that everything stays on
          your computer. Raw audio is never written to disk. Transcripts are kept for a day and
          questions for 30 days, and you can cut either down to the current session.
        </p>
        <ProjectFigure
          image={projectImage(
            "join/onboarding-privacy",
            "The privacy step of setup: ‘Keep everything on this computer’ is selected over ‘Allow cloud providers’, next to a card listing what it hears (kept 1 day), your questions (kept 30 days) and raw audio (never saved)",
          )}
          caption="Choosing where data goes. Cloud providers are opt-in and use your own keys."
          wide
        />
        <p>
          The Live transcript page shows exactly what it can answer about right now, labelled as
          automatic and possibly wrong. You can also type a question there instead of speaking.
        </p>
        <ProjectFigure
          image={projectImage(
            "join/transcript",
            "The Live transcript page: timestamped lines about regional banks and the yield curve, a question shown as a chip, the answer indented below it, and a box to type a question",
          )}
          caption="The Live transcript, with sample data. Your questions and the answers sit in line with what was said."
          wide
        />
      </ProjectSection>

      <ProjectSection id="visual" title="Dressed in wine">
        <p>
          I wanted it to feel quiet and a little luxurious, so I took the palette from this
          autumn&rsquo;s fashion: berry, burgundy and merlot, worn against cream and black. The
          interface is mostly neutral and the wines are the accessories. Each one has a single job.
        </p>
        <JoinPalette />
        <p>
          Type follows the same idea. Instrument Serif is for things you look at once, like page
          titles, headlines and big numbers. Inter is for everything you read or press. The serif
          never goes below 20 pixels and never goes on a control.
        </p>
        <JoinThemeCompare />
        <p>
          All of it lives in StyleX tokens. A script generates the forced light and dark themes from
          them, so a colour is only ever defined once, and every window shares the same buttons,
          toggles, fields and key caps.
        </p>
      </ProjectSection>
    </>
  );
}

function TechnicalTab() {
  return (
    <>
      <ProjectSection id="shape" title="Mostly outside the browser">
        <p>
          It&rsquo;s an Electron app, but most of the work happens in other processes. A small
          native host captures audio and watches the shortcut. Speech and answer models run as local
          servers that the app starts, health-checks and restarts. The main process runs a single
          Effect application that owns all the state, and the windows just draw it.
        </p>
        <JoinArchitecture />
        <p>
          The runtime only touches the outside world through ports, so the whole thing also runs
          against a simulated native host that speaks the real protocol. That means the tests run
          without models, a network or any audio hardware.
        </p>
      </ProjectSection>

      <ProjectSection id="capture" title="Recording everything except itself">
        <p>
          If the app reads an answer aloud, it mustn&rsquo;t then transcribe its own voice. The
          native host captures system audio with the app&rsquo;s own processes excluded. On Windows
          that brought an excluded player down to &minus;77.7 dBFS while everything else stayed at
          &minus;20. A second check drops any transcript text that matches what the app just said,
          in case something slips through.
        </p>
        <p>
          On Windows, opening the mic in the &ldquo;communications&rdquo; role tells Windows a call
          has started, and its default is to turn every other sound down by 80%, which is exactly
          the audio the app is trying to hear. So it uses the normal console role instead. And when
          your shortcut includes the Windows key, the host sends a masking key first so the Start
          menu doesn&rsquo;t open every time you ask something.
        </p>
      </ProjectSection>

      <ProjectSection id="context" title="Two passes over the same audio">
        <p>
          A fast speech model transcribes system audio all the time. When you press the key, the app
          freezes what it heard up to that moment, and while you&rsquo;re still talking it runs the
          slower, more accurate model over that stretch. When you let go it waits up to 2.5 seconds
          for the better text, and uses the fast version if it isn&rsquo;t ready.
        </p>
        <p>
          Then it picks which lines to send. By default that&rsquo;s the last 45 seconds, rounded
          out to whole lines.
        </p>
        <JoinContextWindow />
        <p>
          The system prompt tells the model the transcript may contain recognition errors, to keep
          what the speakers said separate from anything it adds, and never to invent a quote. If the
          audio doesn&rsquo;t answer the question, it should say so.
        </p>
      </ProjectSection>

      <ProjectSection id="speed" title="Fast enough to feel like a reply">
        <p>
          I set two targets: under a second from letting go to seeing your question, and under 2.5
          seconds to the first word of the answer. An end-to-end test plays a real clip through the
          simulated host, speaks a real question into the fake mic and checks the answer mentions
          the right thing.
        </p>
        <JoinLatencyChart />
        <p>
          The answer target held in every setup I measured. The question target didn&rsquo;t with
          whisper small on the CPU, which took about 1.35 seconds, and the automatic speed test
          still needs to learn not to pick it for questions on a machine like mine. The biggest
          single fix was loading the system prompt into the model&rsquo;s cache at startup, which
          took the first answer on a CPU-only setup from 3.56 seconds to 2.04.
        </p>
      </ProjectSection>

      <ProjectSection id="foldkit" title="FoldKit for the windows">
        <p>
          Every window is a FoldKit program, which is the Elm architecture on top of Effect: a
          model, a set of messages, a pure update function and a view. The main process broadcasts
          one app state, and the windows turn it into pixels and send back typed requests. The
          preload script exposes exactly two functions, and the main process checks every request
          against an Effect Schema and ignores anything that didn&rsquo;t come from one of its own
          windows.
        </p>
        <p>
          Because updates are pure, the bar&rsquo;s behaviour is tested as stories: given this state
          and these messages, expect these commands. The waveform is the one place that skips the
          virtual DOM, and writes its styles directly on each animation frame.
        </p>
        <ProjectNote title="Effect in the main process too.">
          Every service is a layer, every failure is a typed error with plain copy for the UI, and
          the main process and the windows share one set of Schemas for IPC, so a mismatch fails the
          type check instead of turning up at runtime.
        </ProjectNote>
      </ProjectSection>

      <ProjectSection id="cloudflare" title="A server it never needs">
        <p>
          The app works on a plane with the Wi-Fi off. I checked that by running the real-model test
          with nothing but loopback networking. So the Cloudflare side is optional, and the app
          never imports from it. It&rsquo;s the CAFE stack: Cloudflare and Alchemy here, FoldKit and
          Effect in the app.
        </p>
        <p>
          Alchemy defines a Worker, a D1 database and an R2 bucket in TypeScript, and the
          Worker&rsquo;s bindings are typed from that same file, so renaming one fails the type
          check. It serves a signed list of models, update details and feature flags, and has a
          store for syncing settings and history that only ever sees encrypted bytes. No audio,
          transcript or question ever reaches it.
        </p>
        <JoinManifestSteps />
        <p>
          It&rsquo;s tested against a real SQLite database with the same migrations, but I
          haven&rsquo;t deployed it. There&rsquo;s no real sign-in yet, and billing is a stub.
        </p>
      </ProjectSection>
    </>
  );
}
