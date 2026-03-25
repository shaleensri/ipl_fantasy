import { describe, it, expect } from "vitest";
import {
  picksUntilSlotOnClock,
  roundNumberForPick,
  teamIndexForSnakePick,
} from "@/server/draft/snake";

describe("snake draft helpers (unit)", () => {
  it("teamIndexForSnakePick alternates direction each round (4 teams)", () => {
    const n = 4;
    // Round 1: 0,1,2,3
    expect(teamIndexForSnakePick(0, n)).toBe(0);
    expect(teamIndexForSnakePick(1, n)).toBe(1);
    expect(teamIndexForSnakePick(2, n)).toBe(2);
    expect(teamIndexForSnakePick(3, n)).toBe(3);
    // Round 2: 3,2,1,0
    expect(teamIndexForSnakePick(4, n)).toBe(3);
    expect(teamIndexForSnakePick(5, n)).toBe(2);
    expect(teamIndexForSnakePick(6, n)).toBe(1);
    expect(teamIndexForSnakePick(7, n)).toBe(0);
    // Round 3: 0,1,2,3
    expect(teamIndexForSnakePick(8, n)).toBe(0);
  });

  it("roundNumberForPick is 1-based round within snake", () => {
    expect(roundNumberForPick(0, 4)).toBe(1);
    expect(roundNumberForPick(3, 4)).toBe(1);
    expect(roundNumberForPick(4, 4)).toBe(2);
    expect(roundNumberForPick(7, 4)).toBe(2);
  });

  it("teamIndexForSnakePick rejects invalid teamCount", () => {
    expect(() => teamIndexForSnakePick(0, 0)).toThrow();
  });

  it("picksUntilSlotOnClock is 0 when that slot is on the clock", () => {
    const n = 4;
    const slot = teamIndexForSnakePick(5, n);
    expect(picksUntilSlotOnClock(5, slot, n, 100)).toBe(0);
  });

  it("picksUntilSlotOnClock counts picks until slot 0 after slot 1 (2 teams)", () => {
    const n = 2;
    expect(teamIndexForSnakePick(1, n)).toBe(1);
    // Next time slot 0 picks is pick index 3 (snake: 0→A, 1→B, 2→B, 3→A)
    expect(picksUntilSlotOnClock(1, 0, n, 100)).toBe(2);
  });
});
