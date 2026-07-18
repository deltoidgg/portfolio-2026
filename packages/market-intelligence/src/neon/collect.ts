import {
  collectionSlot,
  collectionFromBatch,
  createCollectionOrchestrator,
  nextDeadlineContext,
  type CollectionJob,
} from "../index.ts";
import { createPremierLeagueSeasonManifest } from "../season-schedule.ts";
import {
  createFplSource,
  createPolymarketFootballSource,
  createSeasonAwareOddsApiSource,
  registerFplBatchPlayers,
} from "../sources/index.ts";
import { loadLocalEnvironment, requiredEnvironment } from "./load-env.ts";
import { createNeonCaptureAttemptStore, createNeonSeasonCatalog } from "./operations.ts";
import { createR2SnapshotStore } from "./r2-snapshot-store.ts";
import { getCurrentSeasonConfig, getPremierLeagueFixturesUrl } from "./season-config.ts";
import { createNeonStore } from "./store.ts";

loadLocalEnvironment();
const currentSeasonConfig = getCurrentSeasonConfig();
const fixturesUrl = getPremierLeagueFixturesUrl();
const connectionString = requiredEnvironment("DATABASE_URL");
const marketStore = createNeonStore(connectionString);
const attemptStore = createNeonCaptureAttemptStore(connectionString);
const catalog = createNeonSeasonCatalog(connectionString);
const snapshotStore = createR2SnapshotStore({
  bucket: requiredEnvironment("R2_BUCKET"),
  endpoint:
    process.env.R2_ENDPOINT ??
    `https://${requiredEnvironment("CLOUDFLARE_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  accessKeyId: requiredEnvironment("R2_ACCESS_KEY_ID"),
  secretAccessKey: requiredEnvironment("R2_SECRET_ACCESS_KEY"),
});

const now = process.env.MI_COLLECT_AT ?? new Date().toISOString();

try {
  let manifest = await catalog.season(currentSeasonConfig.key);
  if (!manifest) {
    const response = await fetch(fixturesUrl);
    if (!response.ok) throw new Error(`Initial fixture sync failed: ${response.status}`);
    manifest = createPremierLeagueSeasonManifest({
      html: await response.text(),
      ...currentSeasonConfig,
    });
    await catalog.importManifest(manifest);
  }
  const context = nextDeadlineContext(manifest.fixtures, now);
  if (!context) {
    console.log(`No future deadline remains for ${manifest.label}; collection skipped.`);
  } else {
    const scopeKey = `${manifest.key}:gw${context.gameweek}`;
    const fplSlot = collectionSlot("fpl", context, now);
    const oddsSlot = collectionSlot("odds-api", context, now);
    const polymarketSlot = collectionSlot("polymarket", context, now);
    const scheduleSlot = collectionSlot("season-schedule", context, now);
    const fplSource = createFplSource();
    const polymarketSource = createPolymarketFootballSource();
    const jobs: CollectionJob[] = [
      {
        sourceKey: "premier-league-schedule",
        scopeKey: manifest.key,
        scheduledFor: scheduleSlot.scheduledFor,
        async capture() {
          const response = await fetch(fixturesUrl);
          if (!response.ok)
            throw new Error(`Premier League fixture sync failed: ${response.status}`);
          const html = await response.text();
          const updated = createPremierLeagueSeasonManifest({ html, ...currentSeasonConfig });
          await catalog.importManifest(updated);
          const batch = {
            id: `premier-league-schedule:${updated.key}:${now}`,
            source: {
              key: "premier-league-schedule",
              label: "Premier League fixtures",
              kind: "event-data" as const,
            },
            capturedAt: now,
            fixtures: [],
            rawSnapshots: [
              {
                key: `premier-league-schedule:${now}`,
                endpoint: fixturesUrl,
                observedAt: now,
                payload: html,
                statusCode: response.status,
              },
            ],
            observations: [],
            forecasts: [],
            annotations: [],
            metadata: {
              datasetKey: "live",
              seasonKey: updated.key,
              teamCount: updated.teams.length,
              fixtureCount: updated.fixtures.length,
            },
          };
          return collectionFromBatch(batch);
        },
      },
      {
        sourceKey: "fpl",
        scopeKey,
        scheduledFor: fplSlot.scheduledFor,
        async capture() {
          const batch = await fplSource.capture({
            season: manifest.label,
            gameweek: context.gameweek,
            capturedAt: now,
            seasonGuard: {
              seasonKey: manifest.key,
              startsAt: manifest.startsAt,
              endsAt: manifest.endsAt,
              expectedTeams: manifest.teams.map((team) => team.shortName),
            },
          });
          await registerFplBatchPlayers(catalog, manifest.key, batch);
          const publishedPrices = batch.observations.filter(
            (observation) => observation.metric === "price" && observation.numericValue,
          ).length;
          await catalog.updateSeasonState({
            seasonKey: manifest.key,
            ...(publishedPrices > 0 ? { priceState: "official" as const } : {}),
            ...(Date.parse(now) >= Date.parse(manifest.startsAt)
              ? { lifecycle: "active" as const }
              : {}),
          });
          return collectionFromBatch(batch);
        },
      },
      {
        sourceKey: "odds-api",
        scopeKey,
        scheduledFor: oddsSlot.scheduledFor,
        async capture() {
          const apiKey = process.env.THE_ODDS_API_KEY;
          if (!apiKey) throw new Error("THE_ODDS_API_KEY is not configured");
          const oddsSource = createSeasonAwareOddsApiSource({ apiKey, catalog });
          const batch = await oddsSource.capture({
            seasonKey: manifest.key,
            season: manifest.label,
            capturedAt: now,
            markets: process.env.MI_ODDS_MARKETS?.split(",").map((market) => market.trim()),
          });
          return collectionFromBatch(batch);
        },
      },
      {
        sourceKey: "polymarket",
        scopeKey: manifest.key,
        scheduledFor: polymarketSlot.scheduledFor,
        async capture() {
          return collectionFromBatch(
            await polymarketSource.capture({ seasonKey: manifest.key, capturedAt: now }),
          );
        },
      },
    ];
    const result = await createCollectionOrchestrator({
      attemptStore,
      snapshotStore,
      marketStore,
    }).tick(jobs);
    for (const attempt of result.attempts) {
      console.log(
        `${attempt.sourceKey}: ${attempt.status}${attempt.error ? ` — ${attempt.error}` : ""}`,
      );
    }
    if (result.attempts.every((attempt) => attempt.status === "failed")) process.exitCode = 1;
  }
} finally {
  await Promise.all([marketStore.close(), attemptStore.close(), catalog.close()]);
}
