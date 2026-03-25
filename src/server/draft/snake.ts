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
