import { loadLocalEnvironment, requiredEnvironment } from "./load-env.ts";
import { getCurrentSeasonConfig } from "./season-config.ts";
import { createNeonStore } from "./store.ts";

loadLocalEnvironment();

const store = createNeonStore(requiredEnvironment("DATABASE_URL"));
const season = getCurrentSeasonConfig();
const horizons = (process.env.MI_FORECAST_HORIZONS ?? "1,3,5")
  .split(",")
  .map(Number)
  .filter((value): value is 1 | 3 | 5 => value === 1 || value === 3 || value === 5);
const freshAfter = Date.now() - 20 * 60_000;

try {
  for (const horizon of horizons) {
    const snapshot = await store.readLatestOpportunityMap({
      datasetKey: "live",
      seasonKey: season.key,
      horizon,
    });
    if (!snapshot) throw new Error(`No live ${horizon}-gameweek snapshot was published`);
    if (Date.parse(snapshot.observedAt) < freshAfter) {
      throw new Error(`The latest ${horizon}-gameweek snapshot is stale: ${snapshot.observedAt}`);
    }
    if (snapshot.players.length < 400) {
      throw new Error(
        `The ${horizon}-gameweek snapshot contains only ${snapshot.players.length} players`,
      );
    }
    if (
      snapshot.season.rulesetStatus !== "official" ||
      snapshot.season.rulesetKey !== season.rulesetKey
    ) {
      throw new Error(
        `The ${horizon}-gameweek snapshot uses ${snapshot.season.rulesetKey} (${snapshot.season.rulesetStatus})`,
      );
    }
    if (
      snapshot.season.officialRules?.source !== "fpl-game-config" ||
      snapshot.season.officialRules.budget !== 100 ||
      snapshot.season.officialRules.squadSize !== 15 ||
      snapshot.season.officialRules.startingSize !== 11 ||
      snapshot.season.officialRules.clubLimit !== 3
    ) {
      throw new Error(
        `The ${horizon}-gameweek snapshot does not contain the expected FPL game_config rules`,
      );
    }
    const unofficial = snapshot.players.filter((player) => player.price.status !== "official");
    if (unofficial.length > 0) {
      throw new Error(
        `The ${horizon}-gameweek snapshot contains ${unofficial.length} players without official prices`,
      );
    }
  }
  console.log(
    `Verified fresh official-price snapshots for ${horizons.join(", ")}-gameweek horizons.`,
  );
} finally {
  await store.close();
}
