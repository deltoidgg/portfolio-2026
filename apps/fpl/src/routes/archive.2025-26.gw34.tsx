import { createFileRoute } from "@tanstack/react-router";
import { createDemoDeadlineRoom } from "market-intelligence/demo";
import { DeadlineIntelligenceRoom } from "../components/deadline-intelligence-room.tsx";
import "../deadline-room.css";
import { buildFplMetadata } from "../lib/metadata.ts";

const description =
  "Replay how betting odds, team news and disagreement between sources moved FPL forecasts before the 2025/26 Gameweek 34 deadline.";

export const Route = createFileRoute("/archive/2025-26/gw34")({
  loader: () => createDemoDeadlineRoom(),
  head: () =>
    buildFplMetadata({
      title: "Deadline room, 2025/26 GW34 archive",
      description,
      path: "/archive/2025-26/gw34",
    }),
  component: DeadlineRoomPage,
});

function DeadlineRoomPage() {
  const room = Route.useLoaderData();
  return <DeadlineIntelligenceRoom initialRoom={room} />;
}
