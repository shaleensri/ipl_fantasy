import type { LeagueSettings } from "@/lib/league-settings";

export type ResolvedDraftRules = {
  rosterSize: number;
  pickTimerSeconds: number;
  autopickEnabled: boolean;
  /** Sum of `Player.listPrice` for a full roster should stay under this (mock default). */
  draftSalaryCap: number;
};

export function resolveDraftRules(settings: unknown): ResolvedDraftRules {
  const s = (settings ?? {}) as Partial<LeagueSettings>;
  return {
    rosterSize: typeof s.rosterSize === "number" && s.rosterSize >= 1 ? s.rosterSize : 15,
    pickTimerSeconds:
      typeof s.pickTimerSeconds === "number" && s.pickTimerSeconds >= 10
        ? s.pickTimerSeconds
        : 90,
    autopickEnabled: s.autopickEnabled !== false,
    draftSalaryCap:
      typeof s.draftSalaryCap === "number" && s.draftSalaryCap >= 1 ? s.draftSalaryCap : 10_000,
  };
}

/** Total snake picks = teams × roster rounds. */
export function totalPicks(teamCount: number, rosterSize: number): number {
  return teamCount * rosterSize;
}
