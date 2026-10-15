import { projectImage } from "../../content/projects";
import { ProjectFigure, ProjectSection } from "./project-layout";

export function OpenFGCProject() {
  return (
    <>
      <ProjectSection id="background" title="The numbers were out there, just not in one place">
        <p>
          When the pandemic pushed fighting game tournaments online, smaller organisers suddenly had
          to pitch sponsors without the audience data bigger leagues take for granted. The
          information existed, spread across Steam player counts, Twitch viewers and tournament
          results. Nobody had pulled it together.
        </p>
        <p>
          OpenFGC did that. I handled the product side, the design and the build. It&rsquo;s an
          older project now, but it&rsquo;s still a good example of taking messy sources and turning
          them into something you can actually use in a meeting.
        </p>
      </ProjectSection>

      <ProjectSection id="overview" title="An overview you could put in a deck">
        <p>
          The front page lines up every game with players on Steam right now, Twitch viewers,
          tournament entrants and 90-day trends for each, plus a simple score to rank them. It was
          designed so an organiser could grab the handful of numbers a sponsor would ask about in a
          few seconds.
        </p>
        <p>
          I&rsquo;ve restored the original at openfgc.wasimarif.com, so it&rsquo;s still there to
          poke at.
        </p>
      </ProjectSection>

      <ProjectSection id="depth" title="Quick answers up front, detail underneath">
        <p>
          The main design decision was splitting quick summaries from deeper digging. The overview
          was for sponsor conversations. Player profiles and breakdowns were for planning an event
          or comparing players properly, and they kept all the underlying detail without cluttering
          the front page. These views come from the original designs.
        </p>
        <ProjectFigure
          image={projectImage(
            "openfgc/profile",
            "An OpenFGC player profile design for Knee, with season ranking, win rate, a skills radar, recent EVO 2018 matches, rival records and character matchups",
          )}
          caption="A player profile from the original designs: results, match history, rivals and character matchups in one place."
          wide
        />
        <ProjectFigure
          image={projectImage(
            "openfgc/breakdown",
            "An OpenFGC breakdown design comparing Paul Phoenix against Jin Kazama, with a table of moves, frame data and success rates, plus hit distribution and stage win rates",
          )}
          caption="The breakdown view went a level deeper, down to moves, frame data and stage win rates."
          wide
        />
      </ProjectSection>

      <ProjectSection id="looking-back" title="Looking back">
        <p>
          The build showed that the messy inputs could be cleaned up into one model that both the
          overview and the detailed views could share. What it didn&rsquo;t prove was impact. I
          never measured whether it helped anyone land a sponsor or run a better event, so I
          don&rsquo;t claim it did.
        </p>
        <ProjectFigure
          image={projectImage(
            "openfgc/replay",
            "An OpenFGC match replay design, with the Tokyo Masters grand final score, a health-difference chart and a timeline of lows, mids, highs, throws and movement next to the match video",
          )}
          caption="A replay analysis design that took the same data all the way down to individual rounds."
          wide
        />
        <p>
          If I picked it back up, I&rsquo;d start by sitting down with a few organisers and watching
          them use it before adding a single extra stat.
        </p>
      </ProjectSection>
    </>
  );
}
