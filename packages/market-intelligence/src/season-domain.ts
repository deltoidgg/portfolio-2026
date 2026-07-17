import { z } from "zod";
import { resolvePremierLeagueTeam } from "./entity-resolution.ts";

const isoDateTime = z.iso.datetime({ offset: true });

export const seasonLifecycleSchema = z.enum([
  "planned",
  "prelaunch",
  "active",
  "complete",
  "archived",
]);

export const pricePublicationStateSchema = z.enum(["unpublished", "partial", "official"]);

export const seasonTeamSchema = z.object({
  key: z.string().min(1),
  clubKey: z.string().min(1),
  name: z.string().min(1),
  shortName: z.string().min(1),
});

export const seasonFixtureSchema = z.object({
  key: z.string().min(1),
  homeTeamKey: z.string().min(1),
  awayTeamKey: z.string().min(1),
  kickoffAt: isoDateTime,
  gameweek: z.number().int().positive(),
  deadlineAt: isoDateTime,
});

export const seasonManifestSchema = z.object({
  key: z.string().min(1),
  competition: z.string().min(1),
  label: z.string().min(1),
  startsAt: isoDateTime,
  endsAt: isoDateTime,
  lifecycle: seasonLifecycleSchema,
  rulesetKey: z.string().min(1),
  priceState: pricePublicationStateSchema.default("unpublished"),
  teams: z.array(seasonTeamSchema),
  fixtures: z.array(seasonFixtureSchema),
});

export const playerRegistrationInputSchema = z.object({
  seasonKey: z.string().min(1),
  fplElementId: z.number().int().positive(),
  playerName: z.string().min(1),
  teamKey: z.string().min(1),
  position: z.enum(["GKP", "DEF", "MID", "FWD"]),
  optaCode: z.string().min(1).optional(),
  fplCode: z.number().int().positive().optional(),
  status: z.enum(["provisional", "active", "departed", "unresolved"]).default("active"),
  confidence: z.number().min(0).max(1).default(1),
});

export type SeasonLifecycle = z.infer<typeof seasonLifecycleSchema>;
export type PricePublicationState = z.infer<typeof pricePublicationStateSchema>;
export type SeasonTeam = z.infer<typeof seasonTeamSchema>;
export type SeasonFixture = z.infer<typeof seasonFixtureSchema>;
export type SeasonManifest = z.input<typeof seasonManifestSchema>;
export type ParsedSeasonManifest = z.output<typeof seasonManifestSchema>;
export type PlayerRegistrationInput = z.input<typeof playerRegistrationInputSchema>;

export type PlayerRegistration = z.output<typeof playerRegistrationInputSchema> & {
  key: string;
  playerKey: string;
  teamSeasonKey: string;
};

export type FixtureLink = {
  sourceKey: string;
  seasonKey: string;
  sourceEventId: string;
  fixtureKey?: string;
  status: "matched" | "unmatched" | "ambiguous" | "rejected";
  matchMethod?: "provider-id" | "team-kickoff";
  confidence: number;
  candidateFixtureKeys: string[];
  observedAt: string;
};

const lifecycleOrder: SeasonLifecycle[] = [
  "planned",
  "prelaunch",
  "active",
  "complete",
  "archived",
];
const priceStateOrder: PricePublicationState[] = ["unpublished", "partial", "official"];

export function laterSeasonLifecycle(
  left: SeasonLifecycle,
  right: SeasonLifecycle,
): SeasonLifecycle {
  return lifecycleOrder.indexOf(left) >= lifecycleOrder.indexOf(right) ? left : right;
}

export function laterPriceState(
  left: PricePublicationState,
  right: PricePublicationState,
): PricePublicationState {
  return priceStateOrder.indexOf(left) >= priceStateOrder.indexOf(right) ? left : right;
}

export interface SeasonCatalog {
  importManifest(manifest: SeasonManifest): Promise<void>;
  season(key: string): Promise<ParsedSeasonManifest | null>;
  fixturesForSeason(key: string): Promise<SeasonFixture[]>;
  teamByAlias(seasonKey: string, alias: string): Promise<SeasonTeam | null>;
  registerPlayer(input: PlayerRegistrationInput): Promise<PlayerRegistration>;
  registrationsForPlayer(playerKey: string): Promise<PlayerRegistration[]>;
  fixtureLink(
    sourceKey: string,
    seasonKey: string,
    sourceEventId: string,
  ): Promise<FixtureLink | null>;
  saveFixtureLink(link: FixtureLink): Promise<void>;
  updateSeasonState(input: {
    seasonKey: string;
    lifecycle?: SeasonLifecycle;
    priceState?: PricePublicationState;
  }): Promise<void>;
}

function normalizedAlias(value: string): string {
  return value
    .normalize("NFKD")
    .replaceAll(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

function durablePlayerKey(input: z.output<typeof playerRegistrationInputSchema>): string {
  if (input.optaCode) return `epl:person:opta:${input.optaCode.toLocaleLowerCase()}`;
  if (input.fplCode) return `epl:person:fpl-code:${input.fplCode}`;
  return `${input.seasonKey}:person:provisional:fpl-${input.fplElementId}`;
}

export function createMemorySeasonCatalog(): SeasonCatalog {
  const seasons = new Map<string, ParsedSeasonManifest>();
  const registrations = new Map<string, PlayerRegistration>();
  const links = new Map<string, FixtureLink>();

  return {
    async importManifest(input) {
      const manifest = seasonManifestSchema.parse(input);
      const current = seasons.get(manifest.key);
      seasons.set(
        manifest.key,
        structuredClone({
          ...manifest,
          ...(current
            ? {
                lifecycle: laterSeasonLifecycle(current.lifecycle, manifest.lifecycle),
                priceState: laterPriceState(current.priceState, manifest.priceState),
              }
            : {}),
        }),
      );
    },

    async season(key) {
      const manifest = seasons.get(key);
      return manifest ? structuredClone(manifest) : null;
    },

    async fixturesForSeason(key) {
      return structuredClone(seasons.get(key)?.fixtures ?? []);
    },

    async teamByAlias(seasonKey, alias) {
      const teams = seasons.get(seasonKey)?.teams ?? [];
      let canonical: string | undefined;
      try {
        canonical = resolvePremierLeagueTeam(alias);
      } catch {
        canonical = undefined;
      }
      const normalized = normalizedAlias(alias);
      return (
        teams.find(
          (team) =>
            team.clubKey === canonical ||
            normalizedAlias(team.name) === normalized ||
            normalizedAlias(team.shortName) === normalized ||
            normalizedAlias(team.clubKey) === normalized,
        ) ?? null
      );
    },

    async registerPlayer(untrustedInput) {
      const input = playerRegistrationInputSchema.parse(untrustedInput);
      const key = `${input.seasonKey}:registration:fpl-${input.fplElementId}`;
      const playerKey = durablePlayerKey(input);
      const manifest = seasons.get(input.seasonKey);
      const resolvedTeam = manifest?.teams.find(
        (team) => team.clubKey === input.teamKey || team.shortName === input.teamKey,
      );
      const registration: PlayerRegistration = {
        ...input,
        key,
        playerKey,
        teamSeasonKey:
          resolvedTeam?.key ?? `${input.seasonKey}:team:${input.teamKey.toLowerCase()}`,
      };
      registrations.set(key, registration);
      return structuredClone(registration);
    },

    async registrationsForPlayer(playerKey) {
      return [...registrations.values()]
        .filter((registration) => registration.playerKey === playerKey)
        .toSorted((a, b) => a.seasonKey.localeCompare(b.seasonKey))
        .map((registration) => structuredClone(registration));
    },

    async fixtureLink(sourceKey, seasonKey, sourceEventId) {
      const link = links.get(`${sourceKey}:${seasonKey}:${sourceEventId}`);
      return link ? structuredClone(link) : null;
    },

    async saveFixtureLink(link) {
      links.set(`${link.sourceKey}:${link.seasonKey}:${link.sourceEventId}`, structuredClone(link));
    },

    async updateSeasonState(input) {
      const manifest = seasons.get(input.seasonKey);
      if (!manifest) throw new Error(`Unknown season ${input.seasonKey}`);
      seasons.set(input.seasonKey, {
        ...manifest,
        lifecycle: input.lifecycle
          ? laterSeasonLifecycle(manifest.lifecycle, input.lifecycle)
          : manifest.lifecycle,
        priceState: input.priceState
          ? laterPriceState(manifest.priceState, input.priceState)
          : manifest.priceState,
      });
    },
  };
}

export type ProviderFixtureEvent = {
  sourceKey: string;
  sourceEventId: string;
  seasonKey: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
};

export type MatchedFixtureEvent = ProviderFixtureEvent & {
  fixtureKey: string;
  gameweek: number;
  deadlineAt: string;
  matchMethod: "provider-id" | "team-kickoff";
};

export type QuarantinedFixtureEvent = ProviderFixtureEvent & {
  status: FixtureLink["status"];
  candidateFixtureKeys: string[];
};

export interface FixtureReconciler {
  reconcile(events: ProviderFixtureEvent[]): Promise<{
    matched: MatchedFixtureEvent[];
    quarantined: QuarantinedFixtureEvent[];
  }>;
}

const KICKOFF_TOLERANCE_MS = 36 * 60 * 60 * 1000;

export function createFixtureReconciler(catalog: SeasonCatalog): FixtureReconciler {
  return {
    async reconcile(events) {
      const matched: MatchedFixtureEvent[] = [];
      const quarantined: QuarantinedFixtureEvent[] = [];

      for (const event of events) {
        const observedAt = new Date().toISOString();
        const existing = await catalog.fixtureLink(
          event.sourceKey,
          event.seasonKey,
          event.sourceEventId,
        );
        const fixtures = await catalog.fixturesForSeason(event.seasonKey);
        const existingFixture = existing?.fixtureKey
          ? fixtures.find((fixture) => fixture.key === existing.fixtureKey)
          : undefined;
        if (existing?.status === "matched" && existingFixture) {
          matched.push({
            ...event,
            fixtureKey: existingFixture.key,
            gameweek: existingFixture.gameweek,
            deadlineAt: existingFixture.deadlineAt,
            matchMethod: "provider-id",
          });
          continue;
        }

        const [homeTeam, awayTeam] = await Promise.all([
          catalog.teamByAlias(event.seasonKey, event.homeTeam),
          catalog.teamByAlias(event.seasonKey, event.awayTeam),
        ]);
        if (!homeTeam || !awayTeam) {
          const rejected: FixtureLink = {
            sourceKey: event.sourceKey,
            seasonKey: event.seasonKey,
            sourceEventId: event.sourceEventId,
            status: "rejected",
            confidence: 0,
            candidateFixtureKeys: [],
            observedAt,
          };
          await catalog.saveFixtureLink(rejected);
          quarantined.push({ ...event, status: rejected.status, candidateFixtureKeys: [] });
          continue;
        }

        const candidates = fixtures.filter(
          (fixture) =>
            fixture.homeTeamKey === homeTeam.key &&
            fixture.awayTeamKey === awayTeam.key &&
            Math.abs(Date.parse(fixture.kickoffAt) - Date.parse(event.kickoffAt)) <=
              KICKOFF_TOLERANCE_MS,
        );
        if (candidates.length !== 1) {
          const status = candidates.length === 0 ? "unmatched" : "ambiguous";
          const link: FixtureLink = {
            sourceKey: event.sourceKey,
            seasonKey: event.seasonKey,
            sourceEventId: event.sourceEventId,
            status,
            confidence: 0,
            candidateFixtureKeys: candidates.map((fixture) => fixture.key),
            observedAt,
          };
          await catalog.saveFixtureLink(link);
          quarantined.push({
            ...event,
            status,
            candidateFixtureKeys: link.candidateFixtureKeys,
          });
          continue;
        }

        const fixture = candidates[0]!;
        const link: FixtureLink = {
          sourceKey: event.sourceKey,
          seasonKey: event.seasonKey,
          sourceEventId: event.sourceEventId,
          fixtureKey: fixture.key,
          status: "matched",
          matchMethod: "team-kickoff",
          confidence: 1,
          candidateFixtureKeys: [fixture.key],
          observedAt,
        };
        await catalog.saveFixtureLink(link);
        matched.push({
          ...event,
          fixtureKey: fixture.key,
          gameweek: fixture.gameweek,
          deadlineAt: fixture.deadlineAt,
          matchMethod: "team-kickoff",
        });
      }

      return { matched, quarantined };
    },
  };
}
