import { describe, it, expect } from "vitest";
import { roundNumberForPick, teamIndexForSnakePick } from "@/server/draft/snake";

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
});
