import { prisma } from "@/lib/prisma";
import { generateUniqueInviteCode, normalizeInviteCode } from "@/lib/invite-code";
import type { League, Team } from "@prisma/client";

export class LeagueServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "LeagueServiceError";
  }
}

export type CreatedLeagueResult = {
  league: League;
  commissionerTeam: Team;
  inviteCode: string;
};

/**
 * Creates a league, a PENDING draft shell, and the commissioner's team in one transaction.
 */
export async function createLeagueForCommissioner(input: {
  commissionerId: string;
  name: string;
  seasonYear: number;
  myTeamName: string;
}): Promise<CreatedLeagueResult> {
  const inviteCode = await generateUniqueInviteCode(prisma);

  return prisma.$transaction(async (tx) => {
    const league = await tx.league.create({
      data: {
        name: input.name.trim(),
        inviteCode,
        seasonYear: input.seasonYear,
        commissionerId: input.commissionerId,
      },
    });

    await tx.draft.create({
      data: {
        leagueId: league.id,
      },
    });

    const commissionerTeam = await tx.team.create({
      data: {
        leagueId: league.id,
        userId: input.commissionerId,
        teamName: input.myTeamName.trim(),
      },
    });

    return { league, commissionerTeam, inviteCode };
  });
}

export type JoinLeagueResult = { league: League; team: Team };

export async function joinLeagueWithCode(input: {
  userId: string;
  inviteCode: string;
  teamName: string;
}): Promise<JoinLeagueResult> {
  const code = normalizeInviteCode(input.inviteCode);
  if (code.length < 4) {
    throw new LeagueServiceError("Invalid invite code", 400, "INVALID_CODE");
  }

  const league = await prisma.league.findUnique({
    where: { inviteCode: code },
  });
  if (!league) {
    throw new LeagueServiceError("Invalid invite code", 404, "INVALID_CODE");
  }

  const existing = await prisma.team.findUnique({
    where: {
      leagueId_userId: { leagueId: league.id, userId: input.userId },
    },
  });
  if (existing) {
    throw new LeagueServiceError("Already in this league", 409, "ALREADY_JOINED");
  }

  const team = await prisma.team.create({
    data: {
      leagueId: league.id,
      userId: input.userId,
      teamName: input.teamName.trim(),
    },
  });

  return { league, team };
}

/** Teams the user belongs to, with league metadata, newest first. */
export async function getMyLeagueMemberships(userId: string) {
  return prisma.team.findMany({
    where: { userId },
    include: { league: true },
    orderBy: { createdAt: "desc" },
  });
}
