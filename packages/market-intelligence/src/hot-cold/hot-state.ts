import type { JsonValue } from "../contracts.ts";
import type { FplRuleset } from "../model/v2.ts";

export type CollectionSlot = {
  attemptKey: string;
  sourceKey: string;
  seasonKey: string;
  scopeKey: string;
  scheduledFor: string;
};

export type HotArtifactReference = {
  key: string;
  sha256: string;
  compressedBytes: number;
  uncompressedBytes: number;
};

export type CurrentPlayerState = {
  registrationKey: string;
  seasonKey: string;
  observedAt: string;
  price?: number;
  ownership?: number;
  availabilityProbability: number;
  chanceOfPlayingThisRound?: number;
  minutes: number;
  starts: number;
  expectedGoals?: number;
  expectedAssists?: number;
  expectedGoalsPer90?: number;
  expectedAssistsPer90?: number;
  savesPer90?: number;
  defensiveContributionsPer90?: number;
  cardsPer90?: number;
  expectedPointsNext?: number;
  news?: string;
  newsAddedAt?: string;
  rowHash: string;
};

export type CurrentPlayerPrior = {
  registrationKey: string;
  seasonKey: string;
  observedAt: string;
  weightedMinutes: number;
  goalsPer90: number;
  assistsPer90: number;
  sourceSeasons: Array<{ season: string; weight: number }>;
  calculationVersion: string;
  sourceArtifact?: Pick<HotArtifactReference, "key" | "sha256">;
  rowHash: string;
};

export type CurrentFixtureMarketState = {
  sourceKey: string;
  fixtureKey: string;
  seasonKey: string;
  observedAt: string;
  homeGoalRate: number;
  awayGoalRate: number;
  marketCoverage: number;
  sourceAgreement: number;
  bookmakerCount: number;
  projectionVersion: string;
  rowHash: string;
};

export type SourceHead = {
  sourceKey: string;
  seasonKey: string;
  scopeKey: string;
  lastAttemptStatus: "running" | "succeeded" | "partial" | "failed" | "skipped";
  lastAttemptAt: string;
  lastAttemptError?: string;
  lastSuccessfulBatchId?: string;
  lastSuccessfulCapturedAt?: string;
  captureHash?: string;
  modelInputHash?: string;
  rawObjects: HotArtifactReference[];
  stateRowCount: number;
  healthMetadata: Record<string, JsonValue>;
};

export type CanonicalCaptureCommit = {
  slot: CollectionSlot;
  batchId: string;
  capturedAt: string;
  captureHash: string;
  modelInputHash: string;
  rawObjects: HotArtifactReference[];
  playerStates?: CurrentPlayerState[];
  playerPriors?: CurrentPlayerPrior[];
  fixtureMarkets?: CurrentFixtureMarketState[];
  healthMetadata?: Record<string, JsonValue>;
  stateRowCount?: number;
};

export type CaptureCommitReceipt = {
  attemptKey: string;
  batchId: string;
  captureChanged: boolean;
  modelInputChanged: boolean;
  sourceHealthChanged: boolean;
  changedRows: {
    playerStates: number;
    playerPriors: number;
    fixtureMarkets: number;
  };
};

export type CaptureFailure = {
  slot: CollectionSlot;
  finishedAt: string;
  error: string;
};

export type PruneReceipt = {
  succeededOrSkipped: number;
  failedOrPartial: number;
};

export interface CollectionRepository {
  claim(slot: CollectionSlot): Promise<boolean>;
  commit(capture: CanonicalCaptureCommit): Promise<CaptureCommitReceipt>;
  fail(failure: CaptureFailure): Promise<void>;
  prune(now: string): Promise<PruneReceipt>;
}

export type ForecastStateRequest = {
  seasonKey: string;
  cutoffAt: string;
};

export type ForecastInputState = {
  seasonKey: string;
  sourceHeads: SourceHead[];
  playerStates: CurrentPlayerState[];
  playerPriors: CurrentPlayerPrior[];
  fixtureMarkets: CurrentFixtureMarketState[];
  ruleset?: FplRuleset;
  season?: {
    key: string;
    label: string;
    lifecycle: "planned" | "prelaunch" | "active" | "complete" | "archived";
    priceState: "unpublished" | "partial" | "official";
    rulesetKey: string;
    rulesetStatus: "provisional" | "official";
  };
  fixtures?: Array<{
    key: string;
    gameweek: number;
    homeTeam: string;
    awayTeam: string;
    kickoffAt: string;
    deadlineAt: string;
    homeDifficulty?: number;
    awayDifficulty?: number;
  }>;
  registrations?: Array<{
    registrationKey: string;
    playerKey: string;
    name: string;
    team: string;
    position: "GKP" | "DEF" | "MID" | "FWD";
    status: "provisional" | "active" | "departed" | "unresolved";
  }>;
};

export interface ForecastInputRepository {
  loadState(request: ForecastStateRequest): Promise<ForecastInputState | null>;
}

type LedgerEntry = {
  slot: CollectionSlot;
  status: SourceHead["lastAttemptStatus"];
  finishedAt?: string;
  error?: string;
  expiresAt?: string;
};

export type MemoryHotStateRepository = CollectionRepository & ForecastInputRepository;

function copy<T>(value: T): T {
  return structuredClone(value);
}

function rowChanged<T extends { rowHash: string; observedAt: string }>(
  current: T | undefined,
  candidate: T,
): boolean {
  return (
    (!current || Date.parse(candidate.observedAt) >= Date.parse(current.observedAt)) &&
    current?.rowHash !== candidate.rowHash
  );
}

export function createMemoryHotStateRepository(): MemoryHotStateRepository {
  const ledger = new Map<string, LedgerEntry>();
  const heads = new Map<string, SourceHead>();
  const playerStates = new Map<string, CurrentPlayerState>();
  const playerPriors = new Map<string, CurrentPlayerPrior>();
  const fixtureMarkets = new Map<string, CurrentFixtureMarketState>();

  return {
    async claim(slot) {
      if (ledger.has(slot.attemptKey)) return false;
      ledger.set(slot.attemptKey, { slot: copy(slot), status: "running" });
      const headKey = `${slot.sourceKey}:${slot.seasonKey}`;
      const current = heads.get(headKey);
      if (!current || Date.parse(slot.scheduledFor) >= Date.parse(current.lastAttemptAt)) {
        heads.set(headKey, {
          ...(current ?? {
            sourceKey: slot.sourceKey,
            seasonKey: slot.seasonKey,
            rawObjects: [],
            stateRowCount: 0,
            healthMetadata: {},
          }),
          scopeKey: slot.scopeKey,
          lastAttemptStatus: "running",
          lastAttemptAt: slot.scheduledFor,
        });
      }
      return true;
    },

    async commit(capture) {
      const entry = ledger.get(capture.slot.attemptKey);
      if (!entry) throw new Error(`Collection slot ${capture.slot.attemptKey} was not claimed`);
      const headKey = `${capture.slot.sourceKey}:${capture.slot.seasonKey}`;
      const currentHead = heads.get(headKey);
      if (
        currentHead &&
        Date.parse(currentHead.lastAttemptAt) > Date.parse(capture.slot.scheduledFor)
      ) {
        ledger.set(capture.slot.attemptKey, {
          slot: copy(capture.slot),
          status: "skipped",
          finishedAt: capture.capturedAt,
          expiresAt: new Date(Date.parse(capture.capturedAt) + 14 * 86_400_000).toISOString(),
        });
        return {
          attemptKey: capture.slot.attemptKey,
          batchId: capture.batchId,
          captureChanged: false,
          modelInputChanged: false,
          sourceHealthChanged: false,
          changedRows: { playerStates: 0, playerPriors: 0, fixtureMarkets: 0 },
        };
      }
      const changedRows = { playerStates: 0, playerPriors: 0, fixtureMarkets: 0 };
      for (const state of capture.playerStates ?? []) {
        const current = playerStates.get(state.registrationKey);
        if (rowChanged(current, state)) {
          playerStates.set(state.registrationKey, copy(state));
          changedRows.playerStates += 1;
        }
      }
      for (const prior of capture.playerPriors ?? []) {
        const current = playerPriors.get(prior.registrationKey);
        if (rowChanged(current, prior)) {
          playerPriors.set(prior.registrationKey, copy(prior));
          changedRows.playerPriors += 1;
        }
      }
      for (const market of capture.fixtureMarkets ?? []) {
        const key = market.fixtureKey;
        const current = fixtureMarkets.get(key);
        if (rowChanged(current, market)) {
          fixtureMarkets.set(key, copy(market));
          changedRows.fixtureMarkets += 1;
        }
      }
      if (capture.fixtureMarkets) {
        const currentKeys = new Set(capture.fixtureMarkets.map((market) => market.fixtureKey));
        for (const [key, market] of fixtureMarkets) {
          if (
            market.sourceKey === capture.slot.sourceKey &&
            market.seasonKey === capture.slot.seasonKey &&
            !currentKeys.has(key)
          ) {
            fixtureMarkets.delete(key);
            changedRows.fixtureMarkets += 1;
          }
        }
      }
      const finishedAt = capture.capturedAt;
      ledger.set(capture.slot.attemptKey, {
        slot: copy(capture.slot),
        status: "succeeded",
        finishedAt,
        expiresAt: new Date(Date.parse(finishedAt) + 14 * 86_400_000).toISOString(),
      });
      const captureChanged = currentHead?.captureHash !== capture.captureHash;
      const modelInputChanged = currentHead?.modelInputHash !== capture.modelInputHash;
      const sourceHealthChanged =
        currentHead?.lastAttemptStatus !== "succeeded" ||
        currentHead?.lastSuccessfulCapturedAt !== capture.capturedAt ||
        JSON.stringify(currentHead?.healthMetadata ?? {}) !==
          JSON.stringify(capture.healthMetadata ?? {});
      if (
        !currentHead?.lastSuccessfulCapturedAt ||
        Date.parse(capture.capturedAt) >= Date.parse(currentHead.lastSuccessfulCapturedAt)
      ) {
        const stateRowCount =
          capture.stateRowCount ??
          (capture.playerStates?.length ?? 0) +
            (capture.playerPriors?.length ?? 0) +
            (capture.fixtureMarkets?.length ?? 0);
        heads.set(headKey, {
          sourceKey: capture.slot.sourceKey,
          seasonKey: capture.slot.seasonKey,
          scopeKey: capture.slot.scopeKey,
          lastAttemptStatus: "succeeded",
          lastAttemptAt: capture.slot.scheduledFor,
          lastSuccessfulBatchId: capture.batchId,
          lastSuccessfulCapturedAt: capture.capturedAt,
          captureHash: capture.captureHash,
          modelInputHash: capture.modelInputHash,
          rawObjects: copy(capture.rawObjects),
          stateRowCount,
          healthMetadata: copy(capture.healthMetadata ?? {}),
        });
      }
      return {
        attemptKey: capture.slot.attemptKey,
        batchId: capture.batchId,
        captureChanged,
        modelInputChanged,
        sourceHealthChanged,
        changedRows,
      };
    },

    async fail(failure) {
      if (!ledger.has(failure.slot.attemptKey)) {
        throw new Error(`Collection slot ${failure.slot.attemptKey} was not claimed`);
      }
      ledger.set(failure.slot.attemptKey, {
        slot: copy(failure.slot),
        status: "failed",
        finishedAt: failure.finishedAt,
        error: failure.error.slice(0, 1_000),
        expiresAt: new Date(Date.parse(failure.finishedAt) + 30 * 86_400_000).toISOString(),
      });
      const headKey = `${failure.slot.sourceKey}:${failure.slot.seasonKey}`;
      const current = heads.get(headKey);
      if (!current || Date.parse(failure.slot.scheduledFor) >= Date.parse(current.lastAttemptAt)) {
        heads.set(headKey, {
          ...(current ?? {
            sourceKey: failure.slot.sourceKey,
            seasonKey: failure.slot.seasonKey,
            rawObjects: [],
            stateRowCount: 0,
            healthMetadata: {},
          }),
          scopeKey: failure.slot.scopeKey,
          lastAttemptStatus: "failed",
          lastAttemptAt: failure.slot.scheduledFor,
          lastAttemptError: failure.error.slice(0, 1_000),
        });
      }
    },

    async prune(now) {
      const cutoff = Date.parse(now);
      const receipt = { succeededOrSkipped: 0, failedOrPartial: 0 };
      for (const [key, entry] of ledger) {
        if (!entry.expiresAt || Date.parse(entry.expiresAt) > cutoff) continue;
        if (entry.status === "failed" || entry.status === "partial") {
          receipt.failedOrPartial += 1;
        } else {
          receipt.succeededOrSkipped += 1;
        }
        ledger.delete(key);
      }
      return receipt;
    },

    async loadState(request) {
      const cutoff = Date.parse(request.cutoffAt);
      const sourceHeads = [...heads.values()].filter(
        (head) =>
          head.seasonKey === request.seasonKey &&
          Date.parse(head.lastSuccessfulCapturedAt ?? head.lastAttemptAt) <= cutoff,
      );
      const currentPlayers = [...playerStates.values()].filter(
        (state) => state.seasonKey === request.seasonKey && Date.parse(state.observedAt) <= cutoff,
      );
      const currentPriors = [...playerPriors.values()].filter(
        (state) => state.seasonKey === request.seasonKey && Date.parse(state.observedAt) <= cutoff,
      );
      const currentMarkets = [...fixtureMarkets.values()].filter(
        (state) => state.seasonKey === request.seasonKey && Date.parse(state.observedAt) <= cutoff,
      );
      if (
        sourceHeads.length === 0 &&
        currentPlayers.length === 0 &&
        currentPriors.length === 0 &&
        currentMarkets.length === 0
      ) {
        return null;
      }
      return copy({
        seasonKey: request.seasonKey,
        sourceHeads,
        playerStates: currentPlayers,
        playerPriors: currentPriors,
        fixtureMarkets: currentMarkets,
      });
    },
  };
}
