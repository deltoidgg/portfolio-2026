export type CollectionCalendar = {
  schemaVersion: "collection-calendar/v1";
  seasonKey: string;
  startsAt: string;
  endsAt: string;
  gameweeks: Array<{
    gameweek: number;
    deadlineAt: string;
    lastKickoffAt: string;
  }>;
};

export type GateDecision = {
  run: boolean;
  nominalSlot: string;
  dueSources: string[];
  finalisationDue: boolean;
  retentionDue: boolean;
  verificationDue: boolean;
  calendarHealth: string;
  reason: string;
};

export function validateCalendar(value: unknown): CollectionCalendar | null;
export function finalisationAt(lastKickoffAt: string): string;
export function decideGate(input: {
  calendar: CollectionCalendar | null;
  now: string;
  enabled: boolean;
  mode?: "auto" | "force-collect" | "finalise" | "retention" | "verify";
  calendarHealth?: string;
}): GateDecision;
