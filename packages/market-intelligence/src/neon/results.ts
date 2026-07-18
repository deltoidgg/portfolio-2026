import { collectionFromBatch, createCollectionOrchestrator } from "../collector.ts";
import { createFplLiveSource, extractFplGameweekResults } from "../sources/fpl-live.ts";
import { loadLocalEnvironment, requiredEnvironment } from "./load-env.ts";
import { createNeonCaptureAttemptStore, createNeonSeasonCatalog } from "./operations.ts";
import { createNeonResultStore } from "./persistence.ts";
import { createR2SnapshotStore } from "./r2-snapshot-store.ts";
import { getCurrentSeasonConfig } from "./season-config.ts";
import { createNeonStore } from "./store.ts";

loadLocalEnvironment();
const currentSeasonConfig = getCurrentSeasonConfig();

async function main() {
  const connectionString = requiredEnvironment("DATABASE_URL");
  const observedAt = process.env.MI_COLLECT_AT ?? new Date().toISOString();
  const catalog = createNeonSeasonCatalog(connectionString);
  const marketStore = createNeonStore(connectionString);
  const attemptStore = createNeonCaptureAttemptStore(connectionString);
  const resultStore = createNeonResultStore(connectionString);
  try {
    const manifest = await catalog.season(currentSeasonConfig.key);
    if (!manifest) throw new Error(`Season ${currentSeasonConfig.key} has not been synced`);
    const explicitGameweek = Number(process.env.MI_GAMEWEEK);
    const gameweek =
      Number.isInteger(explicitGameweek) && explicitGameweek > 0
        ? explicitGameweek
        : manifest.fixtures
            .filter((fixture) => fixture.deadlineAt <= observedAt)
            .toSorted((left, right) => right.gameweek - left.gameweek)[0]?.gameweek;
    if (!gameweek) {
      console.log(`No started gameweek for ${manifest.label}; result capture skipped.`);
      return;
    }
    const gameweekFixtures = manifest.fixtures.filter((fixture) => fixture.gameweek === gameweek);
    if (gameweekFixtures.length === 0) {
      throw new Error(`No fixtures are assigned to ${manifest.key} GW${gameweek}`);
    }
    const lastKickoff = Math.max(
      ...gameweekFixtures.map((fixture) => Date.parse(fixture.kickoffAt)),
    );
    const automaticallyFinal = Date.parse(observedAt) > lastKickoff + 4 * 3_600_000;
    const status =
      process.env.MI_RESULTS_STATUS === "final" || automaticallyFinal ? "final" : "provisional";
    const cadenceMinutes = automaticallyFinal ? 1_440 : 10;
    const slot = new Date(
      Math.floor(Date.parse(observedAt) / (cadenceMinutes * 60_000)) * cadenceMinutes * 60_000,
    ).toISOString();
    const snapshotStore = createR2SnapshotStore({
      bucket: requiredEnvironment("R2_BUCKET"),
      endpoint:
        process.env.R2_ENDPOINT ??
        `https://${requiredEnvironment("CLOUDFLARE_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      accessKeyId: requiredEnvironment("R2_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnvironment("R2_SECRET_ACCESS_KEY"),
    });
    let capturedBatch:
      | Awaited<ReturnType<ReturnType<typeof createFplLiveSource>["capture"]>>
      | undefined;
    const attempt = await createCollectionOrchestrator({
      attemptStore,
      snapshotStore,
      marketStore,
    }).tick([
      {
        sourceKey: "fpl-live",
        scopeKey: `${currentSeasonConfig.key}:gw${gameweek}`,
        scheduledFor: slot,
        async capture() {
          capturedBatch = await createFplLiveSource().capture({
            seasonKey: currentSeasonConfig.key,
            season: currentSeasonConfig.label,
            gameweek,
            capturedAt: observedAt,
          });
          return collectionFromBatch(capturedBatch);
        },
      },
    ]);
    if (attempt.attempts[0]?.status === "skipped") {
      console.log(`FPL live GW${gameweek} slot ${slot} was already captured.`);
      return;
    }
    if (attempt.attempts[0]?.status !== "succeeded" || !capturedBatch) {
      throw new Error(attempt.attempts[0]?.error ?? "FPL live result capture failed");
    }
    const results = extractFplGameweekResults(capturedBatch, {
      seasonKey: currentSeasonConfig.key,
      gameweek,
      status,
      positions: await resultStore.positions(currentSeasonConfig.key),
    });
    await resultStore.save(results);
    console.log(`Stored ${results.length} ${status} player results for GW${gameweek}.`);
  } finally {
    await Promise.all([
      catalog.close(),
      marketStore.close(),
      attemptStore.close(),
      resultStore.close(),
    ]);
  }
}

await main();
