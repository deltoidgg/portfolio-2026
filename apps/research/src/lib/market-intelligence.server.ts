import "@tanstack/react-start/server-only";
import {
  createMarketIntelligence,
  type DeadlineRoom,
  type DeadlineRoomQuery,
} from "market-intelligence";
import { createDemoDeadlineRoom } from "market-intelligence/demo";
import { createNeonStore } from "market-intelligence/neon";

export async function readDeadlineRoom(query: DeadlineRoomQuery): Promise<DeadlineRoom> {
  const connectionString = process.env.DATABASE_URL;
  const mode = process.env.MARKET_INTELLIGENCE_MODE;
  if (!connectionString || mode === "demo") return createDemoDeadlineRoom();

  const store = createNeonStore(connectionString);
  const intelligence = createMarketIntelligence({ store });
  try {
    return await intelligence.getDeadlineRoom(query);
  } catch (error) {
    const allowDevelopmentFallback =
      process.env.NODE_ENV !== "production" &&
      process.env.MARKET_INTELLIGENCE_DEMO_FALLBACK !== "false";
    if (
      allowDevelopmentFallback &&
      error instanceof Error &&
      error.message.startsWith("No deadline-room data")
    ) {
      return createDemoDeadlineRoom();
    }
    throw error;
  } finally {
    await store.close();
  }
}
