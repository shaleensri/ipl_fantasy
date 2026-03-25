import { describe, it, expect } from "vitest";
import type { Session } from "next-auth";
import { canManageLeagueAsCommissioner, isAdminUser } from "@/lib/permissions";

function session(partial: Partial<Session["user"]> | null): Session | null {
  if (!partial) return null;
  return {
    expires: "x",
    user: {
      id: partial.id ?? "u1",
      email: partial.email ?? "a@b.c",
      name: partial.name ?? null,
      role: partial.role ?? "PLAYER",
    },
  };
}

describe("permissions (unit)", () => {
  it("isAdminUser is false for null and PLAYER", () => {
    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser(session({ role: "PLAYER" }))).toBe(false);
  });

  it("isAdminUser is true for ADMIN", () => {
    expect(isAdminUser(session({ role: "ADMIN" }))).toBe(true);
  });

  it("canManageLeagueAsCommissioner requires ADMIN and matching commissionerId", () => {
    const league = { commissionerId: "comm-1" };
    expect(
      canManageLeagueAsCommissioner(session({ id: "comm-1", role: "PLAYER" }), league),
    ).toBe(false);
    expect(
      canManageLeagueAsCommissioner(session({ id: "other", role: "ADMIN" }), league),
    ).toBe(false);
    expect(
      canManageLeagueAsCommissioner(session({ id: "comm-1", role: "ADMIN" }), league),
    ).toBe(true);
  });
});
