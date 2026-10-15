import { projectImage } from "../../content/projects";
import { FplSignalTrace } from "./fpl-signal-trace";
import { ProjectFigure, ProjectNote, ProjectSection } from "./project-layout";

export function FplProject() {
  return (
    <>
      <ProjectSection id="why" title="Why build an FPL lab?">
        <p>
          Every Fantasy Premier League decision is really a guess about minutes, goals and clean
          sheets. Bookmakers put real money behind those same guesses every week, so I wanted to see
          how far you could get by turning their odds into FPL points, while keeping track of where
          every number came from.
        </p>
        <p>
          It started as a single &ldquo;deadline room&rdquo; that replayed the last 48 hours before
          a gameweek. For the 2026/27 season I rebuilt it around the things you actually do in FPL:
          pick a squad, look for cheaper options, and plan the next few weeks.
        </p>
      </ProjectSection>

      <ProjectSection id="tools" title="What’s in it">
        <p>
          <strong>The squad lab</strong> lets you build a 15-player squad at official prices. It
          knows the rules (a £100m budget, two keepers, five defenders, five midfielders, three
          forwards, no more than three from one club and a valid formation) and won&rsquo;t let you
          break them. You can look one, three or five gameweeks ahead, pick a captain and move
          players on and off the bench.
        </p>
        <p>
          There&rsquo;s a &ldquo;Suggest a valid squad&rdquo; button too. Honestly it&rsquo;s a
          simple greedy picker rather than a proper optimiser, but it gets you a sensible starting
          point to tinker with.
        </p>
        <ProjectFigure
          image={projectImage(
            "fpl/squad",
            "A suggested squad on the pitch, each player card showing expected points, price, range and ownership, next to a player pool and a price frontier chart",
          )}
          caption="A suggested squad. Each card shows expected points, the likely range and how much the sources agree, and the chart on the right shows what extra points cost at each price."
          wide
        />
        <p>
          <strong>The opportunity map</strong> plots every player by projected points against their
          chance of a big haul, so cheap alternatives and ownership gaps stand out. Click a player
          to see their range, fixtures and how much the sources agree. Filters and the horizon live
          in the URL, so a view is easy to share.
        </p>
        <ProjectFigure
          image={projectImage(
            "fpl/map",
            "The opportunity map with Erling Haaland selected, showing 13.4 projected points over three gameweeks, his price, ownership and a per-gameweek breakdown",
          )}
          caption="The opportunity map with a player selected. You always get a range from the 10th to the 90th percentile, not just one number."
          wide
        />
        <p>
          <strong>The archive</strong> keeps the original deadline room, a replay of the run-up to
          gameweek 34 of 2025/26. It runs on a fixed demo dataset now, but it&rsquo;s where the
          whole idea started.
        </p>
      </ProjectSection>

      <ProjectSection id="model" title="From odds to points">
        <p>
          Bookmakers build a margin into their prices, so the first step is stripping that out.
          Match odds and goal totals then become expected goals for each team, which get blended
          with each player&rsquo;s per-90 numbers and a prior for their position. The prior stops
          someone with 200 minutes of football from looking like a superstar.
        </p>
        <p>
          A versioned copy of the official scoring rules turns all that into a points range for each
          fixture, which gets added up over one, three or five gameweeks, including blanks and
          doubles. A range matters because six points on average can mean a safe six, or a coin flip
          between two and fifteen.
        </p>
        <FplSignalTrace />
      </ProjectSection>

      <ProjectSection id="pipeline" title="Keeping the receipts">
        <p>
          Every capture is stored as the raw response, compressed and named by its hash, in private
          Cloudflare R2 storage. Each forecast run gets an ID based on its exact inputs and code
          version, and anything captured after the cut-off is rejected. That means I can always go
          back and see what the model knew at a given moment, which you need if you ever want to
          check whether it was any good.
        </p>
        <p>
          Collection runs on GitHub Actions. A small calendar check fires every 15 minutes and only
          starts the real job when something is due: FPL data and odds every hour, or every 15
          minutes in the two days before a deadline.
        </p>
        <ProjectNote title="Fitting on a free plan.">
          The first version kept everything in Postgres on Neon, and it grew to around half a
          gigabyte. So I split it up. Raw captures and full forecasts live in R2, Neon only holds
          the small amount of state the app needs, and the site reads a published bundle. A budget
          check warns at 75 MB and refuses to grow past 100 MB.
        </ProjectNote>
      </ProjectSection>

      <ProjectSection id="status" title="Where it’s at">
        <p>
          The lab always shows the latest published snapshot. As I write this, that&rsquo;s a
          pre-season capture from late July, so treat the numbers as a demo of the tooling rather
          than this week&rsquo;s advice.
        </p>
        <p>
          The model is a deliberately simple baseline, and I won&rsquo;t call it an edge until
          it&rsquo;s been checked against FPL-only and fixture-only baselines over enough real
          deadlines. Next on the list is a transfer planner that simulates a few weeks of moves
          rather than one squad at a time.
        </p>
      </ProjectSection>
    </>
  );
}
