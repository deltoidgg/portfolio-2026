import { z } from "zod";
import type { OpportunityMap, OpportunityPlayer, SeasonRulesSnapshot } from "./opportunity-map.ts";

export const squadPickSchema = z.object({
  registrationKey: z.string().min(1),
  role: z.enum(["starter", "bench"]),
  captain: z.boolean().default(false),
  benchOrder: z.number().int().min(1).max(4).optional(),
  purchasePrice: z.number().positive().optional(),
  sellingPrice: z.number().positive().optional(),
});

export const squadStateSchema = z.object({
  seasonKey: z.string().min(1),
  horizon: z.union([z.literal(1), z.literal(3), z.literal(5)]),
  budget: z.number().positive().default(100),
  freeTransfers: z.number().int().min(0).max(5).default(0),
  picks: z.array(squadPickSchema).max(15),
});

export type SquadPick = z.output<typeof squadPickSchema>;
export type SquadState = z.output<typeof squadStateSchema>;

export type SquadValidation = {
  valid: boolean;
  spent: number;
  bank: number;
  errors: string[];
  warnings: string[];
  positionCounts: Record<OpportunityPlayer["position"], number>;
  starterCounts: Record<OpportunityPlayer["position"], number>;
  clubCounts: Record<string, number>;
};

const positions = ["GKP", "DEF", "MID", "FWD"] as const;

export type SquadRules = Pick<
  SeasonRulesSnapshot,
  "budget" | "squadSize" | "startingSize" | "clubLimit" | "positionRules"
>;

export const defaultSquadRules: SquadRules = {
  budget: 100,
  squadSize: 15,
  startingSize: 11,
  clubLimit: 3,
  positionRules: {
    GKP: { squad: 2, minStart: 1, maxStart: 1 },
    DEF: { squad: 5, minStart: 3, maxStart: 5 },
    MID: { squad: 5, minStart: 2, maxStart: 5 },
    FWD: { squad: 3, minStart: 1, maxStart: 3 },
  },
};

export function squadRulesFromSeason(snapshot?: SeasonRulesSnapshot): SquadRules {
  return snapshot ?? defaultSquadRules;
}

function officialPrice(player: OpportunityPlayer): number | undefined {
  return player.price.status === "official" ? player.price.value : undefined;
}

function emptyPositionCounts(): Record<OpportunityPlayer["position"], number> {
  return { GKP: 0, DEF: 0, MID: 0, FWD: 0 };
}

function roundMoney(value: number): number {
  return Number(value.toFixed(1));
}

export function createEmptySquad(
  seasonKey: string,
  horizon: 1 | 3 | 5 = 3,
  budget = defaultSquadRules.budget,
): SquadState {
  return {
    seasonKey,
    horizon,
    budget,
    freeTransfers: 0,
    picks: [],
  };
}

export function validateSquad(
  state: SquadState,
  players: OpportunityMap["players"],
  rules: SquadRules = defaultSquadRules,
): SquadValidation {
  const parsed = squadStateSchema.parse(state);
  const playerByKey = new Map(players.map((player) => [player.registrationKey, player]));
  const errors: string[] = [];
  const warnings: string[] = [];
  const positionCounts = emptyPositionCounts();
  const starterCounts = emptyPositionCounts();
  const clubCounts: Record<string, number> = {};
  const seen = new Set<string>();
  let spent = 0;
  let starters = 0;
  let captains = 0;

  for (const pick of parsed.picks) {
    if (seen.has(pick.registrationKey)) {
      errors.push("A player cannot occupy more than one squad slot.");
      continue;
    }
    seen.add(pick.registrationKey);
    const player = playerByKey.get(pick.registrationKey);
    if (!player) {
      errors.push(`Player ${pick.registrationKey} is not available in this season snapshot.`);
      continue;
    }
    const price = pick.sellingPrice ?? officialPrice(player);
    if (price === undefined) {
      errors.push(`${player.name} does not have an official price.`);
    } else {
      spent += price;
    }
    positionCounts[player.position] += 1;
    clubCounts[player.team] = (clubCounts[player.team] ?? 0) + 1;
    if (pick.role === "starter") {
      starters += 1;
      starterCounts[player.position] += 1;
    }
    if (pick.captain) {
      captains += 1;
      if (pick.role !== "starter") errors.push("The captain must be in the starting XI.");
    }
  }

  if (parsed.budget !== rules.budget) {
    errors.push(`Squad budget must match the official £${rules.budget.toFixed(1)}m limit.`);
  }
  if (parsed.picks.length !== rules.squadSize) {
    errors.push(
      `Select ${rules.squadSize - parsed.picks.length} more player${rules.squadSize - parsed.picks.length === 1 ? "" : "s"}.`,
    );
  }
  for (const position of positions) {
    if (positionCounts[position] !== rules.positionRules[position].squad) {
      errors.push(`Squad needs ${rules.positionRules[position].squad} ${position}.`);
    }
  }
  for (const [team, count] of Object.entries(clubCounts)) {
    if (count > rules.clubLimit) {
      errors.push(`${team} has ${count} players; the club limit is ${rules.clubLimit}.`);
    }
  }
  if (spent > parsed.budget + 0.001) {
    errors.push(`Squad is £${roundMoney(spent - parsed.budget).toFixed(1)}m over budget.`);
  }
  if (starters !== rules.startingSize) {
    errors.push(`Starting XI currently contains ${starters} players.`);
  }
  for (const position of positions) {
    const positionRule = rules.positionRules[position];
    if (
      starterCounts[position] < positionRule.minStart ||
      starterCounts[position] > positionRule.maxStart
    ) {
      errors.push(
        `Starting XI needs ${positionRule.minStart}–${positionRule.maxStart} ${position}.`,
      );
    }
  }
  if (captains !== 1) errors.push("Choose exactly one captain from the starting XI.");

  const benchOrders = parsed.picks
    .filter((pick) => pick.role === "bench")
    .map((pick) => pick.benchOrder)
    .filter((order): order is number => order !== undefined);
  if (new Set(benchOrders).size !== benchOrders.length) {
    errors.push("Bench positions must be unique.");
  }
  if (parsed.picks.length < rules.squadSize) {
    warnings.push("Partial squads are saved locally while you build.");
  }

  return {
    valid: errors.length === 0,
    spent: roundMoney(spent),
    bank: roundMoney(parsed.budget - spent),
    errors: [...new Set(errors)],
    warnings,
    positionCounts,
    starterCounts,
    clubCounts,
  };
}

type PricedPlayer = OpportunityMap["players"][number] & { officialPrice: number };

function pricedPlayers(players: OpportunityMap["players"]): PricedPlayer[] {
  return players.flatMap((player) => {
    const price = officialPrice(player);
    return price === undefined ? [] : [{ ...player, officialPrice: price }];
  });
}

function squadClubCounts(players: PricedPlayer[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const player of players) counts.set(player.team, (counts.get(player.team) ?? 0) + 1);
  return counts;
}

export function buildSuggestedSquad(
  allPlayers: OpportunityMap["players"],
  seasonKey: string,
  horizon: 1 | 3 | 5,
  rules: SquadRules = defaultSquadRules,
): SquadState {
  const available = pricedPlayers(allPlayers);
  const selected: PricedPlayer[] = [];
  const clubCounts = new Map<string, number>();

  for (const position of positions) {
    const candidates = available
      .filter((player) => player.position === position)
      .toSorted(
        (left, right) =>
          left.officialPrice - right.officialPrice || right.expectedPoints - left.expectedPoints,
      );
    for (const candidate of candidates) {
      if (
        selected.filter((player) => player.position === position).length >=
        rules.positionRules[position].squad
      )
        break;
      if ((clubCounts.get(candidate.team) ?? 0) >= rules.clubLimit) continue;
      selected.push(candidate);
      clubCounts.set(candidate.team, (clubCounts.get(candidate.team) ?? 0) + 1);
    }
  }

  if (selected.length !== rules.squadSize) {
    return createEmptySquad(seasonKey, horizon, rules.budget);
  }

  let spent = selected.reduce((total, player) => total + player.officialPrice, 0);
  for (;;) {
    const selectedKeys = new Set(selected.map((player) => player.registrationKey));
    const currentClubCounts = squadClubCounts(selected);
    let best:
      | {
          index: number;
          replacement: PricedPlayer;
          pointGain: number;
          priceGain: number;
          efficiency: number;
        }
      | undefined;

    selected.forEach((current, index) => {
      for (const replacement of available) {
        if (
          replacement.position !== current.position ||
          selectedKeys.has(replacement.registrationKey)
        )
          continue;
        const priceGain = replacement.officialPrice - current.officialPrice;
        const pointGain = replacement.expectedPoints - current.expectedPoints;
        if (pointGain <= 0 || spent + priceGain > rules.budget + 0.001) continue;
        const resultingClubCount =
          (currentClubCounts.get(replacement.team) ?? 0) +
          (replacement.team === current.team ? 0 : 1);
        if (resultingClubCount > rules.clubLimit) continue;
        const efficiency = priceGain <= 0 ? pointGain * 100 : pointGain / priceGain;
        if (
          !best ||
          efficiency > best.efficiency ||
          (efficiency === best.efficiency && pointGain > best.pointGain)
        ) {
          best = { index, replacement, pointGain, priceGain, efficiency };
        }
      }
    });
    if (!best) break;
    spent += best.priceGain;
    selected[best.index] = best.replacement;
  }

  const starterKeys = new Set<string>();
  for (const position of positions) {
    selected
      .filter((player) => player.position === position)
      .toSorted((left, right) => right.expectedPoints - left.expectedPoints)
      .slice(0, rules.positionRules[position].minStart)
      .forEach((player) => starterKeys.add(player.registrationKey));
  }
  selected
    .filter((player) => player.position !== "GKP" && !starterKeys.has(player.registrationKey))
    .toSorted((left, right) => right.expectedPoints - left.expectedPoints)
    .slice(0, rules.startingSize - starterKeys.size)
    .forEach((player) => starterKeys.add(player.registrationKey));

  const captainKey = selected
    .filter((player) => starterKeys.has(player.registrationKey))
    .toSorted((left, right) => right.expectedPoints - left.expectedPoints)[0]?.registrationKey;
  let benchOrder = 0;
  return {
    seasonKey,
    horizon,
    budget: rules.budget,
    freeTransfers: 0,
    picks: selected.map((player) => {
      const starter = starterKeys.has(player.registrationKey);
      if (!starter) benchOrder += 1;
      return {
        registrationKey: player.registrationKey,
        role: starter ? ("starter" as const) : ("bench" as const),
        captain: player.registrationKey === captainKey,
        ...(starter ? {} : { benchOrder }),
      };
    }),
  };
}
