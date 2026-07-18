import "@tanstack/react-start/server-only";
import {
  createMarketIntelligence,
  type DeadlineRoom,
  type DeadlineRoomQuery,
  type OpportunityMap,
  type OpportunityMapQuery,
  projectOpportunityMap,
} from "market-intelligence";
import { createDemoDeadlineRoom, createDemoOpportunitySnapshot } from "market-intelligence/demo";
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

export async function readOpportunityMap(query: OpportunityMapQuery): Promise<OpportunityMap> {
  const demo = createDemoOpportunitySnapshot();
  const isBundledScenario = query.datasetKey === demo.datasetKey;
  const isCurrent = query.datasetKey === "current";
  if (
    isBundledScenario &&
    (query.seasonKey !== demo.season.key ||
      query.fromGameweek !== demo.fromGameweek ||
      query.horizon !== demo.horizon)
  ) {
    throw new Error("The bundled prelaunch scenario only covers GW1 over a three-week horizon");
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString && (isBundledScenario || isCurrent)) {
    return projectOpportunityMap(demo);
  }
  if (!connectionString) {
    throw new Error(`DATABASE_URL is required for opportunity dataset ${query.datasetKey}`);
  }
  const store = createNeonStore(connectionString);
  const intelligence = createMarketIntelligence({ store });
  try {
    if (isCurrent) {
      const current = await store.readLatestOpportunityMap({
        datasetKey: "live",
        seasonKey: query.seasonKey,
        horizon: query.horizon,
      });
      return current ?? projectOpportunityMap(demo);
    }
    return await intelligence.getOpportunityMap(query);
  } catch (error) {
    if (
      (isBundledScenario || isCurrent) &&
      error instanceof Error &&
      error.message.startsWith("No opportunity-map data")
    ) {
      return projectOpportunityMap(demo);
    }
    throw error;
  } finally {
    await store.close();
  }
}
