import { evaluateForecasts } from "../evaluation.ts";
import { loadLocalEnvironment, requiredEnvironment } from "./load-env.ts";
import { createNeonEvaluationStore, createNeonResultStore } from "./persistence.ts";
import { getCurrentSeasonConfig } from "./season-config.ts";

loadLocalEnvironment();
const currentSeasonConfig = getCurrentSeasonConfig();
const connectionString = requiredEnvironment("DATABASE_URL");
const results = createNeonResultStore(connectionString);
const evaluations = createNeonEvaluationStore(connectionString);

try {
  const configuredGameweek = Number(process.env.MI_GAMEWEEK);
  const gameweek =
    Number.isInteger(configuredGameweek) && configuredGameweek > 0
      ? configuredGameweek
      : await results.latestFinalGameweek(currentSeasonConfig.key);
  if (!gameweek) {
    console.log(
      `No final results are available for ${currentSeasonConfig.key}; evaluation skipped.`,
    );
  } else {
    const evaluation = evaluateForecasts({
      forecasts: await evaluations.forecasts(currentSeasonConfig.key, gameweek),
      results: await results.list(currentSeasonConfig.key, gameweek),
    });
    await evaluations.save({
      key: `${currentSeasonConfig.key}:gw${gameweek}:latest-predeadline:v1`,
      seasonKey: currentSeasonConfig.key,
      gameweek,
      cutoffPolicy: "latest forecast at or before the FPL deadline",
      result: evaluation,
    });
    console.log(`Evaluated ${evaluation.metrics.count} players for GW${gameweek}.`);
    console.log(JSON.stringify(evaluation.metrics));
  }
} finally {
  await Promise.all([results.close(), evaluations.close()]);
}
