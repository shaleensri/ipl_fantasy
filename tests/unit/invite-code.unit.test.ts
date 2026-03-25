import { describe, it, expect } from "vitest";
import { normalizeInviteCode, randomInviteCodeSegment } from "@/lib/invite-code";

describe("invite-code (unit)", () => {
  it("randomInviteCodeSegment has fixed length and allowed charset", () => {
    const s = randomInviteCodeSegment(10);
    expect(s).toHaveLength(10);
    expect(s).toMatch(/^[A-Z2-9]+$/);
    expect(s).not.toMatch(/[IO01]/);
  });

  it("normalizeInviteCode trims and uppercases", () => {
    expect(normalizeInviteCode("  ab cd  ")).toBe("ABCD");
  });
});
