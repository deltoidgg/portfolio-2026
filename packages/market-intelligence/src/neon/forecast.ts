import { readFile } from "node:fs/promises";
import { createMarketIntelligence } from "../market-intelligence.ts";
import { baselineForecastInputSchema, createBaselineForecastBatch } from "../model/index.ts";
import { loadLocalEnvironment, requiredEnvironment } from "./load-env.ts";
import { createNeonStore } from "./store.ts";

loadLocalEnvironment();
const inputPath = requiredEnvironment("MI_MODEL_INPUT");
const serialized = await readFile(inputPath, "utf8");
const untrustedInput: unknown = JSON.parse(serialized);
const input = baselineForecastInputSchema.parse(untrustedInput);
const store = createNeonStore(requiredEnvironment("DATABASE_URL"));
const intelligence = createMarketIntelligence({ store });

try {
  const receipt = await intelligence.ingest(createBaselineForecastBatch(input));
  console.log(
    `${receipt.inserted ? "Created" : "Retained"} ${receipt.forecasts} baseline forecasts in ${receipt.batchId}.`,
  );
} finally {
  await store.close();
}
