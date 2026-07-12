import { ProjectFigure, ProjectSection } from "./project-layout";

export function OpenFGCProject() {
  return (
    <>
      <ProjectSection id="context" title="One audience, fragmented signals">
        <p>
          During the shift from offline to online events, smaller fighting-game tournament
          organisers had to explain audience value to sponsors using data spread across tournament,
          Steam, Twitch, and player sources. OpenFGC explored how those signals could become a
          coherent planning and presentation tool.
        </p>
        <p>
          I owned the product framing, interface design, and MVP implementation. The work is
          retained as an earlier end-to-end product case study: it demonstrates the decisions and
          system that were built, without claiming adoption or business impact that was not
          measured.
        </p>
      </ProjectSection>

      <ProjectSection id="information" title="Separate summary from investigation">
        <p>
          The core information-architecture decision was a two-speed product. A compact overview
          exposed the figures an organiser might need in a sponsor conversation; player profiles and
          breakdown views supported deeper comparisons and event planning.
        </p>
        <ProjectFigure
          src="/projects/openfgc-profile.webp"
          alt="OpenFGC player profile with audience and performance summaries"
          caption="Player profiles brought audience and performance signals into one comparable view instead of mirroring the structure of each source API."
        />
      </ProjectSection>

      <ProjectSection id="visualisation" title="Design the question before the chart">
        <p>
          The interface prioritised comparisons that could change a decision: player reach, game
          activity, event performance, and the relationship between participants and likely
          viewership. Decorative metrics were kept out of the summary layer and available only when
          a user moved into analysis.
        </p>
        <ProjectFigure
          src="/projects/openfgc-breakdown.webp"
          alt="OpenFGC breakdown view comparing player and event statistics"
          caption="The deeper analysis layer preserved the underlying dimensions while the overview remained presentation-ready."
        />
      </ProjectSection>

      <ProjectSection id="retrospective" title="What the prototype proved—and did not prove">
        <p>
          The build proved that the fragmented inputs could be normalised into a usable product
          model and that summary and analyst views could share that model. It did not establish a
          measured improvement in event outcomes, sponsor conversion, or organiser productivity.
        </p>
        <ProjectFigure
          src="/projects/openfgc-replay.webp"
          alt="OpenFGC replay analysis interface"
          caption="Replay analysis extended the same data model into match-level investigation without crowding the primary planning workflow."
        />
        <p>
          Restoring the original deployment at a maintained subdomain keeps the interaction
          inspectable. If I resumed product development, the next step would be organiser interviews
          and task-based validation before adding more metrics.
        </p>
      </ProjectSection>
    </>
  );
}
