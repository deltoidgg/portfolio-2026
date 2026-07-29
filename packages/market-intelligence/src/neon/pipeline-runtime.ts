import { gzipSync, gunzipSync } from "node:zlib";
import { Pool } from "@neondatabase/serverless";
import type { CaptureBatch, JsonValue } from "../contracts.ts";
import { evaluateForecasts, type EvaluationForecast } from "../evaluation.ts";
import { canonicalJson, sha256Hex, type ArtifactStore } from "../hot-cold/artifact-store.ts";
import {
  createOpportunityReplayArtifact,
  createPublishedOpportunityBundle,
  currentOpportunityManifestSchema,
  forecastBundleArtifactSchema,
  opportunityReplayArtifactSchema,
  publishedOpportunityBundleSchema,
  type CurrentOpportunityManifestV1,
  type ForecastBundleArtifactV1,
  type PublishedOpportunityBundleV1,
} from "../hot-cold/artifacts.ts";
import { prepareCompactForecast } from "../hot-cold/compact-forecast.ts";
import type { CanonicalCaptureCommit, HotArtifactReference } from "../hot-cold/hot-state.ts";
import {
  projectFplCurrentState,
  projectFplPlayerPriors,
  projectOddsConsensus,
} from "../hot-cold/projectors.ts";
import { publishOpportunityArtifacts } from "../hot-cold/publication.ts";
import {
  createScheduledPipeline,
  isEligibleDeadlineCheckpoint,
  type PipelinePlan,
  type PipelineSource,
  type PipelineWorker,
  type ScheduledPipelineInput,
} from "../hot-cold/scheduled-pipeline.ts";
import { createMarketXpForecastRunner, type ForecastHorizonsRequest } from "../model/v2.ts";
import { opportunitySnapshotSchema } from "../opportunity-map.ts";
import { fplGameweekFinalisationAt } from "../result-finalisation.ts";
import { createPremierLeagueSeasonManifest } from "../season-schedule.ts";
import type { FixtureLink, SeasonCatalog } from "../season-domain.ts";
import {
  createFplElementSummarySource,
  createFplLiveSource,
  createFplSource,
  createSeasonAwareOddsApiSource,
  extractFplGameweekResults,
} from "../sources/index.ts";
import { requiredEnvironment } from "./load-env.ts";
import { createNeonSeasonCatalog, type NeonSeasonCatalog } from "./operations.ts";
import {
  createNeonPublicationRepository,
  type NeonPublicationRepository,
} from "./publication-repository.ts";
import { createR2ArtifactStore } from "./r2-artifact-store.ts";
import { createR2SnapshotStore } from "./r2-snapshot-store.ts";
import { getCurrentSeasonConfig, getPremierLeagueFixturesUrl } from "./season-config.ts";
import {
  createNeonHotStateRepository,
  type NeonHotStateRepository,
} from "./hot-state-repository.ts";

type CurrentPlayer = {
  id: number;
  entityKey: string;
  registrationKey: string;
};

function bool(value: string | undefined): boolean {
  return value === "1" || value?.toLocaleLowerCase() === "true";
}

function pipelineSources(value: string | undefined): PipelineSource[] {
  if (!value) return [];
  const allowed = new Set<PipelineSource>([
    "premier-league-schedule",
    "fpl",
    "fpl-element-summary",
    "odds-api",
  ]);
  return [
    ...new Set(
      value
        .split(",")
        .map((source) => source.trim())
        .filter((source): source is PipelineSource => allowed.has(source as PipelineSource)),
    ),
  ];
}

export async function planScheduledPipeline(input: ScheduledPipelineInput): Promise<PipelinePlan> {
  const enabled = bool(process.env.MI_COLLECTION_ENABLED);
  const nominalSlot = process.env.MI_NOMINAL_SLOT ?? input.now;
  if (input.mode === "auto" && !enabled) {
    return {
      nominalSlot,
      dueSources: [],
      retentionDue: false,
      finalisationDue: false,
      verificationDue: false,
      reason: "MI_COLLECTION_ENABLED is false",
    };
  }
  const autoSources = pipelineSources(process.env.MI_DUE_SOURCES);
  const dueSources =
    input.mode === "force-collect"
      ? pipelineSources(
          process.env.MI_DUE_SOURCES ?? "premier-league-schedule,fpl,fpl-element-summary,odds-api",
        )
      : input.mode === "auto"
        ? autoSources
        : [];
  return {
    nominalSlot,
    dueSources,
    retentionDue: input.mode === "retention" || bool(process.env.MI_RETENTION_DUE),
    finalisationDue: input.mode === "finalise" || bool(process.env.MI_FINALISATION_DUE),
    verificationDue: input.mode === "verify" || bool(process.env.MI_VERIFICATION_DUE),
    reason: process.env.MI_GATE_REASON ?? `${input.mode} pipeline request`,
  };
}

function r2Endpoint(): string {
  return (
    process.env.R2_ENDPOINT ??
    `https://${requiredEnvironment("CLOUDFLARE_ACCOUNT_ID")}.r2.cloudflarestorage.com`
  );
}

function privateArtifactStore(): ArtifactStore {
  return createR2ArtifactStore({
    bucket: requiredEnvironment("R2_PRIVATE_BUCKET"),
    endpoint: r2Endpoint(),
    accessKeyId: requiredEnvironment("R2_PRIVATE_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnvironment("R2_PRIVATE_SECRET_ACCESS_KEY"),
  });
}

function publicArtifactStore(): ArtifactStore {
  return createR2ArtifactStore({
    bucket: requiredEnvironment("R2_PUBLIC_BUCKET"),
    endpoint: r2Endpoint(),
    accessKeyId: requiredEnvironment("R2_PUBLIC_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnvironment("R2_PUBLIC_SECRET_ACCESS_KEY"),
  });
}

function jsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function jsonRecord(value: unknown): Record<string, JsonValue> {
  return jsonValue(value) as Record<string, JsonValue>;
}

async function storeRawBatch(
  batch: CaptureBatch,
  snapshotStore: ReturnType<typeof createR2SnapshotStore>,
): Promise<HotArtifactReference[]> {
  const references: HotArtifactReference[] = [];
  for (const snapshot of batch.rawSnapshots) {
    if (snapshot.payload === undefined) continue;
    const stored = await snapshotStore.put({
      sourceKey: batch.source.key,
      endpoint: snapshot.endpoint,
      observedAt: snapshot.observedAt,
      payload: snapshot.payload,
      ...(snapshot.rawBody === undefined ? {} : { rawBody: snapshot.rawBody }),
      ...(snapshot.statusCode === undefined ? {} : { statusCode: snapshot.statusCode }),
    });
    references.push({
      key: stored.objectKey,
      sha256: stored.sha256,
      compressedBytes: stored.compressedBytes,
      uncompressedBytes: stored.uncompressedBytes,
    });
  }
  return references;
}

function modelPlayerState(state: NonNullable<CanonicalCaptureCommit["playerStates"]>[number]) {
  return {
    registrationKey: state.registrationKey,
    seasonKey: state.seasonKey,
    availabilityProbability: state.availabilityProbability,
    chanceOfPlayingThisRound: state.chanceOfPlayingThisRound,
    minutes: state.minutes,
    starts: state.starts,
    ownership: state.ownership,
    expectedGoals: state.expectedGoals,
    expectedAssists: state.expectedAssists,
    expectedGoalsPer90: state.expectedGoalsPer90,
    expectedAssistsPer90: state.expectedAssistsPer90,
    savesPer90: state.savesPer90,
    defensiveContributionsPer90: state.defensiveContributionsPer90,
    cardsPer90: state.cardsPer90,
    expectedPointsNext: state.expectedPointsNext,
  };
}

async function captureHashes(input: {
  sourceKey: string;
  playerStates?: CanonicalCaptureCommit["playerStates"];
  playerPriors?: CanonicalCaptureCommit["playerPriors"];
  fixtureMarkets?: CanonicalCaptureCommit["fixtureMarkets"];
  schedule?: unknown;
  semanticMetadata?: unknown;
}) {
  const displayState = {
    sourceKey: input.sourceKey,
    playerStates: input.playerStates?.map(({ observedAt: _, ...state }) => state),
    playerPriors: input.playerPriors?.map(
      ({ observedAt: _, sourceArtifact: __, ...state }) => state,
    ),
    fixtureMarkets: input.fixtureMarkets?.map(({ observedAt: _, ...state }) => state),
    schedule: input.schedule,
    semanticMetadata: input.semanticMetadata,
  };
  const modelState = {
    sourceKey: input.sourceKey,
    playerStates: input.playerStates?.map(modelPlayerState),
    playerPriors: input.playerPriors?.map(
      ({ observedAt: _, rowHash: __, sourceArtifact: ___, ...prior }) => prior,
    ),
    fixtureMarkets: input.fixtureMarkets?.map(
      ({ observedAt: _, rowHash: __, ...market }) => market,
    ),
    schedule: input.schedule,
    semanticMetadata: input.semanticMetadata,
  };
  return {
    captureHash: await sha256Hex(canonicalJson(displayState)),
    modelInputHash: await sha256Hex(canonicalJson(modelState)),
  };
}

function bufferedCatalog(catalog: NeonSeasonCatalog): {
  catalog: SeasonCatalog;
  flush(): Promise<void>;
} {
  const links: FixtureLink[] = [];
  return {
    catalog: {
      importManifest: (manifest) => catalog.importManifest(manifest),
      season: (key) => catalog.season(key),
      fixturesForSeason: (key) => catalog.fixturesForSeason(key),
      teamByAlias: (seasonKey, alias) => catalog.teamByAlias(seasonKey, alias),
      registerPlayer: (input) => catalog.registerPlayer(input),
      registrationsForPlayer: (playerKey) => catalog.registrationsForPlayer(playerKey),
      fixtureLink: (sourceKey, seasonKey, sourceEventId) =>
        catalog.fixtureLink(sourceKey, seasonKey, sourceEventId),
      async saveFixtureLink(link) {
        links.push(link);
      },
      updateSeasonState: (input) => catalog.updateSeasonState(input),
    },
    async flush() {
      await catalog.saveFixtureLinks(links);
    },
  };
}

async function decodeGzipArtifact<T>(
  store: ArtifactStore,
  key: string,
  parse: (value: unknown) => T,
): Promise<T> {
  const object = await store.get(key);
  if (!object) throw new Error(`Artifact ${key} is missing`);
  return parse(JSON.parse(new TextDecoder().decode(gunzipSync(object.body))));
}

async function verifyGzipArtifact<T>(
  store: ArtifactStore,
  reference: CurrentOpportunityManifestV1["artifact"],
  parse: (value: unknown) => T,
): Promise<T> {
  const object = await store.get(reference.key);
  if (!object) throw new Error(`Artifact ${reference.key} is missing`);
  if (
    object.body.byteLength !== reference.compressedBytes ||
    (await sha256Hex(object.body)) !== reference.objectSha256
  ) {
    throw new Error(`Artifact ${reference.key} failed compressed verification`);
  }
  const body = new Uint8Array(gunzipSync(object.body));
  if (
    body.byteLength !== reference.uncompressedBytes ||
    (await sha256Hex(body)) !== reference.contentSha256
  ) {
    throw new Error(`Artifact ${reference.key} failed canonical verification`);
  }
  return parse(JSON.parse(new TextDecoder().decode(body)));
}

function insertedBytes(receipt: { inserted: boolean; bytes: number }): number {
  return receipt.inserted ? receipt.bytes : 0;
}

async function saveDeadlineCheckpoint(input: {
  pool: Pool;
  seasonKey: string;
  deadlineAt: string;
  snapshot: ReturnType<typeof opportunitySnapshotSchema.parse>;
  publicationId: string;
  artifactKey: string;
  artifactHash: string;
  publishedAt: string;
}): Promise<boolean> {
  if (
    !isEligibleDeadlineCheckpoint({
      forecastObservedAt: input.snapshot.observedAt,
      publishedAt: input.publishedAt,
      deadlineAt: input.deadlineAt,
    })
  ) {
    return false;
  }
  const gameweek = input.snapshot.fromGameweek;
  const client = await input.pool.connect();
  try {
    await client.query("begin");
    const existing = await client.query<{ cutoff_at: string }>(
      `select cutoff_at from mi_deadline_forecast_checkpoints
       where season_key = $1 and gameweek = $2 for update`,
      [input.seasonKey, gameweek],
    );
    if (
      existing.rows[0]?.cutoff_at &&
      new Date(existing.rows[0].cutoff_at).toISOString() > input.snapshot.observedAt
    ) {
      await client.query("rollback");
      return false;
    }
    await client.query(
      `insert into mi_deadline_forecast_checkpoints
       (season_key, gameweek, deadline_at, publication_id, cutoff_at, artifact_key, artifact_hash, row_count)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (season_key, gameweek) do update set
         deadline_at = excluded.deadline_at,
         publication_id = excluded.publication_id,
         cutoff_at = excluded.cutoff_at,
         artifact_key = excluded.artifact_key,
         artifact_hash = excluded.artifact_hash,
         row_count = excluded.row_count`,
      [
        input.seasonKey,
        gameweek,
        input.deadlineAt,
        input.publicationId,
        input.snapshot.observedAt,
        input.artifactKey,
        input.artifactHash,
        input.snapshot.players.length,
      ],
    );
    await client.query(
      `delete from mi_deadline_forecast_rows where season_key = $1 and gameweek = $2`,
      [input.seasonKey, gameweek],
    );
    for (const player of input.snapshot.players) {
      await client.query(
        `insert into mi_deadline_forecast_rows
         (season_key, gameweek, registration_key, expected_points, p10, p90, haul_probability)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          input.seasonKey,
          gameweek,
          player.registrationKey,
          player.expectedPoints,
          player.p10,
          player.p90,
          player.haulProbability,
        ],
      );
    }
    await client.query("commit");
    return true;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

type RuntimeResources = {
  pool: Pool;
  hot: NeonHotStateRepository;
  catalog: NeonSeasonCatalog;
  publications: NeonPublicationRepository;
  privateStore: ArtifactStore;
  publicStore: ArtifactStore;
};

function currentKey(channel: "next" | "production", seasonSlug: string): string {
  return `serving/v1/${channel}/${seasonSlug}/current.json`;
}

async function openRuntime(input: ScheduledPipelineInput): Promise<PipelineWorker> {
  const season = getCurrentSeasonConfig();
  const seasonSlug = season.key.replaceAll(":", "-");
  const pool = new Pool({ connectionString: requiredEnvironment("DATABASE_URL") });
  const resources: RuntimeResources = {
    pool,
    hot: createNeonHotStateRepository(pool),
    catalog: createNeonSeasonCatalog(pool),
    publications: createNeonPublicationRepository(pool),
    privateStore: privateArtifactStore(),
    publicStore: publicArtifactStore(),
  };
  const snapshotStore = createR2SnapshotStore({
    bucket: requiredEnvironment("R2_PRIVATE_BUCKET"),
    endpoint: r2Endpoint(),
    accessKeyId: requiredEnvironment("R2_PRIVATE_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnvironment("R2_PRIVATE_SECRET_ACCESS_KEY"),
  });
  let currentPlayers: CurrentPlayer[] = [];
  let cachedManifest = await resources.catalog.season(season.key);

  async function registrationPlayers(missingPriorsOnly: boolean): Promise<CurrentPlayer[]> {
    const result = await resources.pool.query<{
      fpl_element_id: number;
      player_key: string;
      registration_key: string;
    }>(
      `select r.fpl_element_id, r.player_key, r.registration_key
       from mi_player_registrations r
       left join mi_player_priors_current p on p.registration_key = r.registration_key
       where r.season_key = $1 and r.fpl_element_id is not null
         and ($2::boolean = false or p.registration_key is null)
       order by r.fpl_element_id`,
      [season.key, missingPriorsOnly],
    );
    return result.rows.map((row) => ({
      id: row.fpl_element_id,
      entityKey: row.player_key,
      registrationKey: row.registration_key,
    }));
  }

  async function collectSource(
    sourceKey: PipelineSource,
    nominalSlot: string,
  ): ReturnType<PipelineWorker["collect"]> {
    const now = input.now;
    let batch: CaptureBatch;
    let scheduleSemantic: unknown;
    let healthMetadataExtra: Record<string, JsonValue> = {};
    let flush: () => Promise<void> = async () => undefined;
    if (sourceKey === "premier-league-schedule") {
      const response = await fetch(getPremierLeagueFixturesUrl(), {
        headers: { Accept: "text/html", "User-Agent": "fpl.wasimarif.com research collector" },
      });
      if (!response.ok) throw new Error(`Premier League fixture sync failed: ${response.status}`);
      const html = await response.text();
      const manifest = createPremierLeagueSeasonManifest({ html, ...season });
      if (manifest.teams.length !== 20 || manifest.fixtures.length !== 380) {
        throw new Error(
          `Fixture guard rejected ${manifest.teams.length} teams and ${manifest.fixtures.length} fixtures`,
        );
      }
      cachedManifest = manifest;
      scheduleSemantic = {
        teams: manifest.teams,
        fixtures: manifest.fixtures,
        rulesetKey: manifest.rulesetKey,
      };
      batch = {
        id: `premier-league-schedule:${season.key}:${now}`,
        source: {
          key: "premier-league-schedule",
          label: "Premier League fixtures",
          kind: "event-data",
        },
        capturedAt: now,
        fixtures: [],
        rawSnapshots: [
          {
            key: `premier-league-schedule:${now}`,
            endpoint: getPremierLeagueFixturesUrl(),
            observedAt: now,
            payload: html,
            rawBody: JSON.stringify(html),
            statusCode: response.status,
          },
        ],
        observations: [],
        forecasts: [],
        annotations: [],
      };
      flush = async () => resources.catalog.importManifest(manifest);
    } else {
      const manifest = cachedManifest;
      if (!manifest) throw new Error(`Season ${season.key} has not been synced`);
      const nextFixture = manifest.fixtures
        .filter((fixture) => fixture.deadlineAt >= now)
        .toSorted((left, right) => left.deadlineAt.localeCompare(right.deadlineAt))[0];
      if (sourceKey === "fpl") {
        const gameweek =
          nextFixture?.gameweek ??
          manifest.fixtures
            .filter((fixture) => fixture.deadlineAt <= now)
            .toSorted((left, right) => right.gameweek - left.gameweek)[0]?.gameweek;
        if (!gameweek) throw new Error(`No active gameweek is available for ${season.key}`);
        batch = await createFplSource().capture({
          season: manifest.label,
          gameweek,
          capturedAt: now,
          seasonGuard: {
            seasonKey: manifest.key,
            startsAt: manifest.startsAt,
            endsAt: manifest.endsAt,
            expectedTeams: manifest.teams.map((team) => team.shortName),
          },
        });
        currentPlayers = (batch.entities ?? []).flatMap((entity) => {
          const id = entity.metadata?.fplElementId;
          const registrationKey = entity.metadata?.registrationKey;
          return entity.type === "player" &&
            typeof id === "number" &&
            typeof registrationKey === "string"
            ? [{ id, entityKey: entity.key, registrationKey }]
            : [];
        });
        const publishedPrices = batch.observations.some(
          (observation) => observation.metric === "price" && observation.numericValue,
        );
        const targetLifecycle =
          Date.parse(now) >= Date.parse(manifest.startsAt) ? ("active" as const) : undefined;
        const dimensionHash = await sha256Hex(
          canonicalJson({
            entities: (batch.entities ?? [])
              .map((entity) => ({
                key: entity.key,
                type: entity.type,
                name: entity.name,
                teamKey: entity.teamKey,
                metadata: entity.metadata,
              }))
              .toSorted((left, right) => left.key.localeCompare(right.key)),
            aliases: (batch.entityAliases ?? [])
              .map(({ effectiveFrom: _, effectiveTo: __, ...alias }) => alias)
              .toSorted(
                (left, right) =>
                  left.sourceEntityKey.localeCompare(right.sourceEntityKey) ||
                  (left.seasonKey ?? "").localeCompare(right.seasonKey ?? ""),
              ),
            rulesetChecksum: batch.metadata?.rulesetChecksum,
            priceState: publishedPrices ? "official" : undefined,
            lifecycle: targetLifecycle,
          }),
        );
        healthMetadataExtra = { dimensionHash };
        flush = async () => {
          const previous = await resources.pool.query<{ dimension_hash: string | null }>(
            `select health_metadata->>'dimensionHash' as dimension_hash
             from mi_source_heads where source_key = 'fpl' and season_key = $1`,
            [manifest.key],
          );
          if (previous.rows[0]?.dimension_hash === dimensionHash) return;
          await resources.catalog.saveFplCaptureDimensions(manifest.key, batch);
          await resources.catalog.updateSeasonState({
            seasonKey: manifest.key,
            ...(publishedPrices ? { priceState: "official" as const } : {}),
            ...(targetLifecycle ? { lifecycle: targetLifecycle } : {}),
          });
        };
      } else if (sourceKey === "fpl-element-summary") {
        const missingPlayers = await registrationPlayers(true);
        const missingIds = new Set(missingPlayers.map((player) => player.id));
        const players =
          currentPlayers.length > 0
            ? currentPlayers.filter((player) => missingIds.has(player.id))
            : missingPlayers;
        if (players.length === 0) {
          return {
            sourceKey,
            rawObjects: [],
            captureHash: "0".repeat(64),
            modelInputHash: "0".repeat(64),
            modelInputChanged: false,
            displayStateChanged: false,
            sourceHealthChanged: false,
            changedRows: { playerStates: 0, playerPriors: 0, fixtureMarkets: 0 },
          };
        }
        batch = await createFplElementSummarySource().capture({
          seasonKey: manifest.key,
          season: manifest.label,
          playerIds: players.map((player) => player.id),
          entityKeys: Object.fromEntries(players.map((player) => [player.id, player.entityKey])),
          capturedAt: now,
        });
        currentPlayers = players;
      } else {
        const buffered = bufferedCatalog(resources.catalog);
        batch = await createSeasonAwareOddsApiSource({
          apiKey: requiredEnvironment("THE_ODDS_API_KEY"),
          catalog: buffered.catalog,
        }).capture({
          seasonKey: manifest.key,
          season: manifest.label,
          capturedAt: now,
          markets: (process.env.MI_ODDS_MARKETS ?? "h2h,totals")
            .split(",")
            .map((market) => market.trim()),
        });
        flush = async () => {
          await buffered.flush();
          await resources.catalog.saveCaptureDimensions(batch);
        };
      }
    }

    const rawObjects = await storeRawBatch(batch, snapshotStore);
    const scopeKey =
      sourceKey === "fpl" || sourceKey === "odds-api"
        ? `${season.key}:gw${
            cachedManifest?.fixtures
              .filter((fixture) => fixture.deadlineAt >= now)
              .toSorted((left, right) => left.deadlineAt.localeCompare(right.deadlineAt))[0]
              ?.gameweek ?? "season"
          }`
        : season.key;
    const slot = {
      attemptKey: `${sourceKey}:${scopeKey}:${nominalSlot}`,
      sourceKey,
      seasonKey: season.key,
      scopeKey,
      scheduledFor: nominalSlot,
    };
    const claimed = await resources.hot.claim(slot);
    if (!claimed) {
      return {
        sourceKey,
        rawObjects,
        captureHash: "0".repeat(64),
        modelInputHash: "0".repeat(64),
        modelInputChanged: false,
        displayStateChanged: false,
        sourceHealthChanged: false,
        changedRows: { playerStates: 0, playerPriors: 0, fixtureMarkets: 0 },
      };
    }
    try {
      await flush();
      const entityRegistrations = Object.fromEntries(
        currentPlayers.map((player) => [player.entityKey, player.registrationKey]),
      );
      const playerStates =
        sourceKey === "fpl" ? await projectFplCurrentState(batch, season.key) : undefined;
      const playerPriors =
        sourceKey === "fpl-element-summary"
          ? (await projectFplPlayerPriors(batch, season.key, entityRegistrations)).map((prior) => {
              const playerIndex = currentPlayers.findIndex(
                (player) => player.registrationKey === prior.registrationKey,
              );
              const sourceArtifact = playerIndex < 0 ? undefined : rawObjects[playerIndex];
              return {
                ...prior,
                ...(sourceArtifact
                  ? {
                      sourceArtifact: {
                        key: sourceArtifact.key,
                        sha256: sourceArtifact.sha256,
                      },
                    }
                  : {}),
              };
            })
          : undefined;
      const fixtureMarkets =
        sourceKey === "odds-api" ? await projectOddsConsensus(batch, season.key) : undefined;
      let stateRowCount: number | undefined;
      const hashes =
        sourceKey === "fpl-element-summary" && playerPriors
          ? await (async () => {
              const existing = await resources.pool.query<{
                registration_key: string;
                row_hash: string;
              }>(
                `select registration_key, row_hash from mi_player_priors_current
                 where season_key = $1`,
                [season.key],
              );
              const rowHashes = new Map(
                existing.rows.map((row) => [row.registration_key, row.row_hash]),
              );
              for (const prior of playerPriors) {
                rowHashes.set(prior.registrationKey, prior.rowHash);
              }
              stateRowCount = rowHashes.size;
              const hash = await sha256Hex(
                canonicalJson({
                  sourceKey,
                  rows: [...rowHashes]
                    .map(([registrationKey, rowHash]) => ({ registrationKey, rowHash }))
                    .toSorted((left, right) =>
                      left.registrationKey.localeCompare(right.registrationKey),
                    ),
                }),
              );
              return { captureHash: hash, modelInputHash: hash };
            })()
          : await captureHashes({
              sourceKey,
              playerStates,
              playerPriors,
              fixtureMarkets,
              schedule: scheduleSemantic,
              semanticMetadata:
                sourceKey === "fpl"
                  ? { rulesetChecksum: batch.metadata?.rulesetChecksum }
                  : undefined,
            });
      const commit = await resources.hot.commit({
        slot,
        batchId: batch.id,
        capturedAt: batch.capturedAt,
        ...hashes,
        rawObjects,
        playerStates,
        playerPriors,
        fixtureMarkets,
        ...(stateRowCount === undefined ? {} : { stateRowCount }),
        healthMetadata: {
          ...healthMetadataExtra,
          coverage:
            sourceKey === "premier-league-schedule"
              ? 1
              : sourceKey === "odds-api"
                ? Math.min(1, (fixtureMarkets?.length ?? 0) / 10)
                : Math.min(
                    1,
                    (stateRowCount ?? playerStates?.length ?? playerPriors?.length ?? 0) / 500,
                  ),
          detail: `${
            stateRowCount ??
            playerStates?.length ??
            playerPriors?.length ??
            fixtureMarkets?.length ??
            0
          } compact rows`,
        },
      });
      return {
        sourceKey,
        rawObjects,
        captureHash: hashes.captureHash,
        modelInputHash: hashes.modelInputHash,
        modelInputChanged: commit.modelInputChanged,
        displayStateChanged: commit.captureChanged && !commit.modelInputChanged,
        sourceHealthChanged: commit.sourceHealthChanged,
        changedRows: commit.changedRows,
      };
    } catch (error) {
      await resources.hot.fail({
        slot,
        finishedAt: now,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async function finaliseGameweek(now: string): ReturnType<PipelineWorker["finalise"]> {
    const fixtureRows = await resources.pool.query<{
      gameweek: number;
      last_kickoff_at: string;
    }>(
      `select gameweek, max(kickoff_at)::text as last_kickoff_at
       from mi_fixtures where season_key = $1
       group by gameweek order by gameweek`,
      [season.key],
    );
    const configured = Number(process.env.MI_GAMEWEEK);
    const completedEvaluations = await resources.pool.query<{
      gameweek: number;
      evaluation_key: string;
    }>(
      `select gameweek, evaluation_key from mi_evaluation_runs
       where season_key = $1`,
      [season.key],
    );
    const completedByGameweek = new Map(
      completedEvaluations.rows.map((row) => [row.gameweek, row.evaluation_key]),
    );
    if (Number.isInteger(configured) && configured > 0 && completedByGameweek.has(configured)) {
      return {
        status: "final",
        gameweek: configured,
        evaluationStatus: "completed",
        evaluationKey: completedByGameweek.get(configured),
      };
    }
    const candidates = fixtureRows.rows
      .filter(
        (row) =>
          (!Number.isInteger(configured) || configured <= 0 || row.gameweek === configured) &&
          Date.parse(now) >= Date.parse(fplGameweekFinalisationAt(row.last_kickoff_at)) &&
          !completedByGameweek.has(row.gameweek),
      )
      .toSorted((left, right) => left.gameweek - right.gameweek);
    const candidate = candidates[0];
    if (!candidate) return { status: "not-due" };
    const gameweek = candidate.gameweek;
    const evaluationKey = `${season.key}:gw${gameweek}:latest-predeadline:v1`;

    let resultRows = await resources.pool.query<{
      result_key: string;
      season_key: string;
      registration_key: string;
      gameweek: number;
      status: "final";
      observed_at: string;
      total_points: number;
      components: Record<string, number>;
    }>(
      `select * from mi_player_gameweek_results
       where season_key = $1 and gameweek = $2 and status = 'final'
       order by registration_key`,
      [season.key, gameweek],
    );
    if (resultRows.rows.length === 0) {
      const batch = await createFplLiveSource().capture({
        seasonKey: season.key,
        season: season.label,
        gameweek,
        capturedAt: now,
      });
      const rawObjects = await storeRawBatch(batch, snapshotStore);
      const hour = new Date(Math.floor(Date.parse(now) / 3_600_000) * 3_600_000).toISOString();
      const slot = {
        attemptKey: `fpl-live-final:${season.key}:gw${gameweek}:${hour}`,
        sourceKey: "fpl-live-final",
        seasonKey: season.key,
        scopeKey: `${season.key}:gw${gameweek}`,
        scheduledFor: hour,
      };
      if (!(await resources.hot.claim(slot))) {
        throw new Error(`Final FPL-live GW${gameweek} capture is already running`);
      }
      try {
        if (batch.metadata?.isFinal !== true) {
          const pendingHash = await sha256Hex(canonicalJson({ gameweek, isFinal: false }));
          await resources.hot.commit({
            slot,
            batchId: batch.id,
            capturedAt: batch.capturedAt,
            captureHash: pendingHash,
            modelInputHash: pendingHash,
            rawObjects,
            healthMetadata: {
              coverage: 1,
              detail: `GW${gameweek} is not final; retrying hourly`,
            },
          });
          return { status: "pending", gameweek, evaluationStatus: "not-due" };
        }
        const positions = await resources.pool.query<{
          registration_key: string;
          position: "GKP" | "DEF" | "MID" | "FWD";
        }>(
          `select registration_key, position from mi_player_registrations
           where season_key = $1`,
          [season.key],
        );
        const results = extractFplGameweekResults(batch, {
          seasonKey: season.key,
          gameweek,
          status: "final",
          positions: Object.fromEntries(
            positions.rows.map((row) => [row.registration_key, row.position]),
          ),
        });
        const client = await resources.pool.connect();
        try {
          await client.query("begin");
          for (const result of results) {
            await client.query(
              `insert into mi_player_gameweek_results
               (result_key, season_key, registration_key, gameweek, status, observed_at, total_points, components)
               values ($1, $2, $3, $4, 'final', $5, $6, $7)
               on conflict (result_key) do update set
                 status = 'final',
                 observed_at = excluded.observed_at,
                 total_points = excluded.total_points,
                 components = excluded.components`,
              [
                result.key,
                result.seasonKey,
                result.registrationKey,
                result.gameweek,
                result.observedAt,
                result.totalPoints,
                JSON.stringify(result.components),
              ],
            );
          }
          await client.query("commit");
        } catch (error) {
          await client.query("rollback");
          throw error;
        } finally {
          client.release();
        }
        const resultSemantic = batch.observations.map(({ entityKey, metric, numericValue }) => ({
          entityKey,
          metric,
          numericValue,
        }));
        const resultHash = await sha256Hex(canonicalJson(resultSemantic));
        await resources.hot.commit({
          slot,
          batchId: batch.id,
          capturedAt: batch.capturedAt,
          captureHash: resultHash,
          modelInputHash: resultHash,
          rawObjects,
          healthMetadata: {
            coverage: results.length === positions.rows.length ? 1 : 0.9,
            detail: `${results.length} final player-GW rows`,
          },
        });
      } catch (error) {
        await resources.hot.fail({
          slot,
          finishedAt: now,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
      resultRows = await resources.pool.query(
        `select * from mi_player_gameweek_results
         where season_key = $1 and gameweek = $2 and status = 'final'
         order by registration_key`,
        [season.key, gameweek],
      );
    }

    const checkpoint = await resources.pool.query<{
      cutoff_at: string;
      deadline_at: string;
      publication_id: string;
    }>(
      `select cutoff_at, deadline_at, publication_id
       from mi_deadline_forecast_checkpoints
       where season_key = $1 and gameweek = $2`,
      [season.key, gameweek],
    );
    if (!checkpoint.rows[0]) {
      throw new Error(`No pre-deadline H1 checkpoint exists for ${season.key} GW${gameweek}`);
    }
    const forecastRows = await resources.pool.query<{
      registration_key: string;
      expected_points: number;
      p10: number;
      p90: number;
      haul_probability: number;
    }>(
      `select registration_key, expected_points, p10, p90, haul_probability
       from mi_deadline_forecast_rows
       where season_key = $1 and gameweek = $2
       order by registration_key`,
      [season.key, gameweek],
    );
    const checkpointRow = checkpoint.rows[0];
    const forecasts: EvaluationForecast[] = forecastRows.rows.map((row) => ({
      runId: checkpointRow.publication_id,
      seasonKey: season.key,
      registrationKey: row.registration_key,
      gameweek,
      cutoffAt: new Date(checkpointRow.cutoff_at).toISOString(),
      deadlineAt: new Date(checkpointRow.deadline_at).toISOString(),
      expectedPoints: row.expected_points,
      p10: row.p10,
      p90: row.p90,
      haulProbability: row.haul_probability,
    }));
    const evaluation = evaluateForecasts({
      forecasts,
      results: resultRows.rows.map((row) => ({
        key: row.result_key,
        seasonKey: row.season_key,
        registrationKey: row.registration_key,
        gameweek: row.gameweek,
        status: "final",
        observedAt: new Date(row.observed_at).toISOString(),
        totalPoints: row.total_points,
        components: {
          appearance: row.components.appearance ?? 0,
          goals: row.components.goals ?? 0,
          assists: row.components.assists ?? 0,
          cleanSheet: row.components.cleanSheet ?? 0,
          bonus: row.components.bonus ?? 0,
          other: row.components.other ?? 0,
        },
      })),
    });
    const evaluationPayload = {
      schemaVersion: "forecast-evaluation/v1",
      evaluationKey,
      seasonKey: season.key,
      gameweek,
      cutoffPolicy: "latest eligible H1 forecast at or before the FPL deadline",
      createdAt: now,
      ...evaluation,
    };
    const canonical = canonicalJson(evaluationPayload);
    const hash = await sha256Hex(canonical);
    const artifactKey = `evaluation/v1/${seasonSlug}/gw${gameweek}/${hash}.json.gz`;
    const compressed = new Uint8Array(gzipSync(canonical, { level: 9 }));
    await resources.privateStore.putImmutable({
      key: artifactKey,
      body: compressed,
      contentType: "application/json",
      contentEncoding: "gzip",
      cacheControl: "private,max-age=31536000,immutable",
      metadata: { contentSha256: hash, evaluationKey },
    });
    const verified = await resources.privateStore.get(artifactKey);
    if (!verified || (await sha256Hex(new Uint8Array(gunzipSync(verified.body)))) !== hash) {
      throw new Error(`Evaluation artifact verification failed for ${artifactKey}`);
    }
    await resources.pool.query(
      `insert into mi_evaluation_runs
       (evaluation_key, season_key, gameweek, cutoff_policy, metrics, row_count)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (evaluation_key) do nothing`,
      [
        evaluationKey,
        season.key,
        gameweek,
        "latest eligible H1 forecast at or before the FPL deadline",
        JSON.stringify(evaluation.metrics),
        evaluation.rows.length,
      ],
    );
    return {
      status: "final",
      gameweek,
      evaluationStatus: "completed",
      evaluationKey,
    };
  }

  return {
    databaseSize: () => resources.hot.databaseSize(),
    collect: collectSource,
    loadForecastState: (cutoffAt) => resources.hot.loadState({ seasonKey: season.key, cutoffAt }),
    async forecastAndPublish(request) {
      const preparation = await prepareCompactForecast(request.state, {
        cutoffAt: request.now,
        codeVersion: request.codeVersion,
      });
      if (preparation.status === "skipped") {
        throw new Error(`Compact forecast skipped: ${preparation.reason}`);
      }
      const readyPreparation = preparation;
      const manifestKey = currentKey(request.channel, seasonSlug);
      const currentHead = await resources.publicStore.head(manifestKey);
      const currentObject = currentHead ? await resources.publicStore.get(manifestKey) : null;
      const current = currentObject
        ? currentOpportunityManifestSchema.parse(
            JSON.parse(new TextDecoder().decode(currentObject.body)),
          )
        : undefined;
      type ParsedSnapshots = {
        1: ReturnType<typeof opportunitySnapshotSchema.parse>;
        3: ReturnType<typeof opportunitySnapshotSchema.parse>;
        5: ReturnType<typeof opportunitySnapshotSchema.parse>;
      };
      function snapshotsFrom(privateBundle: ForecastBundleArtifactV1): ParsedSnapshots {
        return {
          1: opportunitySnapshotSchema.parse(privateBundle.snapshots["1"]),
          3: opportunitySnapshotSchema.parse(privateBundle.snapshots["3"]),
          5: opportunitySnapshotSchema.parse(privateBundle.snapshots["5"]),
        };
      }

      const displayHash = await sha256Hex(
        canonicalJson({
          runId: preparation.runId,
          players: request.state.playerStates
            .map((player) => ({
              registrationKey: player.registrationKey,
              rowHash: player.rowHash,
            }))
            .toSorted((left, right) => left.registrationKey.localeCompare(right.registrationKey)),
        }),
      );
      const publicationId = `publication:${displayHash.slice(0, 24)}`;
      const displayObservedAt =
        request.state.playerStates
          .map((player) => player.observedAt)
          .toSorted()
          .at(-1) ?? preparation.request.cutoffAt;

      function publicBundleFrom(
        privateBundle: ForecastBundleArtifactV1,
        snapshots: ParsedSnapshots,
      ): PublishedOpportunityBundleV1 {
        const existing = createPublishedOpportunityBundle({
          publicationId,
          runId: privateBundle.runId,
          snapshots,
        });
        const preparedPlayers = new Map(
          readyPreparation.request.players.map((player) => [player.registrationKey, player]),
        );
        return publishedOpportunityBundleSchema.parse({
          ...existing,
          observedAt: displayObservedAt,
          players: existing.players.map((player) => {
            const prepared = preparedPlayers.get(player.registrationKey);
            return prepared
              ? {
                  ...player,
                  price: prepared.price,
                  ownership: prepared.ownership,
                  fpl: prepared.fpl,
                }
              : player;
          }),
        });
      }

      async function completePublication(
        privateBundle: ForecastBundleArtifactV1,
        publicBundle: PublishedOpportunityBundleV1,
        snapshots: ParsedSnapshots,
      ) {
        const replay = createOpportunityReplayArtifact({ publicationId, snapshots });
        const publicBytes = new TextEncoder().encode(canonicalJson(publicBundle)).byteLength;
        const publicGzipBytes = gzipSync(canonicalJson(publicBundle), { level: 9 }).byteLength;
        if (publicBytes > 6 * 1024 * 1024 || publicGzipBytes > 1.5 * 1024 * 1024) {
          throw new Error(
            `Public opportunity bundle exceeds its budget (${publicBytes} bytes, ${publicGzipBytes} gzip bytes)`,
          );
        }
        const publication = await publishOpportunityArtifacts({
          privateStore: resources.privateStore,
          publicStore: resources.publicStore,
          repository: resources.publications,
          privateBundle,
          publicBundle,
          replay,
          channel: request.channel,
          seasonSlug,
          checkedAt: request.now,
          validUntil: new Date(Date.parse(request.now) + 60 * 60_000).toISOString(),
          sourceHealth: readyPreparation.request.sourceHealth ?? [],
          ...(currentHead ? { expectedManifestEtag: currentHead.etag } : {}),
        });
        const checkpointDeadline = (request.state.fixtures ?? [])
          .filter((fixture) => fixture.gameweek === snapshots[1].fromGameweek)
          .map((fixture) => fixture.deadlineAt)
          .toSorted()[0];
        if (checkpointDeadline) {
          await saveDeadlineCheckpoint({
            pool: resources.pool,
            seasonKey: season.key,
            deadlineAt: checkpointDeadline,
            snapshot: snapshots[1],
            publicationId,
            artifactKey: publication.current.artifact.key,
            artifactHash: publication.current.artifact.objectSha256,
            publishedAt: request.now,
          });
        }
        return {
          runId: privateBundle.runId,
          publicationId,
          privateBytes: insertedBytes(publication.privateArtifact),
          publicBytes: insertedBytes(publication.publicArtifact),
          replayBytes: publication.replayArtifact ? insertedBytes(publication.replayArtifact) : 0,
        };
      }

      const staged = await resources.pool.query<{
        private_artifact: { key?: unknown };
        public_artifact: { key?: unknown };
      }>(
        `select private_artifact, public_artifact
         from mi_forecast_publications
         where run_id = $1 and publication_id = $2 and status = 'staged'
         order by created_at desc limit 1`,
        [preparation.runId, publicationId],
      );
      const stagedPrivateKey = staged.rows[0]?.private_artifact.key;
      const stagedPublicKey = staged.rows[0]?.public_artifact.key;
      if (typeof stagedPrivateKey === "string" && typeof stagedPublicKey === "string") {
        const privateBundle = await decodeGzipArtifact(
          resources.privateStore,
          stagedPrivateKey,
          (value) => forecastBundleArtifactSchema.parse(value),
        );
        const publicBundle = await decodeGzipArtifact(
          resources.publicStore,
          stagedPublicKey,
          (value) => publishedOpportunityBundleSchema.parse(value),
        );
        return completePublication(privateBundle, publicBundle, snapshotsFrom(privateBundle));
      }

      const currentMatches =
        current?.runId === preparation.runId && current.publicationId === publicationId;
      if (currentMatches && !request.modelInputChanged && !request.displayStateChanged) {
        if (!request.sourceHealthChanged) {
          return { privateBytes: 0, publicBytes: 0, replayBytes: 0 };
        }
        const updated = currentOpportunityManifestSchema.parse({
          ...current,
          checkedAt: request.now,
          validUntil: new Date(Date.parse(request.now) + 60 * 60_000).toISOString(),
          sourceHealth: preparation.request.sourceHealth ?? [],
        });
        const manifest = await resources.publicStore.putManifest(
          manifestKey,
          updated,
          currentHead?.etag,
        );
        await resources.publications.commit({
          publicationId: current.publicationId,
          manifestKey,
          manifestEtag: manifest.etag,
          committedAt: request.now,
          current: updated,
        });
        return { privateBytes: 0, publicBytes: 0, replayBytes: 0 };
      }

      const privateKey = `forecast/v1/${seasonSlug}/${preparation.runId}.json.gz`;
      const existingPrivate = await resources.privateStore.head(privateKey);
      let privateBundle: ForecastBundleArtifactV1;
      let snapshots: ParsedSnapshots;
      if ((!request.modelInputChanged && currentMatches) || existingPrivate) {
        privateBundle = await decodeGzipArtifact(resources.privateStore, privateKey, (value) =>
          forecastBundleArtifactSchema.parse(value),
        );
        snapshots = snapshotsFrom(privateBundle);
      } else {
        const previousReplay = current?.replay
          ? await decodeGzipArtifact(resources.publicStore, current.replay.key, (value) =>
              opportunityReplayArtifactSchema.parse(value),
            )
          : undefined;
        const trailsFor = (horizon: "1" | "3" | "5") =>
          Object.fromEntries(
            (previousReplay?.players ?? []).map((player) => [
              player.registrationKey,
              player.horizons[horizon],
            ]),
          );
        const playerTrailsByHorizon: ForecastHorizonsRequest["playerTrailsByHorizon"] =
          previousReplay
            ? {
                1: trailsFor("1"),
                3: trailsFor("3"),
                5: trailsFor("5"),
              }
            : undefined;
        const forecastRequest = {
          ...preparation.request,
          ...(playerTrailsByHorizon ? { playerTrailsByHorizon } : {}),
        };
        const forecast = createMarketXpForecastRunner().runHorizons(forecastRequest);
        snapshots = forecast.snapshots;
        privateBundle = forecastBundleArtifactSchema.parse({
          schemaVersion: "forecast-bundle/v1",
          runId: preparation.runId,
          datasetKey: preparation.request.datasetKey,
          seasonKey: season.key,
          fromGameweek: preparation.request.fromGameweek,
          horizons: [1, 3, 5],
          cutoffAt: preparation.request.cutoffAt,
          modelKey: preparation.request.modelKey,
          modelVersion: preparation.request.modelVersion,
          codeVersion: preparation.request.codeVersion,
          rulesetKey: preparation.request.season.rulesetKey,
          modelInputHash: preparation.modelInputHash,
          inputHeads: preparation.inputHeads,
          normalizedInput: {
            state: jsonValue(request.state),
            request: jsonValue(forecastRequest),
          },
          fixtureForecasts: forecast.fixtureForecasts.map((fixture) => jsonRecord(fixture)),
          snapshots,
        });
      }
      return completePublication(
        privateBundle,
        publicBundleFrom(privateBundle, snapshots),
        snapshots,
      );
    },
    async exportLedgerAndPrune(now) {
      const expired = await resources.pool.query<Record<string, unknown>>(
        `select * from mi_capture_ledger where expires_at < $1 order by scheduled_for, attempt_key`,
        [now],
      );
      let exportedKey: string | undefined;
      let r2Bytes = 0;
      if (expired.rows.length > 0) {
        const payload = {
          schemaVersion: "capture-ledger/v1",
          seasonKey: season.key,
          exportedAt: now,
          rows: jsonValue(expired.rows),
        };
        const canonical = canonicalJson(payload);
        const hash = await sha256Hex(canonical);
        exportedKey = `ledger/v1/${seasonSlug}/${now.slice(0, 10)}/${hash}.json.gz`;
        const receipt = await resources.privateStore.putImmutable({
          key: exportedKey,
          body: new Uint8Array(gzipSync(canonical, { level: 9 })),
          contentType: "application/json",
          contentEncoding: "gzip",
          cacheControl: "private,max-age=31536000,immutable",
          metadata: { contentSha256: hash },
        });
        const verified = await resources.privateStore.get(exportedKey);
        if (!verified || (await sha256Hex(new Uint8Array(gunzipSync(verified.body)))) !== hash) {
          throw new Error(`Ledger export verification failed for ${exportedKey}`);
        }
        r2Bytes = insertedBytes(receipt);
      }
      const pruned = await resources.hot.prune(now);
      const expiredPublications = await resources.pool.query<{ publication_id: string }>(
        `delete from mi_forecast_publications
         where expires_at < $1
         returning publication_id`,
        [now],
      );
      let seasonArchiveKey: string | undefined;
      let seasonRowsPruned = 0;
      if (Date.parse(now) >= Date.parse(season.endsAt) + 30 * 86_400_000) {
        const [results, evaluations, checkpoints, checkpointRows] = await Promise.all([
          resources.pool.query<Record<string, unknown>>(
            `select * from mi_player_gameweek_results
             where season_key = $1 order by gameweek, registration_key`,
            [season.key],
          ),
          resources.pool.query<Record<string, unknown>>(
            `select * from mi_evaluation_runs
             where season_key = $1 order by gameweek, evaluation_key`,
            [season.key],
          ),
          resources.pool.query<Record<string, unknown>>(
            `select * from mi_deadline_forecast_checkpoints
             where season_key = $1 order by gameweek`,
            [season.key],
          ),
          resources.pool.query<Record<string, unknown>>(
            `select * from mi_deadline_forecast_rows
             where season_key = $1 order by gameweek, registration_key`,
            [season.key],
          ),
        ]);
        seasonRowsPruned =
          results.rows.length +
          evaluations.rows.length +
          checkpoints.rows.length +
          checkpointRows.rows.length;
        if (seasonRowsPruned > 0) {
          const payload = {
            schemaVersion: "season-evaluation-archive/v1",
            seasonKey: season.key,
            archivedAt: now,
            results: jsonValue(results.rows),
            evaluations: jsonValue(evaluations.rows),
            checkpoints: jsonValue(checkpoints.rows),
            checkpointRows: jsonValue(checkpointRows.rows),
          };
          const canonical = canonicalJson(payload);
          const hash = await sha256Hex(canonical);
          seasonArchiveKey = `evaluation/v1/${seasonSlug}/season-final/${hash}.json.gz`;
          const receipt = await resources.privateStore.putImmutable({
            key: seasonArchiveKey,
            body: new Uint8Array(gzipSync(canonical, { level: 9 })),
            contentType: "application/json",
            contentEncoding: "gzip",
            cacheControl: "private,max-age=31536000,immutable",
            metadata: { contentSha256: hash, seasonKey: season.key },
          });
          const verified = await resources.privateStore.get(seasonArchiveKey);
          if (!verified || (await sha256Hex(new Uint8Array(gunzipSync(verified.body)))) !== hash) {
            throw new Error(`Season archive verification failed for ${seasonArchiveKey}`);
          }
          r2Bytes += insertedBytes(receipt);
          const client = await resources.pool.connect();
          try {
            await client.query("begin");
            await client.query("delete from mi_evaluation_runs where season_key = $1", [
              season.key,
            ]);
            await client.query("delete from mi_player_gameweek_results where season_key = $1", [
              season.key,
            ]);
            await client.query(
              "delete from mi_deadline_forecast_checkpoints where season_key = $1",
              [season.key],
            );
            await client.query("commit");
          } catch (error) {
            await client.query("rollback");
            throw error;
          } finally {
            client.release();
          }
        }
      }
      return {
        ...(exportedKey ? { exportedKey } : {}),
        ...(seasonArchiveKey ? { seasonArchiveKey } : {}),
        exportedRows: expired.rows.length,
        ...pruned,
        publicationHeaders: expiredPublications.rows.length,
        seasonRowsPruned,
        r2Bytes,
      };
    },
    finalise: finaliseGameweek,
    async verify(_now, channel) {
      const key = currentKey(channel, seasonSlug);
      const object = await resources.publicStore.get(key);
      if (!object) return { status: "failed", detail: `${key} is missing` };
      const manifest = currentOpportunityManifestSchema.parse(
        JSON.parse(new TextDecoder().decode(object.body)),
      );
      await verifyGzipArtifact(resources.publicStore, manifest.artifact, (value) =>
        publishedOpportunityBundleSchema.parse(value),
      );
      if (manifest.replay) {
        await verifyGzipArtifact(resources.publicStore, manifest.replay, (value) =>
          opportunityReplayArtifactSchema.parse(value),
        );
      }
      return { status: "passed", detail: manifest.publicationId };
    },
    async close() {
      await Promise.all([
        resources.hot.close(),
        resources.catalog.close(),
        resources.publications.close(),
      ]);
      await resources.pool.end();
    },
  };
}

export async function runScheduledPipeline(input: ScheduledPipelineInput) {
  return createScheduledPipeline({
    plan: planScheduledPipeline,
    open: openRuntime,
  })(input);
}
