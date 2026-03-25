import { describe, it, expect } from "vitest";
import { compareAutopickCandidates } from "@/lib/autopick";
import type { AutopickPlayerView } from "@/lib/autopick";

function p(id: string, rank: number | null): AutopickPlayerView {
  return { id, name: id, roles: [], consensusRank: rank };
}

describe("autopick compareAutopickCandidates (unit)", () => {
  it("prefers lower consensus rank", () => {
    expect(compareAutopickCandidates(p("b", 5), p("a", 10))).toBeLessThan(0);
    expect(compareAutopickCandidates(p("a", 10), p("b", 5))).toBeGreaterThan(0);
  });

  it("ties break by id lexicographically", () => {
    expect(compareAutopickCandidates(p("m", 1), p("z", 1))).toBeLessThan(0);
    expect(compareAutopickCandidates(p("z", 1), p("m", 1))).toBeGreaterThan(0);
  });

  it("treats null rank as worst", () => {
    expect(compareAutopickCandidates(p("a", 1), p("b", null))).toBeLessThan(0);
  });
});
