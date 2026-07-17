import { createHash } from "node:crypto";
import { Pool } from "@neondatabase/serverless";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import type { CaptureAttempt, CaptureAttemptStore, StoredSnapshot } from "../collector.ts";
import type { JsonValue } from "../contracts.ts";
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
  fixtureGameweekAssignments,
  fixtureLinks,
  fixtures,
  playerRegistrations,
  rulesets,
  seasons,
  teamSeasons,
} from "./schema.ts";
import * as schema from "./schema.ts";

function database(connectionString: string) {
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const pool = new Pool({ connectionString });
  return { pool, db: drizzle({ client: pool, schema }) };
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

export function createNeonCaptureAttemptStore(connectionString: string): NeonCaptureAttemptStore {
  const { pool, db } = database(connectionString);
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
      await pool.end();
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

export type NeonSeasonCatalog = SeasonCatalog & { close(): Promise<void> };

export function createNeonSeasonCatalog(connectionString: string): NeonSeasonCatalog {
  const { pool, db } = database(connectionString);

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
            });
        }
        const teamByKey = new Map(manifest.teams.map((team) => [team.key, team]));
        for (const fixture of manifest.fixtures) {
          const home = teamByKey.get(fixture.homeTeamKey);
          const away = teamByKey.get(fixture.awayTeamKey);
          if (!home || !away) throw new Error(`Fixture ${fixture.key} references an unknown team`);
          await tx
            .insert(fixtures)
            .values({
              fixtureKey: fixture.key,
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
            })
            .onConflictDoUpdate({
              target: fixtures.fixtureKey,
              set: {
                gameweek: fixture.gameweek,
                kickoffAt: fixture.kickoffAt,
                deadlineAt: fixture.deadlineAt,
                metadata: {
                  seasonKey: manifest.key,
                  homeTeamSeasonKey: home.key,
                  awayTeamSeasonKey: away.key,
                },
              },
            });
          const [active] = await tx
            .select()
            .from(fixtureGameweekAssignments)
            .where(
              and(
                eq(fixtureGameweekAssignments.fixtureKey, fixture.key),
                isNull(fixtureGameweekAssignments.effectiveTo),
              ),
            )
            .limit(1);
          const unchanged =
            active &&
            active.gameweek === fixture.gameweek &&
            new Date(active.kickoffAt).toISOString() === fixture.kickoffAt &&
            new Date(active.deadlineAt).toISOString() === fixture.deadlineAt;
          if (unchanged) continue;
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
          await tx.insert(fixtureGameweekAssignments).values({
            fixtureKey: fixture.key,
            effectiveFrom: now,
            kickoffAt: fixture.kickoffAt,
            deadlineAt: fixture.deadlineAt,
            gameweek: fixture.gameweek,
          });
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
      await pool.end();
    },
  };
}
