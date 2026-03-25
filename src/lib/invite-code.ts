import { randomInt } from "crypto";
import type { PrismaClient } from "@prisma/client";

/** Unambiguous uppercase alphanumerics (no I, O, 0, 1). */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomInviteCodeSegment(length = 8): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[randomInt(ALPHABET.length)]!;
  }
  return out;
}

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export async function generateUniqueInviteCode(
  db: Pick<PrismaClient, "league">,
): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const code = randomInviteCodeSegment(8);
    const clash = await db.league.findUnique({
      where: { inviteCode: code },
      select: { id: true },
    });
    if (!clash) return code;
  }
  throw new Error("Could not allocate a unique invite code");
}
