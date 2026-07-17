import { createMarketIntelligence } from "../market-intelligence.ts";
import { captureDeadlineIntelligence } from "../pipeline.ts";
import { createFplSource, createOddsApiSource } from "../sources/index.ts";
import { loadLocalEnvironment, requiredEnvironment } from "./load-env.ts";
import { createNeonStore } from "./store.ts";

loadLocalEnvironment();
const store = createNeonStore(requiredEnvironment("DATABASE_URL"));
const intelligence = createMarketIntelligence({
  store,
});
const source = process.argv[2];
const season = process.env.MI_SEASON ?? "2025/26";
const gameweek = Number(requiredEnvironment("MI_GAMEWEEK"));
if (!Number.isInteger(gameweek) || gameweek <= 0) throw new Error("MI_GAMEWEEK must be positive");

try {
  if (source === "fpl") {
    const receipt = await intelligence.capture(createFplSource(), { season, gameweek });
    console.log(`Captured ${receipt.observations} FPL observations in ${receipt.batchId}.`);
  } else if (source === "odds-api") {
    const receipt = await intelligence.capture(
      createOddsApiSource({ apiKey: requiredEnvironment("THE_ODDS_API_KEY") }),
      {
        season,
        gameweek,
        deadlineAt: requiredEnvironment("MI_DEADLINE_AT"),
      },
    );
    console.log(`Captured ${receipt.observations} odds observations in ${receipt.batchId}.`);
  } else if (source === "deadline") {
    const run = await captureDeadlineIntelligence({
      store,
      fplSource: createFplSource(),
      oddsSource: createOddsApiSource({ apiKey: requiredEnvironment("THE_ODDS_API_KEY") }),
      query: { competition: "EPL", season, gameweek },
      markets: process.env.MI_ODDS_MARKETS?.split(",").map((market) => market.trim()),
    });
    console.log(
      `Captured ${run.receipts.fpl.observations + run.receipts.odds.observations} observations and forecast ${run.room.players.length} players.`,
    );
  } else {
    throw new Error('Choose a source: "fpl", "odds-api", or "deadline"');
  }
} finally {
  await store.close();
}
