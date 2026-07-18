import { readFile } from "node:fs/promises";
import { createMarketXpForecastRunner, type ForecastRunRequest } from "../model/v2.ts";
import { loadLocalEnvironment, requiredEnvironment } from "./load-env.ts";
import { createNeonForecastRunStore } from "./persistence.ts";

loadLocalEnvironment();
const serialized = await readFile(requiredEnvironment("MI_MARKET_XP_INPUT"), "utf8");
const request = JSON.parse(serialized) as ForecastRunRequest;
const artifact = createMarketXpForecastRunner().runArtifact(request);
const store = createNeonForecastRunStore(requiredEnvironment("DATABASE_URL"));

try {
  const receipt = await store.save(artifact);
  console.log(
    `${receipt.inserted ? "Created" : "Retained"} ${artifact.fixtureForecasts.length} fixture forecasts and ${artifact.snapshot.players.length} player horizons in ${receipt.runId}.`,
  );
} finally {
  await store.close();
}
