import { Pool } from "@neondatabase/serverless";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import type { JsonValue } from "../contracts.ts";
import { canonicalJson, sha256Hex } from "../hot-cold/artifact-store.ts";
import type {
  PublicationCommit,
  PublicationRepository,
  PublicationStage,
} from "../hot-cold/publication.ts";
import { forecastPublications, servingArtifactCurrent } from "./schema.ts";
import * as schema from "./schema.ts";

export type NeonPublicationRepository = PublicationRepository & {
  close(): Promise<void>;
};

function jsonRecord(value: unknown): Record<string, JsonValue> {
  return JSON.parse(JSON.stringify(value)) as Record<string, JsonValue>;
}

export function createNeonPublicationRepository(
  connectionString: string | Pool,
): NeonPublicationRepository {
  if (!connectionString) throw new Error("DATABASE_URL is required for publication persistence");
  const owned = typeof connectionString === "string";
  const pool = owned ? new Pool({ connectionString }) : connectionString;
  const db = drizzle({ client: pool, schema });

  return {
    async stage(publication: PublicationStage) {
      await db
        .insert(forecastPublications)
        .values({
          publicationId: publication.publicationId,
          runId: publication.runId,
          datasetKey: publication.datasetKey,
          seasonKey: publication.seasonKey,
          fromGameweek: publication.fromGameweek,
          throughGameweek: publication.throughGameweek,
          cutoffAt: publication.cutoffAt,
          modelKey: publication.modelKey,
          modelVersion: publication.modelVersion,
          codeVersion: publication.codeVersion,
          rulesetKey: publication.rulesetKey,
          modelInputHash: publication.modelInputHash,
          servingStateHash: publication.servingStateHash,
          inputManifest: { heads: publication.inputManifest },
          privateArtifact: jsonRecord(publication.privateArtifact),
          publicArtifact: jsonRecord(publication.publicArtifact),
          ...(publication.replayArtifact
            ? { replayArtifact: jsonRecord(publication.replayArtifact) }
            : {}),
          status: "staged",
          expiresAt: publication.expiresAt,
          createdAt: publication.stagedAt,
          updatedAt: publication.stagedAt,
        })
        .onConflictDoUpdate({
          target: forecastPublications.publicationId,
          set: {
            updatedAt: publication.stagedAt,
            error: null,
          },
          setWhere: sql`${forecastPublications.runId} = ${publication.runId}
            and ${forecastPublications.publicArtifact}->>'key' = ${publication.publicArtifact.key}`,
        });
      const [stored] = await db
        .select({
          runId: forecastPublications.runId,
          publicArtifact: forecastPublications.publicArtifact,
        })
        .from(forecastPublications)
        .where(eq(forecastPublications.publicationId, publication.publicationId))
        .limit(1);
      if (
        stored?.runId !== publication.runId ||
        stored.publicArtifact.key !== publication.publicArtifact.key
      ) {
        throw new Error(
          `Publication ${publication.publicationId} was staged with different content`,
        );
      }
    },

    async commit(commit: PublicationCommit) {
      const [publication] = await db
        .select()
        .from(forecastPublications)
        .where(eq(forecastPublications.publicationId, commit.publicationId))
        .limit(1);
      const current = commit.current;
      const sourceHealthHash = await sha256Hex(canonicalJson(current.sourceHealth));
      if (!publication) {
        const [serving] = await db
          .select()
          .from(servingArtifactCurrent)
          .where(eq(servingArtifactCurrent.publicationId, commit.publicationId))
          .limit(1);
        if (!serving) throw new Error(`Publication ${commit.publicationId} was not staged`);
        await db
          .update(servingArtifactCurrent)
          .set({
            observedAt: current.observedAt,
            manifestEtag: commit.manifestEtag,
            sourceHealthHash,
            updatedAt: commit.committedAt,
          })
          .where(eq(servingArtifactCurrent.publicationId, commit.publicationId));
        return;
      }
      await db.transaction(async (tx) => {
        await tx
          .insert(servingArtifactCurrent)
          .values({
            datasetKey: publication.datasetKey,
            seasonKey: publication.seasonKey,
            publicationId: publication.publicationId,
            runId: publication.runId,
            fromGameweek: publication.fromGameweek,
            observedAt: current.observedAt,
            publicObjectKey: current.artifact.key,
            publicObjectHash: current.artifact.objectSha256,
            publicObjectBytes: current.artifact.compressedBytes,
            ...(current.replay
              ? {
                  replayObjectKey: current.replay.key,
                  replayObjectHash: current.replay.objectSha256,
                }
              : {}),
            manifestEtag: commit.manifestEtag,
            schemaVersion: current.schemaVersion,
            sourceHealthHash,
            updatedAt: commit.committedAt,
          })
          .onConflictDoUpdate({
            target: [servingArtifactCurrent.datasetKey, servingArtifactCurrent.seasonKey],
            set: {
              publicationId: publication.publicationId,
              runId: publication.runId,
              fromGameweek: publication.fromGameweek,
              observedAt: current.observedAt,
              publicObjectKey: current.artifact.key,
              publicObjectHash: current.artifact.objectSha256,
              publicObjectBytes: current.artifact.compressedBytes,
              replayObjectKey: current.replay?.key ?? null,
              replayObjectHash: current.replay?.objectSha256 ?? null,
              manifestEtag: commit.manifestEtag,
              schemaVersion: current.schemaVersion,
              sourceHealthHash,
              updatedAt: commit.committedAt,
            },
          });
        await tx
          .update(forecastPublications)
          .set({
            status: "committed",
            error: null,
            expiresAt: new Date(Date.parse(commit.committedAt) + 14 * 86_400_000).toISOString(),
            updatedAt: commit.committedAt,
          })
          .where(eq(forecastPublications.publicationId, commit.publicationId));
      });
    },

    async close() {
      if (owned) await pool.end();
    },
  };
}
