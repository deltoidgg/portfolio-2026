import { createDemoBatches, createDemoOpportunitySnapshot } from "../demo.ts";
import { createMarketIntelligence } from "../market-intelligence.ts";
import { loadLocalEnvironment, requiredEnvironment } from "./load-env.ts";
import { createNeonStore } from "./store.ts";

loadLocalEnvironment();
const store = createNeonStore(requiredEnvironment("DATABASE_URL"));
const intelligence = createMarketIntelligence({
  store,
});

let inserted = 0;
try {
  for (const batch of createDemoBatches()) {
    const receipt = await intelligence.ingest(batch);
    if (receipt.inserted) inserted += 1;
  }
  await intelligence.ingestOpportunitySnapshot(createDemoOpportunitySnapshot());
} finally {
  await store.close();
}

console.log(`Seeded ${inserted} new capture batches.`);
