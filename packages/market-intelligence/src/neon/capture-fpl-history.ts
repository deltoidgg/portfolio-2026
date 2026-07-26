import {
  collectionFromBatch,
  createCollectionOrchestrator,
  createMemoryCaptureAttemptStore,
  nextDeadlineContext,
} from "../index.ts";
import { createFplElementSummarySource, createFplSource } from "../sources/index.ts";
import { loadLocalEnvironment, requiredEnvironment } from "./load-env.ts";
import { createNeonSeasonCatalog } from "./operations.ts";
import { createR2SnapshotStore } from "./r2-snapshot-store.ts";
import { getCurrentSeasonConfig } from "./season-config.ts";
import { createNeonStore } from "./store.ts";

loadLocalEnvironment();

const seasonConfig = getCurrentSeasonConfig();
const connectionString = requiredEnvironment("DATABASE_URL");
const marketStore = createNeonStore(connectionString);
const catalog = createNeonSeasonCatalog(connectionString);
const snapshotStore = createR2SnapshotStore({
  bucket: requiredEnvironment("R2_BUCKET"),
  endpoint:
    process.env.R2_ENDPOINT ??
    `https://${requiredEnvironment("CLOUDFLARE_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  accessKeyId: requiredEnvironment("R2_ACCESS_KEY_ID"),
  secretAccessKey: requiredEnvironment("R2_SECRET_ACCESS_KEY"),
});
const capturedAt = new Date().toISOString();

try {
  const season = await catalog.season(seasonConfig.key);
  if (!season) throw new Error(`Season ${seasonConfig.key} has not been synced`);
  const deadline = nextDeadlineContext(season.fixtures, capturedAt);
  if (!deadline) throw new Error(`No future deadline remains for ${season.label}`);
  const fplBatch = await createFplSource().capture({
    season: season.label,
    gameweek: deadline.gameweek,
    capturedAt,
    seasonGuard: {
      seasonKey: season.key,
      startsAt: season.startsAt,
      endsAt: season.endsAt,
      expectedTeams: season.teams.map((team) => team.shortName),
    },
  });
  const players = (fplBatch.entities ?? []).flatMap((entity) => {
    const id = entity.metadata?.fplElementId;
    return entity.type === "player" && typeof id === "number"
      ? [{ id, entityKey: entity.key }]
      : [];
  });
  const result = await createCollectionOrchestrator({
    attemptStore: createMemoryCaptureAttemptStore(),
    snapshotStore,
    marketStore,
  }).tick([
    {
      sourceKey: "fpl-element-summary",
      scopeKey: season.key,
      scheduledFor: capturedAt,
      async capture() {
        return collectionFromBatch(
          await createFplElementSummarySource().capture({
            seasonKey: season.key,
            season: season.label,
            playerIds: players.map((player) => player.id),
            entityKeys: Object.fromEntries(players.map((player) => [player.id, player.entityKey])),
            capturedAt,
          }),
        );
      },
    },
  ]);
  const [attempt] = result.attempts;
  if (!attempt || attempt.status !== "succeeded") {
    throw new Error(attempt?.error ?? "FPL history capture did not complete");
  }
  console.log(`Captured season-labelled history for ${players.length} FPL players.`);
} finally {
  await Promise.all([marketStore.close(), catalog.close()]);
}
