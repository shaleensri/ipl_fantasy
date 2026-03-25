import type { League } from "@prisma/client";
import type { Session } from "next-auth";

/** Global ADMIN app role (can also own teams and play). */
export function isAdminUser(session: Session | null): boolean {
  return session?.user?.role === "ADMIN";
}

/**
 * Commissioner-style control for a league: must be league commissioner AND have ADMIN role.
 * Use this when gating points/lineup overrides and league settings edits.
 */
export function canManageLeagueAsCommissioner(
  session: Session | null,
  league: Pick<League, "commissionerId">,
): boolean {
  if (!session?.user?.id) return false;
  return session.user.role === "ADMIN" && league.commissionerId === session.user.id;
}
