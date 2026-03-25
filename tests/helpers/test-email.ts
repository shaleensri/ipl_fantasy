/** Stable local-only pattern for test users; safe to delete by suffix in cleanup jobs later. */
export function uniqueTestEmail(prefix = "vitest"): string {
  const n =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}+${n}@test.ipl-fantasy.local`;
}
