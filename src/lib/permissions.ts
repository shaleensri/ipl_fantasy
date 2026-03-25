import type { League } from "@prisma/client";
import type { Session } from "next-auth";

/** Global ADMIN app role (can also own teams and play). */
export function isAdminUser(session: Session | null): boolean {
  return session?.user?.role === "ADMIN";
}

/** True if the signed-in user is the league commissioner (created the league). */
export function isLeagueCommissioner(
  session: Session | null,
  league: Pick<League, "commissionerId">,
): boolean {
  return !!session?.user?.id && league.commissionerId === session.user.id;
}

/**
 * Commissioner-only league actions (settings, draft control, etc.).
 * Any commissioner qualifies; use `isAdminUser` additionally if an action should be ADMIN-only.
 */
export function canManageLeagueAsCommissioner(
  session: Session | null,
  league: Pick<League, "commissionerId">,
): boolean {
  return isLeagueCommissioner(session, league);
}

/**
 * Elevated actions (e.g. commissioner points overrides) — commissioner plus ADMIN role.
 */
export function canRunSensitiveCommissionerActions(
  session: Session | null,
  league: Pick<League, "commissionerId">,
): boolean {
  return isAdminUser(session) && isLeagueCommissioner(session, league);
}
