/**
 * Snake draft: round 0 is 1→N, round 1 is N→1, etc.
 * `pickIndex` is 0-based (first pick of draft = 0).
 * `orderedTeamIds` must match draft slot order (draftPosition 1..N).
 */
export function teamIndexForSnakePick(
  pickIndex: number,
  teamCount: number,
): number {
  if (teamCount < 1) throw new Error("teamCount must be >= 1");
  const round = Math.floor(pickIndex / teamCount);
  const posInRound = pickIndex % teamCount;
  return round % 2 === 0 ? posInRound : teamCount - 1 - posInRound;
}

export function roundNumberForPick(pickIndex: number, teamCount: number): number {
  return Math.floor(pickIndex / teamCount) + 1;
}

/**
 * How many picks from now (including the current pick if it is yours) until `mySlotIndex`
 * is on the clock. Returns 0 if it is already this slot's turn. `mySlotIndex` is 0-based
 * in draft order (same order as `teamIndexForSnakePick`).
 */
export function picksUntilSlotOnClock(
  currentPickIndex: number,
  mySlotIndex: number,
  teamCount: number,
  totalPicks: number,
): number {
  if (teamCount < 1 || mySlotIndex < 0 || mySlotIndex >= teamCount) return 0;
  if (currentPickIndex >= totalPicks) return 0;
  for (let k = currentPickIndex; k < totalPicks; k++) {
    if (teamIndexForSnakePick(k, teamCount) === mySlotIndex) {
      return k - currentPickIndex;
    }
  }
  return 0;
}
