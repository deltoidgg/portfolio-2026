import { createFileRoute } from "@tanstack/react-router";
import { demoRoomQuery } from "market-intelligence/demo";
import { DeadlineIntelligenceRoom } from "../components/deadline-intelligence-room.tsx";
import "../deadline-room.css";
import { getDeadlineRoom } from "../lib/market-intelligence.functions.ts";
import { buildResearchMetadata } from "../lib/metadata.ts";

const description =
  "Replay how market prices, availability, and source disagreement changed Fantasy Premier League forecasts before the deadline.";

export const Route = createFileRoute("/intelligence")({
  loader: () => getDeadlineRoom({ data: demoRoomQuery }),
  head: () =>
    buildResearchMetadata({
      title: "FPL Deadline Intelligence Room",
      description,
      path: "/intelligence",
    }),
  component: IntelligencePage,
});

function IntelligencePage() {
  const room = Route.useLoaderData();
  return <DeadlineIntelligenceRoom initialRoom={room} query={demoRoomQuery} />;
}
