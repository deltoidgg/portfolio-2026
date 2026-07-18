import { createMarketXpForecastRunner, prepareAutomatedForecast } from "../index.ts";
import { createNeonAutomatedForecastRepository } from "./automated-forecast.ts";
import { loadLocalEnvironment, requiredEnvironment } from "./load-env.ts";
import { createNeonForecastRunStore } from "./persistence.ts";
import { getCurrentSeasonConfig } from "./season-config.ts";

loadLocalEnvironment();
const currentSeasonConfig = getCurrentSeasonConfig();

function horizons(): Array<1 | 3 | 5> {
  const configured = process.env.MI_FORECAST_HORIZON
    ? [process.env.MI_FORECAST_HORIZON]
    : (process.env.MI_FORECAST_HORIZONS ?? "1,3,5").split(",");
  const values = [...new Set(configured.map(Number))];
  if (values.some((value) => value !== 1 && value !== 3 && value !== 5)) {
    throw new Error("MI_FORECAST_HORIZON(S) must contain only 1, 3, or 5");
  }
  return values as Array<1 | 3 | 5>;
}

const connectionString = requiredEnvironment("DATABASE_URL");
const repository = createNeonAutomatedForecastRepository(connectionString);
const store = createNeonForecastRunStore(connectionString);

try {
  const cutoffAt = process.env.MI_FORECAST_AT ?? new Date().toISOString();
  for (const horizon of horizons()) {
    const input = await repository.load({
      seasonKey: currentSeasonConfig.key,
      cutoffAt,
      horizon,
      codeVersion: process.env.GITHUB_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
    });
    if (!input) {
      console.log(
        `No ${horizon}-week forecast horizon is available for ${currentSeasonConfig.key}.`,
      );
    } else {
      const preparation = prepareAutomatedForecast(input);
      if (preparation.status === "skipped") {
        console.log(`Automated ${horizon}-week forecast skipped: ${preparation.reason}.`);
      } else {
        const artifact = createMarketXpForecastRunner().runArtifact(preparation.request);
        const receipt = await store.save(artifact);
        console.log(
          `${receipt.inserted ? "Created" : "Retained"} ${artifact.fixtureForecasts.length} fixture forecasts and ${artifact.snapshot.players.length} player horizons in ${receipt.runId}.`,
        );
      }
    }
  }
} finally {
  await Promise.all([repository.close(), store.close()]);
}
