import { describe, it, expect } from "vitest";
import type { Session } from "next-auth";
import {
  canManageLeagueAsCommissioner,
  canRunSensitiveCommissionerActions,
  isAdminUser,
  isLeagueCommissioner,
} from "@/lib/permissions";

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
  const league = { commissionerId: "comm-1" };

  it("isAdminUser is false for null and PLAYER", () => {
    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser(session({ role: "PLAYER" }))).toBe(false);
  });

  it("isAdminUser is true for ADMIN", () => {
    expect(isAdminUser(session({ role: "ADMIN" }))).toBe(true);
  });

  it("isLeagueCommissioner matches commissioner id only", () => {
    expect(isLeagueCommissioner(null, league)).toBe(false);
    expect(isLeagueCommissioner(session({ id: "other" }), league)).toBe(false);
    expect(
      isLeagueCommissioner(session({ id: "comm-1", role: "PLAYER" }), league),
    ).toBe(true);
  });

  it("canManageLeagueAsCommissioner follows league commissioner (any role)", () => {
    expect(
      canManageLeagueAsCommissioner(session({ id: "comm-1", role: "PLAYER" }), league),
    ).toBe(true);
    expect(
      canManageLeagueAsCommissioner(session({ id: "other", role: "ADMIN" }), league),
    ).toBe(false);
  });

  it("canRunSensitiveCommissionerActions requires ADMIN and commissioner", () => {
    expect(
      canRunSensitiveCommissionerActions(
        session({ id: "comm-1", role: "PLAYER" }),
        league,
      ),
    ).toBe(false);
    expect(
      canRunSensitiveCommissionerActions(
        session({ id: "other", role: "ADMIN" }),
        league,
      ),
    ).toBe(false);
    expect(
      canRunSensitiveCommissionerActions(
        session({ id: "comm-1", role: "ADMIN" }),
        league,
      ),
    ).toBe(true);
  });
});
