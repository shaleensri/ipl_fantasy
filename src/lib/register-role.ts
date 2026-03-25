import type { UserAppRole } from "@prisma/client";

/**
 * Comma-separated emails in ADMIN_EMAILS get ADMIN on first registration.
 * Everyone else is PLAYER. Promote/demote later via DB or a future admin tool.
 */
export function roleForNewUser(email: string): UserAppRole {
  const set = adminEmailSet();
  return set.has(email.trim().toLowerCase()) ? "ADMIN" : "PLAYER";
}

function adminEmailSet(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}
