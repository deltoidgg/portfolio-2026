import { gzipSync } from "node:zlib";
import { Pool, type PoolClient } from "@neondatabase/serverless";
import type { CaptureBatch, Observation } from "../contracts.ts";
import { canonicalJson, sha256Hex } from "../hot-cold/artifact-store.ts";
import {
  projectFplCurrentState,
  projectFplPlayerPriors,
  projectOddsConsensus,
} from "../hot-cold/projectors.ts";
import type {
  CurrentFixtureMarketState,
  CurrentPlayerPrior,
  CurrentPlayerState,
  HotArtifactReference,
  SourceHead,
} from "../hot-cold/hot-state.ts";
import { opportunitySnapshotSchema } from "../opportunity-map.ts";
import { createCutoverPrivateStore, freezeAt, uncompressedBody } from "./cutover-r2.ts";
import { loadLocalEnvironment, requiredEnvironment } from "./load-env.ts";

type JsonRow = Record<string, unknown>;

function json(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

function text(value: unknown, field: string): string {
  if (typeof value === "string" || typeof value === "number") return `${value}`;
  throw new Error(`Legacy export expected scalar ${field}`);
}

async function tableRows(client: PoolClient, table: string): Promise<JsonRow[]> {
  const result = await client.query<{ row: JsonRow }>(`select to_jsonb(t) as row from ${table} t`);
  return result.rows.map((row) => json(row.row) as JsonRow);
}

async function putJsonGzip(
  key: string,
  value: unknown,
  store: ReturnType<typeof createCutoverPrivateStore>,
) {
  const canonical = canonicalJson(value);
  const contentSha256 = await sha256Hex(canonical);
  const body = new Uint8Array(gzipSync(canonical, { level: 9 }));
  const receipt = await store.putImmutable({
    key,
    body,
    contentType: "application/json",
    contentEncoding: "gzip",
    cacheControl: "private,max-age=31536000,immutable",
    metadata: { contentSha256 },
  });
  const readBack = await store.get(key);
  if (
    !readBack ||
    (await sha256Hex(uncompressedBody(readBack.body, readBack.contentEncoding))) !== contentSha256
  ) {
    throw new Error(`Artifact verification failed for ${key}`);
  }
  return {
    key,
    contentSha256,
    objectSha256: receipt.sha256,
    compressedBytes: body.byteLength,
    uncompressedBytes: new TextEncoder().encode(canonical).byteLength,
  };
}

function observation(row: JsonRow): Observation {
  return {
    key: text(row.observation_key, "observation_key"),
    entityKey: text(row.entity_key, "entity_key"),
    ...(row.fixture_key ? { fixtureKey: text(row.fixture_key, "fixture_key") } : {}),
    metric: text(row.metric, "metric"),
    observedAt: new Date(text(row.observed_at, "observed_at")).toISOString(),
    ...(row.published_at
      ? { publishedAt: new Date(text(row.published_at, "published_at")).toISOString() }
      : {}),
    ...(row.numeric_value === null || row.numeric_value === undefined
      ? {}
      : { numericValue: Number(row.numeric_value) }),
    ...(row.string_value === null || row.string_value === undefined
      ? {}
      : { stringValue: text(row.string_value, "string_value") }),
    ...(row.unit ? { unit: text(row.unit, "unit") } : {}),
    ...(row.market_family ? { marketFamily: text(row.market_family, "market_family") } : {}),
    ...(row.outcome ? { outcome: text(row.outcome, "outcome") } : {}),
    metadata: (row.metadata ?? {}) as Observation["metadata"],
  };
}

function captureBatch(input: {
  batch: JsonRow;
  observations: JsonRow[];
  fixtures: JsonRow[];
}): CaptureBatch {
  const sourceKey = text(input.batch.source_key, "source_key");
  return {
    id: text(input.batch.batch_id, "batch_id"),
    source: {
      key: sourceKey,
      label: sourceKey,
      kind: sourceKey === "odds-api" ? "aggregator" : "fpl",
    },
    capturedAt: new Date(text(input.batch.captured_at, "captured_at")).toISOString(),
    fixtures: input.fixtures.map((fixture) => ({
      key: text(fixture.fixture_key, "fixture_key"),
      competition: text(fixture.competition, "competition"),
      season: text(fixture.season, "season"),
      gameweek: Number(fixture.gameweek),
      homeTeam: text(fixture.home_team, "home_team"),
      awayTeam: text(fixture.away_team, "away_team"),
      kickoffAt: new Date(text(fixture.kickoff_at, "kickoff_at")).toISOString(),
      deadlineAt: new Date(text(fixture.deadline_at, "deadline_at")).toISOString(),
      metadata: (fixture.metadata ?? {}) as Record<string, never>,
    })),
    rawSnapshots: [],
    observations: input.observations.map(observation),
    forecasts: [],
    annotations: [],
    metadata: (input.batch.metadata ?? {}) as Record<string, never>,
  };
}

async function rowHashes(rows: Array<{ rowHash: string }>): Promise<string> {
  return sha256Hex(canonicalJson(rows.map((row) => row.rowHash).toSorted()));
}

loadLocalEnvironment();
const legacyUrl = requiredEnvironment("LEGACY_DATABASE_DIRECT_URL");
const seasonKey = process.env.MI_SEASON_KEY ?? "epl:2026-27";
const timestamp = freezeAt();
const pool = new Pool({ connectionString: legacyUrl });
const client = await pool.connect();
const store = createCutoverPrivateStore();

try {
  await client.query("begin transaction isolation level repeatable read read only");
  const rawRows = await tableRows(client, "mi_raw_snapshots");
  const rawReferences: Array<
    HotArtifactReference & { snapshotKey: string; batchId: string; sourceKey: string }
  > = [];
  for (const snapshot of rawRows) {
    const sourceKey = text(snapshot.source_key, "source_key");
    const observedAt = new Date(text(snapshot.observed_at, "observed_at")).toISOString();
    const [year, month, day] = observedAt.slice(0, 10).split("-");
    if (snapshot.object_key) {
      const key = text(snapshot.object_key, "object_key");
      const object = await store.get(key);
      if (!object) throw new Error(`Existing raw object ${key} is missing`);
      const uncompressed = uncompressedBody(
        object.body,
        snapshot.content_encoding
          ? text(snapshot.content_encoding, "content_encoding")
          : object.contentEncoding,
      );
      const hash = await sha256Hex(uncompressed);
      if (snapshot.sha256 && snapshot.sha256 !== hash) {
        throw new Error(`Existing raw object ${key} failed its stored hash`);
      }
      if (
        snapshot.compressed_bytes !== null &&
        snapshot.compressed_bytes !== undefined &&
        Number(snapshot.compressed_bytes) !== object.body.byteLength
      ) {
        throw new Error(`Existing raw object ${key} failed its compressed byte count`);
      }
      if (
        snapshot.uncompressed_bytes !== null &&
        snapshot.uncompressed_bytes !== undefined &&
        Number(snapshot.uncompressed_bytes) !== uncompressed.byteLength
      ) {
        throw new Error(`Existing raw object ${key} failed its uncompressed byte count`);
      }
      rawReferences.push({
        snapshotKey: text(snapshot.snapshot_key, "snapshot_key"),
        batchId: text(snapshot.batch_id, "batch_id"),
        sourceKey,
        key,
        sha256: hash,
        compressedBytes: object.body.byteLength,
        uncompressedBytes: uncompressed.byteLength,
      });
      continue;
    }
    if (snapshot.payload === null || snapshot.payload === undefined) {
      throw new Error(
        `Inline snapshot ${text(snapshot.snapshot_key, "snapshot_key")} has no payload`,
      );
    }
    const serialized = JSON.stringify(snapshot.payload);
    const hash = await sha256Hex(serialized);
    const key = `raw/${sourceKey}/${year}/${month}/${day}/${hash}.json.gz`;
    const body = new Uint8Array(gzipSync(serialized, { level: 9 }));
    await store.putImmutable({
      key,
      body,
      contentType: "application/json",
      contentEncoding: "gzip",
      cacheControl: "private,max-age=31536000,immutable",
      metadata: { contentSha256: hash, source: sourceKey, observedAt },
    });
    const verified = await store.get(key);
    if (
      !verified ||
      (await sha256Hex(uncompressedBody(verified.body, verified.contentEncoding))) !== hash
    ) {
      throw new Error(`Externalised raw object ${key} failed verification`);
    }
    rawReferences.push({
      snapshotKey: text(snapshot.snapshot_key, "snapshot_key"),
      batchId: text(snapshot.batch_id, "batch_id"),
      sourceKey,
      key,
      sha256: hash,
      compressedBytes: body.byteLength,
      uncompressedBytes: new TextEncoder().encode(serialized).byteLength,
    });
  }

  const modelRuns = await tableRows(client, "mi_model_runs");
  const modelInputs = await tableRows(client, "mi_model_run_inputs");
  const fixtureForecasts = await tableRows(client, "mi_player_fixture_forecasts");
  const horizons = await tableRows(client, "mi_forecast_horizons");
  const opportunitySnapshots = await tableRows(client, "mi_opportunity_snapshots");
  const legacyForecastRows = await tableRows(client, "mi_forecasts");
  const forecastArtifacts = [];
  const forecastArtifactByRun = new Map<string, Awaited<ReturnType<typeof putJsonGzip>>>();
  const snapshotBelongsToRun = (row: JsonRow, runId: string) =>
    (row.payload as { key?: string } | undefined)?.key === runId ||
    (
      row.payload as { players?: Array<{ provenance?: { inputBatchIds?: string[] } }> } | undefined
    )?.players?.some((player) =>
      player.provenance?.inputBatchIds?.some((id) =>
        modelInputs
          .filter((input) => input.run_id === runId)
          .some((input) => input.batch_id === id),
      ),
    );
  for (const run of modelRuns) {
    const runId = text(run.run_id, "run_id");
    const artifact = await putJsonGzip(
      `legacy/v1/forecasts/${runId}.json.gz`,
      {
        schemaVersion: "legacy-forecast-export/v1",
        run,
        inputs: modelInputs.filter((row) => row.run_id === runId),
        fixtureForecasts: fixtureForecasts.filter((row) => row.run_id === runId),
        horizons: horizons.filter((row) => row.run_id === runId),
        legacyForecasts: legacyForecastRows.filter((row) => row.run_id === runId),
        opportunitySnapshots: opportunitySnapshots.filter((row) =>
          snapshotBelongsToRun(row, runId),
        ),
      },
      store,
    );
    forecastArtifacts.push(artifact);
    forecastArtifactByRun.set(runId, artifact);
  }
  const modelRunIds = new Set(modelRuns.map((run) => text(run.run_id, "run_id")));
  const unassignedForecasts = legacyForecastRows.filter(
    (forecast) =>
      forecast.run_id === null ||
      forecast.run_id === undefined ||
      !modelRunIds.has(text(forecast.run_id, "run_id")),
  );
  const unassignedOpportunitySnapshots = opportunitySnapshots.filter(
    (snapshot) =>
      !modelRuns.some((run) => snapshotBelongsToRun(snapshot, text(run.run_id, "run_id"))),
  );
  if (unassignedForecasts.length > 0 || unassignedOpportunitySnapshots.length > 0) {
    forecastArtifacts.push(
      await putJsonGzip(
        `legacy/v1/forecasts/legacy-unassigned-${timestamp}.json.gz`,
        {
          schemaVersion: "legacy-forecast-export/v1",
          run: {
            run_id: `legacy-unassigned-${timestamp}`,
            status: "archived",
          },
          inputs: [],
          fixtureForecasts: [],
          horizons: [],
          legacyForecasts: unassignedForecasts,
          opportunitySnapshots: unassignedOpportunitySnapshots,
        },
        store,
      ),
    );
  }

  const currentRegistrations = (await tableRows(client, "mi_player_registrations")).filter(
    (row) => row.season_key === seasonKey,
  );
  const currentFixtures = (await tableRows(client, "mi_fixtures")).filter(
    (row) =>
      row.season_key === seasonKey ||
      (row.metadata as { seasonKey?: string } | undefined)?.seasonKey === seasonKey,
  );
  const currentFixtureKeys = new Set(currentFixtures.map((row) => row.fixture_key));
  const currentAliases = (await tableRows(client, "mi_source_entity_aliases")).filter(
    (row) =>
      row.source_key !== "polymarket" && (row.season_key === seasonKey || row.season_key === null),
  );
  const currentEntityKeys = new Set([
    ...currentRegistrations.map((row) => row.player_key),
    ...currentAliases.map((row) => row.entity_key),
  ]);
  const dimensions = {
    sources: (await tableRows(client, "mi_sources")).filter(
      (row) => row.source_key !== "polymarket",
    ),
    entities: (await tableRows(client, "mi_entities")).filter((row) =>
      currentEntityKeys.has(row.entity_key),
    ),
    aliases: currentAliases.filter((row) => currentEntityKeys.has(row.entity_key)),
    datasets: (await tableRows(client, "mi_datasets")).filter(
      (row) => row.season_key === seasonKey && row.kind === "live",
    ),
    seasons: (await tableRows(client, "mi_seasons")).filter((row) => row.season_key === seasonKey),
    rulesets: (await tableRows(client, "mi_rulesets")).filter(
      (row) => row.season_key === seasonKey,
    ),
    teams: (await tableRows(client, "mi_team_seasons")).filter(
      (row) => row.season_key === seasonKey,
    ),
    registrations: currentRegistrations,
    fixtures: currentFixtures,
    assignments: (await tableRows(client, "mi_fixture_gameweek_assignments")).filter((row) =>
      currentFixtureKeys.has(row.fixture_key),
    ),
    fixtureLinks: (await tableRows(client, "mi_fixture_links")).filter(
      (row) =>
        row.source_key !== "polymarket" &&
        row.season_key === seasonKey &&
        (row.fixture_key === null || currentFixtureKeys.has(row.fixture_key)),
    ),
  };
  const captureBatches = await tableRows(client, "mi_capture_batches");
  const allObservations = await tableRows(client, "mi_observations");
  const latestBatches = new Map<string, JsonRow>();
  for (const batch of captureBatches.toSorted((left, right) =>
    text(right.captured_at, "captured_at").localeCompare(text(left.captured_at, "captured_at")),
  )) {
    const sourceKey = text(batch.source_key, "source_key");
    if (
      ["fpl", "fpl-element-summary", "odds-api", "premier-league-schedule"].includes(sourceKey) &&
      !latestBatches.has(sourceKey)
    ) {
      latestBatches.set(sourceKey, batch);
    }
  }
  const fixtureRows = dimensions.fixtures.filter(
    (fixture) =>
      fixture.season_key === seasonKey ||
      (fixture.metadata as { seasonKey?: string } | undefined)?.seasonKey === seasonKey,
  );
  const registrationMap = Object.fromEntries(
    dimensions.registrations
      .filter((registration) => registration.season_key === seasonKey)
      .map((registration) => [
        text(registration.player_key, "player_key"),
        text(registration.registration_key, "registration_key"),
      ]),
  );
  let playerStates: CurrentPlayerState[] = [];
  let playerPriors: CurrentPlayerPrior[] = [];
  let fixtureMarkets: CurrentFixtureMarketState[] = [];
  const heads: SourceHead[] = [];
  for (const [sourceKey, batchRow] of latestBatches) {
    const batchId = text(batchRow.batch_id, "batch_id");
    const observations = allObservations.filter((row) => row.batch_id === batchId);
    const fixtureKeys = new Set(observations.map((row) => row.fixture_key).filter(Boolean));
    const batch = captureBatch({
      batch: batchRow,
      observations,
      fixtures:
        sourceKey === "odds-api"
          ? fixtureRows.filter((fixture) => fixtureKeys.has(fixture.fixture_key))
          : [],
    });
    if (sourceKey === "fpl") {
      playerStates = await projectFplCurrentState(batch, seasonKey, registrationMap);
    }
    if (sourceKey === "fpl-element-summary") {
      playerPriors = await projectFplPlayerPriors(batch, seasonKey, registrationMap);
    }
    if (sourceKey === "odds-api") fixtureMarkets = await projectOddsConsensus(batch, seasonKey);
    const rows =
      sourceKey === "fpl"
        ? playerStates
        : sourceKey === "fpl-element-summary"
          ? playerPriors
          : sourceKey === "odds-api"
            ? fixtureMarkets
            : [];
    const hash = await rowHashes(rows);
    heads.push({
      sourceKey,
      seasonKey,
      scopeKey: seasonKey,
      lastAttemptStatus: "succeeded",
      lastAttemptAt: batch.capturedAt,
      lastSuccessfulBatchId: batch.id,
      lastSuccessfulCapturedAt: batch.capturedAt,
      captureHash: hash,
      modelInputHash: hash,
      rawObjects: rawReferences
        .filter((reference) => reference.batchId === batchId)
        .map(({ snapshotKey: _, batchId: __, sourceKey: ___, ...reference }) => reference),
      stateRowCount: rows.length,
      healthMetadata: { coverage: rows.length > 0 ? 1 : 0 },
    });
  }

  const results = (await tableRows(client, "mi_player_gameweek_results")).filter(
    (row) => row.season_key === seasonKey && row.status === "final",
  );
  const evaluations = (await tableRows(client, "mi_evaluation_runs")).filter(
    (row) => row.season_key === seasonKey,
  );
  const deadlines = Object.fromEntries(
    fixtureRows.map((fixture) => [
      Number(fixture.gameweek),
      text(fixture.deadline_at, "deadline_at"),
    ]),
  );
  const checkpointCandidates = opportunitySnapshots
    .flatMap((row) => {
      const parsed = opportunitySnapshotSchema.safeParse(row.payload);
      return parsed.success &&
        parsed.data.season.key === seasonKey &&
        parsed.data.horizon === 1 &&
        parsed.data.observedAt <= deadlines[parsed.data.fromGameweek]
        ? [{ row, snapshot: parsed.data }]
        : [];
    })
    .toSorted((left, right) => right.snapshot.observedAt.localeCompare(left.snapshot.observedAt));
  const checkpointByGameweek = new Map<number, (typeof checkpointCandidates)[number]>();
  for (const candidate of checkpointCandidates) {
    if (!checkpointByGameweek.has(candidate.snapshot.fromGameweek)) {
      checkpointByGameweek.set(candidate.snapshot.fromGameweek, candidate);
    }
  }
  const checkpoints = [...checkpointByGameweek.values()].flatMap(({ snapshot }) => {
    const artifact = forecastArtifactByRun.get(snapshot.key);
    return artifact
      ? [
          {
            seasonKey,
            gameweek: snapshot.fromGameweek,
            deadlineAt: deadlines[snapshot.fromGameweek],
            publicationId: snapshot.key,
            cutoffAt: snapshot.observedAt,
            artifactKey: artifact.key,
            artifactHash: artifact.objectSha256,
            rows: snapshot.players.map((player) => ({
              registrationKey: player.registrationKey,
              expectedPoints: player.expectedPoints,
              p10: player.p10,
              p90: player.p90,
              haulProbability: player.haulProbability,
            })),
          },
        ]
      : [];
  });
  const compactSources = new Set([
    "premier-league-schedule",
    "fpl",
    "fpl-element-summary",
    "odds-api",
  ]);
  const recentAttempts = (await tableRows(client, "mi_capture_attempts")).filter((attempt) => {
    if (!compactSources.has(text(attempt.source_key, "source_key"))) return false;
    const finished = Date.parse(text(attempt.finished_at ?? attempt.scheduled_for, "attempt time"));
    const days = attempt.status === "failed" || attempt.status === "partial" ? 30 : 14;
    return finished >= Date.parse(timestamp) - days * 86_400_000;
  });
  const backfill = {
    schemaVersion: "compact-backfill/v1",
    seasonKey,
    cutoffAt: timestamp,
    dimensions,
    playerStates,
    playerPriors,
    fixtureMarkets,
    heads,
    ledger: recentAttempts,
    results,
    evaluations,
    checkpoints,
    forecastArtifacts,
    rawReferences,
  };
  const backfillArtifact = await putJsonGzip(
    `legacy/v1/backfill/${timestamp}/compact-state.json.gz`,
    backfill,
    store,
  );
  const counts = {
    rawReferences: rawReferences.length,
    externalisedRaw: rawRows.filter((row) => !row.object_key).length,
    existingRaw: rawRows.filter((row) => row.object_key).length,
    modelRuns: modelRuns.length,
    forecastArtifacts: forecastArtifacts.length,
    legacyForecastRows: legacyForecastRows.length,
    opportunitySnapshots: opportunitySnapshots.length,
    unassignedLegacyForecastRows: unassignedForecasts.length,
    unassignedOpportunitySnapshots: unassignedOpportunitySnapshots.length,
    playerStates: playerStates.length,
    playerPriors: playerPriors.length,
    fixtureMarkets: fixtureMarkets.length,
    results: results.length,
    evaluations: evaluations.length,
    checkpoints: checkpoints.length,
  };
  const legacyFingerprint = await sha256Hex(
    canonicalJson({ counts, rawReferences, forecastArtifacts, backfillArtifact }),
  );
  const manifest = {
    schemaVersion: "legacy-export-manifest/v1",
    freezeAt: timestamp,
    seasonKey,
    legacyFingerprint,
    counts,
    rawReferences,
    forecastArtifacts,
    backfillArtifact,
  };
  const manifestBody = new TextEncoder().encode(canonicalJson(manifest));
  const manifestKey = `legacy/v1/manifests/${timestamp}.json`;
  await store.putImmutable({
    key: manifestKey,
    body: manifestBody,
    contentType: "application/json",
    contentEncoding: "identity",
    cacheControl: "private,max-age=31536000,immutable",
    metadata: { contentSha256: await sha256Hex(manifestBody), legacyFingerprint },
  });
  const verifiedManifest = await store.get(manifestKey);
  if (
    !verifiedManifest ||
    (await sha256Hex(verifiedManifest.body)) !== (await sha256Hex(manifestBody))
  ) {
    throw new Error("Legacy export manifest read-back verification failed");
  }
  await client.query("commit");
  console.log(JSON.stringify({ manifestKey, legacyFingerprint, counts }));
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
  await pool.end();
}
