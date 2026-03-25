/**
 * Need-aware best player available (NBA-P) — deterministic autopick (Phase 3).
 * Wire to Prisma + roster rules; this module documents the contract only.
 */
export type AutopickPlayerView = {
  id: string;
  name: string;
  roles: readonly string[];
  consensusRank: number | null;
};

export type AutopickResult =
  | { playerId: string; reason: string }
  | { playerId: null; reason: string; warning?: string };

/** Tiebreak: lowest consensus rank, then lexicographic id (stable, server-only). */
export function compareAutopickCandidates(
  a: AutopickPlayerView,
  b: AutopickPlayerView,
): number {
  const ra = a.consensusRank ?? Number.POSITIVE_INFINITY;
  const rb = b.consensusRank ?? Number.POSITIVE_INFINITY;
  if (ra !== rb) return ra - rb;
  return a.id.localeCompare(b.id);
}
