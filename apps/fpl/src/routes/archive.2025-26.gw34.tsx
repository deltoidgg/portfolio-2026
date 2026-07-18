import { createFileRoute } from "@tanstack/react-router";
import { demoRoomQuery } from "market-intelligence/demo";
import { DeadlineIntelligenceRoom } from "../components/deadline-intelligence-room.tsx";
import "../deadline-room.css";
import { getDeadlineRoom } from "../lib/market-intelligence.functions.ts";
import { buildFplMetadata } from "../lib/metadata.ts";

const description =
  "Replay how market prices, availability, and source disagreement changed FPL forecasts before the 2025/26 Gameweek 34 deadline.";

export const Route = createFileRoute("/archive/2025-26/gw34")({
  loader: () => getDeadlineRoom({ data: demoRoomQuery }),
  head: () =>
    buildFplMetadata({
      title: "Deadline Intelligence Room — 2025/26 archive",
      description,
      path: "/archive/2025-26/gw34",
    }),
  component: DeadlineRoomPage,
});

function DeadlineRoomPage() {
  const room = Route.useLoaderData();
  return <DeadlineIntelligenceRoom initialRoom={room} query={demoRoomQuery} />;
}
