import { createHash } from "node:crypto";
import { Pool } from "@neondatabase/serverless";
import { and, asc, eq, inArray, isNull, ne, notInArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import type { CaptureAttempt, CaptureAttemptStore, StoredSnapshot } from "../collector.ts";
import type { CaptureBatch, JsonValue } from "../contracts.ts";
import { canonicalJson } from "../hot-cold/artifact-store.ts";
import { defaultFplRuleset } from "../model/v2.ts";
import {
  playerRegistrationInputSchema,
  laterPriceState,
  laterSeasonLifecycle,
  seasonManifestSchema,
  type FixtureLink,
  type ParsedSeasonManifest,
  type PlayerRegistration,
  type PlayerRegistrationInput,
  type SeasonCatalog,
  type SeasonFixture,
} from "../season-domain.ts";
import {
  captureAttempts,
  datasets,
  entities,
  fixtureGameweekAssignments,
  fixtureLinks,
  fixtures,
  playerRegistrations,
  playerPriorsCurrent,
  playerStateCurrent,
  rulesets,
  seasons,
  sourceEntityAliases,
  sources,
  teamSeasons,
} from "./schema.ts";
import * as schema from "./schema.ts";

function database(connection: string | Pool) {
  if (!connection) throw new Error("DATABASE_URL is required");
  const owned = typeof connection === "string";
  const pool = owned ? new Pool({ connectionString: connection }) : connection;
  return {
    db: drizzle({ client: pool, schema }),
    close: async () => {
      if (owned) await pool.end();
    },
  };
}

function snapshotFromMetadata(metadata: Record<string, JsonValue>): StoredSnapshot | undefined {
  const value = metadata.snapshot;
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, JsonValue>;
  if (
    typeof candidate.objectKey !== "string" ||
    typeof candidate.sha256 !== "string" ||
    typeof candidate.compressedBytes !== "number" ||
    typeof candidate.uncompressedBytes !== "number" ||
    (candidate.encoding !== "gzip" && candidate.encoding !== "identity") ||
    candidate.contentType !== "application/json"
  ) {
    return undefined;
  }
  return candidate as StoredSnapshot;
}

function captureAttemptFromRow(row: typeof captureAttempts.$inferSelect): CaptureAttempt {
  return {
    key: row.attemptKey,
    sourceKey: row.sourceKey,
    scopeKey: row.scopeKey,
    scheduledFor: new Date(row.scheduledFor).toISOString(),
    status: row.status as CaptureAttempt["status"],
    ...(row.startedAt ? { startedAt: new Date(row.startedAt).toISOString() } : {}),
    ...(row.finishedAt ? { finishedAt: new Date(row.finishedAt).toISOString() } : {}),
    ...(row.batchId ? { batchId: row.batchId } : {}),
    ...(snapshotFromMetadata(row.metadata) ? { snapshot: snapshotFromMetadata(row.metadata) } : {}),
    ...(row.error ? { error: row.error } : {}),
  };
}

export type NeonCaptureAttemptStore = CaptureAttemptStore & { close(): Promise<void> };

export function createNeonCaptureAttemptStore(
  connectionString: string | Pool,
): NeonCaptureAttemptStore {
  const { close, db } = database(connectionString);
  return {
    async claim(attempt) {
      const inserted = await db
        .insert(captureAttempts)
        .values({
          attemptKey: attempt.key,
          sourceKey: attempt.sourceKey,
          scopeKey: attempt.scopeKey,
          scheduledFor: attempt.scheduledFor,
          status: attempt.status,
          startedAt: attempt.startedAt,
        })
        .onConflictDoNothing()
        .returning({ key: captureAttempts.attemptKey });
      return inserted.length === 1;
    },
    async finish(attempt) {
      await db
        .update(captureAttempts)
        .set({
          status: attempt.status,
          finishedAt: attempt.finishedAt,
          batchId: attempt.batchId,
          objectKey: attempt.snapshot?.objectKey,
          error: attempt.error,
          metadata: attempt.snapshot ? { snapshot: attempt.snapshot } : {},
        })
        .where(eq(captureAttempts.attemptKey, attempt.key));
    },
    async read(key) {
      const [row] = await db
        .select()
        .from(captureAttempts)
        .where(eq(captureAttempts.attemptKey, key))
        .limit(1);
      return row ? captureAttemptFromRow(row) : null;
    },
    async list() {
      return (
        await db.select().from(captureAttempts).orderBy(asc(captureAttempts.scheduledFor))
      ).map(captureAttemptFromRow);
    },
    async close() {
      await close();
    },
  };
}

function durablePlayerKey(input: ReturnType<typeof playerRegistrationInputSchema.parse>): string {
  if (input.optaCode) return `epl:person:opta:${input.optaCode.toLocaleLowerCase()}`;
  if (input.fplCode) return `epl:person:fpl-code:${input.fplCode}`;
  return `${input.seasonKey}:person:provisional:fpl-${input.fplElementId}`;
}

function registrationFromRow(row: typeof playerRegistrations.$inferSelect): PlayerRegistration {
  const metadata = row.metadata;
  return {
    key: row.registrationKey,
    seasonKey: row.seasonKey,
    fplElementId: row.fplElementId!,
    playerName: row.playerName,
    teamKey: typeof metadata.teamKey === "string" ? metadata.teamKey : "unresolved",
    teamSeasonKey: row.teamSeasonKey ?? "unresolved",
    position: row.position as PlayerRegistration["position"],
    status: row.status as PlayerRegistration["status"],
    confidence: row.confidence,
    playerKey: row.playerKey,
    ...(typeof metadata.optaCode === "string" ? { optaCode: metadata.optaCode } : {}),
    ...(typeof metadata.fplCode === "number" ? { fplCode: metadata.fplCode } : {}),
  };
}

export type NeonSeasonCatalog = SeasonCatalog & {
  saveFplCaptureDimensions(seasonKey: string, batch: CaptureBatch): Promise<void>;
  saveCaptureDimensions(batch: CaptureBatch): Promise<void>;
  saveFixtureLinks(links: FixtureLink[]): Promise<void>;
  close(): Promise<void>;
};

export function createNeonSeasonCatalog(connectionString: string | Pool): NeonSeasonCatalog {
  const { close, db } = database(connectionString);

  async function fixturesForSeason(seasonKey: string): Promise<SeasonFixture[]> {
    const [seasonRow] = await db
      .select()
      .from(seasons)
      .where(eq(seasons.seasonKey, seasonKey))
      .limit(1);
    if (!seasonRow) return [];
    const rows = await db
      .select({ fixture: fixtures, assignment: fixtureGameweekAssignments })
      .from(fixtures)
      .innerJoin(
        fixtureGameweekAssignments,
        eq(fixtures.fixtureKey, fixtureGameweekAssignments.fixtureKey),
      )
      .where(
        and(eq(fixtures.season, seasonRow.label), isNull(fixtureGameweekAssignments.effectiveTo)),
      )
      .orderBy(asc(fixtureGameweekAssignments.gameweek), asc(fixtureGameweekAssignments.kickoffAt));
    return rows.map(({ fixture, assignment }) => ({
      key: fixture.fixtureKey,
      homeTeamKey:
        typeof fixture.metadata.homeTeamSeasonKey === "string"
          ? fixture.metadata.homeTeamSeasonKey
          : fixture.homeTeam,
      awayTeamKey:
        typeof fixture.metadata.awayTeamSeasonKey === "string"
          ? fixture.metadata.awayTeamSeasonKey
          : fixture.awayTeam,
      kickoffAt: new Date(assignment.kickoffAt).toISOString(),
      deadlineAt: new Date(assignment.deadlineAt).toISOString(),
      gameweek: assignment.gameweek,
    }));
  }

  async function season(key: string): Promise<ParsedSeasonManifest | null> {
    const [row, teamRows, fixtureRows] = await Promise.all([
      db.select().from(seasons).where(eq(seasons.seasonKey, key)).limit(1),
      db.select().from(teamSeasons).where(eq(teamSeasons.seasonKey, key)),
      fixturesForSeason(key),
    ]);
    const seasonRow = row[0];
    if (!seasonRow) return null;
    return seasonManifestSchema.parse({
      key: seasonRow.seasonKey,
      competition: seasonRow.competition,
      label: seasonRow.label,
      startsAt: new Date(seasonRow.startsAt).toISOString(),
      endsAt: new Date(seasonRow.endsAt).toISOString(),
      lifecycle: seasonRow.lifecycle,
      priceState: seasonRow.priceState,
      rulesetKey: seasonRow.rulesetKey,
      teams: teamRows.map((team) => ({
        key: team.teamSeasonKey,
        clubKey: team.clubKey,
        name: team.name,
        shortName: team.shortName,
      })),
      fixtures: fixtureRows,
    });
  }

  return {
    async importManifest(untrustedManifest) {
      const manifest = seasonManifestSchema.parse(untrustedManifest);
      const now = new Date().toISOString();
      const [currentSeason] = await db
        .select({ lifecycle: seasons.lifecycle, priceState: seasons.priceState })
        .from(seasons)
        .where(eq(seasons.seasonKey, manifest.key))
        .limit(1);
      const lifecycle = currentSeason
        ? laterSeasonLifecycle(
            currentSeason.lifecycle as ParsedSeasonManifest["lifecycle"],
            manifest.lifecycle,
          )
        : manifest.lifecycle;
      const priceState = currentSeason
        ? laterPriceState(
            currentSeason.priceState as ParsedSeasonManifest["priceState"],
            manifest.priceState,
          )
        : manifest.priceState;
      const scoring = { ...defaultFplRuleset, key: manifest.rulesetKey } as unknown as Record<
        string,
        JsonValue
      >;
      const checksum = createHash("sha256").update(JSON.stringify(scoring)).digest("hex");
      const rulesetStatus = manifest.rulesetKey.includes("provisional")
        ? "provisional"
        : "official";
      const rulesetVersion = manifest.rulesetKey.split(":").at(-1) ?? "v1";
      await db.transaction(async (tx) => {
        await tx
          .insert(rulesets)
          .values({
            rulesetKey: manifest.rulesetKey,
            seasonKey: manifest.key,
            version: rulesetVersion,
            status: rulesetStatus,
            scoring,
            observedAt: now,
            checksum,
          })
          .onConflictDoNothing();
        await tx
          .insert(seasons)
          .values({
            seasonKey: manifest.key,
            competition: manifest.competition,
            label: manifest.label,
            startsAt: manifest.startsAt,
            endsAt: manifest.endsAt,
            lifecycle,
            priceState,
            rulesetKey: manifest.rulesetKey,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: seasons.seasonKey,
            set: {
              label: manifest.label,
              startsAt: manifest.startsAt,
              endsAt: manifest.endsAt,
              lifecycle,
              priceState,
              rulesetKey: manifest.rulesetKey,
              updatedAt: now,
            },
            setWhere: sql`${seasons.label} is distinct from excluded.label
              or ${seasons.startsAt} is distinct from excluded.starts_at
              or ${seasons.endsAt} is distinct from excluded.ends_at
              or ${seasons.lifecycle} is distinct from excluded.lifecycle
              or ${seasons.priceState} is distinct from excluded.price_state
              or ${seasons.rulesetKey} is distinct from excluded.ruleset_key`,
          });
        await tx
          .insert(datasets)
          .values({
            datasetKey: "live",
            seasonKey: manifest.key,
            kind: "live",
            label: `${manifest.label} live`,
          })
          .onConflictDoUpdate({
            target: datasets.datasetKey,
            set: { seasonKey: manifest.key, label: `${manifest.label} live` },
            setWhere: sql`${datasets.seasonKey} is distinct from excluded.season_key
              or ${datasets.label} is distinct from excluded.label`,
          });
        if (manifest.teams.length > 0) {
          await tx
            .insert(teamSeasons)
            .values(
              manifest.teams.map((team) => ({
                teamSeasonKey: team.key,
                seasonKey: manifest.key,
                clubKey: team.clubKey,
                name: team.name,
                shortName: team.shortName,
              })),
            )
            .onConflictDoUpdate({
              target: teamSeasons.teamSeasonKey,
              set: {
                name: sql`excluded.name`,
                shortName: sql`excluded.short_name`,
              },
              setWhere: sql`${teamSeasons.name} is distinct from excluded.name
                or ${teamSeasons.shortName} is distinct from excluded.short_name`,
            });
        }
        const teamByKey = new Map(manifest.teams.map((team) => [team.key, team]));
        const fixtureValues = manifest.fixtures.map((fixture) => {
          const home = teamByKey.get(fixture.homeTeamKey);
          const away = teamByKey.get(fixture.awayTeamKey);
          if (!home || !away) throw new Error(`Fixture ${fixture.key} references an unknown team`);
          return {
            fixtureKey: fixture.key,
            seasonKey: manifest.key,
            competition: manifest.competition,
            season: manifest.label,
            gameweek: fixture.gameweek,
            homeTeam: home.shortName,
            awayTeam: away.shortName,
            kickoffAt: fixture.kickoffAt,
            deadlineAt: fixture.deadlineAt,
            metadata: {
              seasonKey: manifest.key,
              homeTeamSeasonKey: home.key,
              awayTeamSeasonKey: away.key,
            },
          };
        });
        if (fixtureValues.length > 0) {
          await tx
            .insert(fixtures)
            .values(fixtureValues)
            .onConflictDoUpdate({
              target: fixtures.fixtureKey,
              set: {
                seasonKey: sql`excluded.season_key`,
                gameweek: sql`excluded.gameweek`,
                kickoffAt: sql`excluded.kickoff_at`,
                deadlineAt: sql`excluded.deadline_at`,
                metadata: sql`excluded.metadata`,
              },
              setWhere: sql`${fixtures.seasonKey} is distinct from excluded.season_key
                or ${fixtures.gameweek} is distinct from excluded.gameweek
                or ${fixtures.kickoffAt} is distinct from excluded.kickoff_at
                or ${fixtures.deadlineAt} is distinct from excluded.deadline_at
                or ${fixtures.metadata} is distinct from excluded.metadata`,
            });
        }
        const activeAssignments =
          fixtureValues.length === 0
            ? []
            : await tx
                .select()
                .from(fixtureGameweekAssignments)
                .where(
                  and(
                    inArray(
                      fixtureGameweekAssignments.fixtureKey,
                      fixtureValues.map((fixture) => fixture.fixtureKey),
                    ),
                    isNull(fixtureGameweekAssignments.effectiveTo),
                  ),
                );
        const activeByFixture = new Map(
          activeAssignments.map((assignment) => [assignment.fixtureKey, assignment]),
        );
        const changedAssignments = manifest.fixtures.filter((fixture) => {
          const active = activeByFixture.get(fixture.key);
          return (
            !active ||
            active.gameweek !== fixture.gameweek ||
            new Date(active.kickoffAt).toISOString() !== fixture.kickoffAt ||
            new Date(active.deadlineAt).toISOString() !== fixture.deadlineAt
          );
        });
        for (const fixture of changedAssignments) {
          const active = activeByFixture.get(fixture.key);
          if (active) {
            await tx
              .update(fixtureGameweekAssignments)
              .set({ effectiveTo: now })
              .where(
                and(
                  eq(fixtureGameweekAssignments.fixtureKey, fixture.key),
                  eq(fixtureGameweekAssignments.effectiveFrom, active.effectiveFrom),
                ),
              );
          }
        }
        if (changedAssignments.length > 0) {
          await tx.insert(fixtureGameweekAssignments).values(
            changedAssignments.map((fixture) => ({
              fixtureKey: fixture.key,
              effectiveFrom: now,
              kickoffAt: fixture.kickoffAt,
              deadlineAt: fixture.deadlineAt,
              gameweek: fixture.gameweek,
            })),
          );
        }
      });
    },
    season,
    fixturesForSeason,
    async teamByAlias(seasonKey, alias) {
      const manifest = await season(seasonKey);
      if (!manifest) return null;
      let canonical = alias.trim().toLocaleUpperCase();
      try {
        const { resolvePremierLeagueTeam } = await import("../entity-resolution.ts");
        canonical = resolvePremierLeagueTeam(alias);
      } catch {
        // Name matching below is deliberately exact after normalisation.
      }
      const normalized = alias
        .replaceAll(/[^a-zA-Z0-9]+/g, " ")
        .trim()
        .toLocaleLowerCase();
      return (
        manifest.teams.find(
          (team) =>
            team.clubKey === canonical ||
            team.name
              .replaceAll(/[^a-zA-Z0-9]+/g, " ")
              .trim()
              .toLocaleLowerCase() === normalized ||
            team.shortName.toLocaleLowerCase() === normalized,
        ) ?? null
      );
    },
    async registerPlayer(untrustedInput: PlayerRegistrationInput) {
      const input = playerRegistrationInputSchema.parse(untrustedInput);
      const manifest = await season(input.seasonKey);
      const team = manifest?.teams.find(
        (candidate) => candidate.clubKey === input.teamKey || candidate.shortName === input.teamKey,
      );
      const key = `${input.seasonKey}:registration:fpl-${input.fplElementId}`;
      const playerKey = durablePlayerKey(input);
      const teamSeasonKey =
        team?.key ?? `${input.seasonKey}:team:${input.teamKey.toLocaleLowerCase()}`;
      await db
        .insert(playerRegistrations)
        .values({
          registrationKey: key,
          seasonKey: input.seasonKey,
          playerKey,
          teamSeasonKey,
          fplElementId: input.fplElementId,
          playerName: input.playerName,
          position: input.position,
          status: input.status,
          confidence: input.confidence,
          metadata: {
            teamKey: input.teamKey,
            ...(input.optaCode ? { optaCode: input.optaCode } : {}),
            ...(input.fplCode ? { fplCode: input.fplCode } : {}),
          },
        })
        .onConflictDoUpdate({
          target: playerRegistrations.registrationKey,
          set: {
            playerKey,
            teamSeasonKey,
            playerName: input.playerName,
            position: input.position,
            status: input.status,
            confidence: input.confidence,
            metadata: {
              teamKey: input.teamKey,
              ...(input.optaCode ? { optaCode: input.optaCode } : {}),
              ...(input.fplCode ? { fplCode: input.fplCode } : {}),
            },
          },
          setWhere: sql`${playerRegistrations.playerKey} is distinct from excluded.player_key
            or ${playerRegistrations.teamSeasonKey} is distinct from excluded.team_season_key
            or ${playerRegistrations.playerName} is distinct from excluded.player_name
            or ${playerRegistrations.position} is distinct from excluded.position
            or ${playerRegistrations.status} is distinct from excluded.status
            or ${playerRegistrations.confidence} is distinct from excluded.confidence
            or ${playerRegistrations.metadata} is distinct from excluded.metadata`,
        });
      return { ...input, key, playerKey, teamSeasonKey };
    },
    async registrationsForPlayer(playerKey) {
      return (
        await db
          .select()
          .from(playerRegistrations)
          .where(eq(playerRegistrations.playerKey, playerKey))
          .orderBy(asc(playerRegistrations.seasonKey))
      ).map(registrationFromRow);
    },
    async fixtureLink(sourceKey, seasonKey, sourceEventId) {
      const [row] = await db
        .select()
        .from(fixtureLinks)
        .where(
          and(
            eq(fixtureLinks.sourceKey, sourceKey),
            eq(fixtureLinks.seasonKey, seasonKey),
            eq(fixtureLinks.sourceEventId, sourceEventId),
          ),
        )
        .limit(1);
      if (!row) return null;
      return {
        sourceKey: row.sourceKey,
        seasonKey: row.seasonKey,
        sourceEventId: row.sourceEventId,
        ...(row.fixtureKey ? { fixtureKey: row.fixtureKey } : {}),
        status: row.status as FixtureLink["status"],
        ...(row.matchMethod ? { matchMethod: row.matchMethod as FixtureLink["matchMethod"] } : {}),
        confidence: row.confidence,
        candidateFixtureKeys: row.candidateFixtureKeys,
        observedAt: new Date(row.observedAt).toISOString(),
      };
    },
    async saveFixtureLink(link) {
      await db
        .insert(fixtureLinks)
        .values({
          sourceKey: link.sourceKey,
          seasonKey: link.seasonKey,
          sourceEventId: link.sourceEventId,
          fixtureKey: link.fixtureKey,
          status: link.status,
          matchMethod: link.matchMethod,
          confidence: link.confidence,
          candidateFixtureKeys: link.candidateFixtureKeys,
          observedAt: link.observedAt,
        })
        .onConflictDoUpdate({
          target: [fixtureLinks.sourceKey, fixtureLinks.seasonKey, fixtureLinks.sourceEventId],
          set: {
            fixtureKey: link.fixtureKey,
            status: link.status,
            matchMethod: link.matchMethod,
            confidence: link.confidence,
            candidateFixtureKeys: link.candidateFixtureKeys,
            observedAt: link.observedAt,
          },
          setWhere: sql`${fixtureLinks.fixtureKey} is distinct from excluded.fixture_key
            or ${fixtureLinks.status} is distinct from excluded.status
            or ${fixtureLinks.matchMethod} is distinct from excluded.match_method
            or ${fixtureLinks.confidence} is distinct from excluded.confidence
            or ${fixtureLinks.candidateFixtureKeys} is distinct from excluded.candidate_fixture_keys`,
        });
    },
    async saveFixtureLinks(links) {
      if (links.length === 0) return;
      await db
        .insert(fixtureLinks)
        .values(
          links.map((link) => ({
            sourceKey: link.sourceKey,
            seasonKey: link.seasonKey,
            sourceEventId: link.sourceEventId,
            fixtureKey: link.fixtureKey,
            status: link.status,
            matchMethod: link.matchMethod,
            confidence: link.confidence,
            candidateFixtureKeys: link.candidateFixtureKeys,
            observedAt: link.observedAt,
          })),
        )
        .onConflictDoUpdate({
          target: [fixtureLinks.sourceKey, fixtureLinks.seasonKey, fixtureLinks.sourceEventId],
          set: {
            fixtureKey: sql`excluded.fixture_key`,
            status: sql`excluded.status`,
            matchMethod: sql`excluded.match_method`,
            confidence: sql`excluded.confidence`,
            candidateFixtureKeys: sql`excluded.candidate_fixture_keys`,
            observedAt: sql`excluded.observed_at`,
          },
          setWhere: sql`${fixtureLinks.fixtureKey} is distinct from excluded.fixture_key
            or ${fixtureLinks.status} is distinct from excluded.status
            or ${fixtureLinks.matchMethod} is distinct from excluded.match_method
            or ${fixtureLinks.confidence} is distinct from excluded.confidence
            or ${fixtureLinks.candidateFixtureKeys} is distinct from excluded.candidate_fixture_keys`,
        });
    },
    async saveFplCaptureDimensions(seasonKey, batch) {
      if (batch.source.key !== "fpl") {
        throw new Error(`Expected an FPL batch, received ${batch.source.key}`);
      }
      const playerEntities = (batch.entities ?? []).filter((entity) => entity.type === "player");
      if (playerEntities.length === 0) {
        throw new Error("FPL dimension sync requires the official player roster");
      }
      await db.transaction(async (tx) => {
        const rulesetChecksum = batch.metadata?.rulesetChecksum;
        const gameConfig = batch.metadata?.gameConfig;
        const elementTypes = batch.metadata?.elementTypes;
        if (
          typeof rulesetChecksum === "string" &&
          gameConfig &&
          typeof gameConfig === "object" &&
          !Array.isArray(gameConfig) &&
          Array.isArray(elementTypes)
        ) {
          await tx
            .update(rulesets)
            .set({
              status: "official",
              uiConfig: { gameConfig, elementTypes },
              observedAt: batch.capturedAt,
              checksum: rulesetChecksum,
              sourceUrl: "https://fantasy.premierleague.com/api/bootstrap-static/",
            })
            .where(
              and(
                eq(rulesets.seasonKey, seasonKey),
                sql`${rulesets.checksum} is distinct from ${rulesetChecksum}`,
              ),
            );
        }
        await tx
          .insert(sources)
          .values({
            sourceKey: batch.source.key,
            label: batch.source.label,
            kind: batch.source.kind,
            lastCapturedAt: batch.capturedAt,
            metadata: batch.source.metadata ?? {},
          })
          .onConflictDoUpdate({
            target: sources.sourceKey,
            set: {
              label: batch.source.label,
              kind: batch.source.kind,
              metadata: batch.source.metadata ?? {},
            },
            setWhere: sql`${sources.label} is distinct from excluded.label
              or ${sources.kind} is distinct from excluded.kind
              or ${sources.metadata} is distinct from excluded.metadata`,
          });

        const entityRows = batch.entities ?? [];
        if (entityRows.length > 0) {
          await tx
            .insert(entities)
            .values(
              entityRows.map((entity) => ({
                entityKey: entity.key,
                entityType: entity.type,
                name: entity.name,
                teamKey: entity.teamKey,
                metadata: entity.metadata ?? {},
              })),
            )
            .onConflictDoUpdate({
              target: entities.entityKey,
              set: {
                entityType: sql`excluded.entity_type`,
                name: sql`excluded.name`,
                teamKey: sql`excluded.team_key`,
                metadata: sql`excluded.metadata`,
              },
              setWhere: sql`${entities.entityType} is distinct from excluded.entity_type
                or ${entities.name} is distinct from excluded.name
                or ${entities.teamKey} is distinct from excluded.team_key
                or ${entities.metadata} is distinct from excluded.metadata`,
            });
        }

        const teamRows = await tx
          .select()
          .from(teamSeasons)
          .where(eq(teamSeasons.seasonKey, seasonKey));
        const teamByAlias = new Map(
          teamRows.flatMap((team) => [
            [team.shortName, team.teamSeasonKey] as const,
            [team.clubKey, team.teamSeasonKey] as const,
          ]),
        );
        const registrations = playerEntities.flatMap((entity) => {
          const fplElementId = entity.metadata?.fplElementId;
          const position = entity.metadata?.position;
          const registrationKey = entity.metadata?.registrationKey;
          const teamSeasonKey = entity.teamKey ? teamByAlias.get(entity.teamKey) : undefined;
          if (
            typeof fplElementId !== "number" ||
            typeof position !== "string" ||
            !["GKP", "DEF", "MID", "FWD"].includes(position) ||
            typeof registrationKey !== "string" ||
            !entity.teamKey ||
            !teamSeasonKey
          ) {
            throw new Error(`FPL player ${entity.key} has incomplete registration metadata`);
          }
          return [
            {
              registrationKey,
              seasonKey,
              playerKey: entity.key,
              teamSeasonKey,
              fplElementId,
              playerName: entity.name,
              position,
              status: "active",
              confidence: 1,
              metadata: {
                teamKey: entity.teamKey,
                ...(typeof entity.metadata?.optaCode === "string"
                  ? { optaCode: entity.metadata.optaCode }
                  : {}),
                ...(typeof entity.metadata?.fplCode === "number"
                  ? { fplCode: entity.metadata.fplCode }
                  : {}),
              },
            },
          ];
        });
        await tx
          .insert(playerRegistrations)
          .values(registrations)
          .onConflictDoUpdate({
            target: playerRegistrations.registrationKey,
            set: {
              playerKey: sql`excluded.player_key`,
              teamSeasonKey: sql`excluded.team_season_key`,
              fplElementId: sql`excluded.fpl_element_id`,
              playerName: sql`excluded.player_name`,
              position: sql`excluded.position`,
              status: sql`excluded.status`,
              confidence: sql`excluded.confidence`,
              metadata: sql`excluded.metadata`,
            },
            setWhere: sql`${playerRegistrations.playerKey} is distinct from excluded.player_key
              or ${playerRegistrations.teamSeasonKey} is distinct from excluded.team_season_key
              or ${playerRegistrations.fplElementId} is distinct from excluded.fpl_element_id
              or ${playerRegistrations.playerName} is distinct from excluded.player_name
              or ${playerRegistrations.position} is distinct from excluded.position
              or ${playerRegistrations.status} is distinct from excluded.status
              or ${playerRegistrations.confidence} is distinct from excluded.confidence
              or ${playerRegistrations.metadata} is distinct from excluded.metadata`,
          });

        const currentRegistrationKeys = registrations.map(
          (registration) => registration.registrationKey,
        );
        await tx
          .update(playerRegistrations)
          .set({ status: "departed" })
          .where(
            and(
              eq(playerRegistrations.seasonKey, seasonKey),
              ne(playerRegistrations.status, "departed"),
              notInArray(playerRegistrations.registrationKey, currentRegistrationKeys),
            ),
          );
        await tx
          .delete(playerStateCurrent)
          .where(
            and(
              eq(playerStateCurrent.seasonKey, seasonKey),
              notInArray(playerStateCurrent.registrationKey, currentRegistrationKeys),
            ),
          );
        await tx
          .delete(playerPriorsCurrent)
          .where(
            and(
              eq(playerPriorsCurrent.seasonKey, seasonKey),
              notInArray(playerPriorsCurrent.registrationKey, currentRegistrationKeys),
            ),
          );

        const activeAliases = await tx
          .select()
          .from(sourceEntityAliases)
          .where(
            and(
              eq(sourceEntityAliases.sourceKey, batch.source.key),
              isNull(sourceEntityAliases.effectiveTo),
            ),
          );
        const aliasKey = (sourceEntityKey: string, aliasSeasonKey: string | null | undefined) =>
          `${sourceEntityKey}\u0000${aliasSeasonKey ?? ""}`;
        const activeByKey = new Map(
          activeAliases.map((alias) => [aliasKey(alias.sourceEntityKey, alias.seasonKey), alias]),
        );
        const changedAliases = (batch.entityAliases ?? []).filter((alias) => {
          const active = activeByKey.get(aliasKey(alias.sourceEntityKey, alias.seasonKey));
          return (
            !active ||
            active.entityKey !== alias.entityKey ||
            active.matchMethod !== alias.matchMethod ||
            active.confidence !== alias.confidence ||
            canonicalJson(active.metadata) !== canonicalJson(alias.metadata ?? {})
          );
        });
        for (const alias of changedAliases) {
          const active = activeByKey.get(aliasKey(alias.sourceEntityKey, alias.seasonKey));
          if (!active) continue;
          await tx
            .update(sourceEntityAliases)
            .set({ effectiveTo: alias.effectiveFrom })
            .where(
              and(
                eq(sourceEntityAliases.sourceKey, active.sourceKey),
                eq(sourceEntityAliases.sourceEntityKey, active.sourceEntityKey),
                eq(sourceEntityAliases.effectiveFrom, active.effectiveFrom),
              ),
            );
        }
        if (changedAliases.length > 0) {
          await tx.insert(sourceEntityAliases).values(
            changedAliases.map((alias) => ({
              sourceKey: alias.sourceKey,
              sourceEntityKey: alias.sourceEntityKey,
              entityKey: alias.entityKey,
              matchMethod: alias.matchMethod,
              confidence: alias.confidence,
              effectiveFrom: alias.effectiveFrom,
              effectiveTo: alias.effectiveTo,
              seasonKey: alias.seasonKey,
              metadata: alias.metadata ?? {},
            })),
          );
        }
      });
    },
    async saveCaptureDimensions(batch) {
      if ((batch.entities?.length ?? 0) === 0 && (batch.entityAliases?.length ?? 0) === 0) {
        return;
      }
      await db.transaction(async (tx) => {
        await tx
          .insert(sources)
          .values({
            sourceKey: batch.source.key,
            label: batch.source.label,
            kind: batch.source.kind,
            lastCapturedAt: batch.capturedAt,
            metadata: batch.source.metadata ?? {},
          })
          .onConflictDoUpdate({
            target: sources.sourceKey,
            set: {
              label: batch.source.label,
              kind: batch.source.kind,
              metadata: batch.source.metadata ?? {},
            },
            setWhere: sql`${sources.label} is distinct from excluded.label
              or ${sources.kind} is distinct from excluded.kind
              or ${sources.metadata} is distinct from excluded.metadata`,
          });
        if ((batch.entities?.length ?? 0) > 0) {
          await tx
            .insert(entities)
            .values(
              (batch.entities ?? []).map((entity) => ({
                entityKey: entity.key,
                entityType: entity.type,
                name: entity.name,
                teamKey: entity.teamKey,
                metadata: entity.metadata ?? {},
              })),
            )
            .onConflictDoUpdate({
              target: entities.entityKey,
              set: {
                entityType: sql`excluded.entity_type`,
                name: sql`excluded.name`,
                teamKey: sql`excluded.team_key`,
                metadata: sql`excluded.metadata`,
              },
              setWhere: sql`${entities.entityType} is distinct from excluded.entity_type
                or ${entities.name} is distinct from excluded.name
                or ${entities.teamKey} is distinct from excluded.team_key
                or ${entities.metadata} is distinct from excluded.metadata`,
            });
        }
        const aliases = batch.entityAliases ?? [];
        const activeAliases =
          aliases.length === 0
            ? []
            : await tx
                .select()
                .from(sourceEntityAliases)
                .where(
                  and(
                    eq(sourceEntityAliases.sourceKey, batch.source.key),
                    isNull(sourceEntityAliases.effectiveTo),
                  ),
                );
        const aliasKey = (sourceEntityKey: string, aliasSeasonKey: string | null | undefined) =>
          `${sourceEntityKey}\u0000${aliasSeasonKey ?? ""}`;
        const activeByKey = new Map(
          activeAliases.map((alias) => [aliasKey(alias.sourceEntityKey, alias.seasonKey), alias]),
        );
        const changedAliases = aliases.filter((alias) => {
          const active = activeByKey.get(aliasKey(alias.sourceEntityKey, alias.seasonKey));
          return (
            !active ||
            active.entityKey !== alias.entityKey ||
            active.matchMethod !== alias.matchMethod ||
            active.confidence !== alias.confidence ||
            canonicalJson(active.metadata) !== canonicalJson(alias.metadata ?? {})
          );
        });
        for (const alias of changedAliases) {
          const active = activeByKey.get(aliasKey(alias.sourceEntityKey, alias.seasonKey));
          if (active) {
            await tx
              .update(sourceEntityAliases)
              .set({ effectiveTo: alias.effectiveFrom })
              .where(
                and(
                  eq(sourceEntityAliases.sourceKey, active.sourceKey),
                  eq(sourceEntityAliases.sourceEntityKey, active.sourceEntityKey),
                  eq(sourceEntityAliases.effectiveFrom, active.effectiveFrom),
                ),
              );
          }
        }
        if (changedAliases.length > 0) {
          await tx.insert(sourceEntityAliases).values(
            changedAliases.map((alias) => ({
              sourceKey: alias.sourceKey,
              sourceEntityKey: alias.sourceEntityKey,
              entityKey: alias.entityKey,
              matchMethod: alias.matchMethod,
              confidence: alias.confidence,
              effectiveFrom: alias.effectiveFrom,
              effectiveTo: alias.effectiveTo,
              seasonKey: alias.seasonKey,
              metadata: alias.metadata ?? {},
            })),
          );
        }
      });
    },
    async updateSeasonState(input) {
      const [current] = await db
        .select({ lifecycle: seasons.lifecycle, priceState: seasons.priceState })
        .from(seasons)
        .where(eq(seasons.seasonKey, input.seasonKey))
        .limit(1);
      if (!current) throw new Error(`Unknown season ${input.seasonKey}`);
      const updates = {
        ...(input.lifecycle
          ? {
              lifecycle: laterSeasonLifecycle(
                current.lifecycle as ParsedSeasonManifest["lifecycle"],
                input.lifecycle,
              ),
            }
          : {}),
        ...(input.priceState
          ? {
              priceState: laterPriceState(
                current.priceState as ParsedSeasonManifest["priceState"],
                input.priceState,
              ),
            }
          : {}),
        updatedAt: new Date().toISOString(),
      };
      const changed = await db
        .update(seasons)
        .set(updates)
        .where(eq(seasons.seasonKey, input.seasonKey))
        .returning({ key: seasons.seasonKey });
      if (changed.length === 0) throw new Error(`Unknown season ${input.seasonKey}`);
    },
    async close() {
      await close();
    },
  };
}
