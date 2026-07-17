import { createFileRoute } from "@tanstack/react-router";
import { demoRoomQuery } from "market-intelligence/demo";
import { DeadlineIntelligenceRoom } from "../components/deadline-intelligence-room.tsx";
import "../deadline-room.css";
import { getDeadlineRoom } from "../lib/market-intelligence.functions.ts";
import { buildFplMetadata } from "../lib/metadata.ts";

const description =
  "Replay how market prices, availability, and source disagreement changed Fantasy Premier League forecasts before the deadline.";

export const Route = createFileRoute("/")({
  loader: () => getDeadlineRoom({ data: demoRoomQuery }),
  head: () =>
    buildFplMetadata({
      title: "Deadline Intelligence Room",
      description,
      path: "/",
    }),
  component: DeadlineRoomPage,
});

function DeadlineRoomPage() {
  const room = Route.useLoaderData();
  return <DeadlineIntelligenceRoom initialRoom={room} query={demoRoomQuery} />;
}
