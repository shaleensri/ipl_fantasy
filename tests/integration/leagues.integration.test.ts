import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createLeagueForCommissioner,
  joinLeagueWithCode,
  LeagueServiceError,
} from "@/server/leagues";

const hasDb = Boolean(
  process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("USER:PASSWORD"),
);

describe.skipIf(!hasDb)("leagues service (integration)", () => {
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };

  beforeAll(async () => {
    const ts = Date.now();
    userA = await prisma.user.create({
      data: {
        email: `league-a-${ts}@test.ipl-fantasy.local`,
        passwordHash: "x",
      },
    });
    userB = await prisma.user.create({
      data: {
        email: `league-b-${ts}@test.ipl-fantasy.local`,
        passwordHash: "x",
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { id: { in: [userA.id, userB.id] } },
    });
  });

  it("createLeagueForCommissioner creates league, draft, and commissioner team", async () => {
    const { league, commissionerTeam, inviteCode } = await createLeagueForCommissioner({
      commissionerId: userA.id,
      name: "Test League",
      seasonYear: 2026,
      myTeamName: "Commish FC",
    });

    expect(league.name).toBe("Test League");
    expect(inviteCode).toHaveLength(8);
    expect(commissionerTeam.teamName).toBe("Commish FC");
    expect(commissionerTeam.userId).toBe(userA.id);

    const draft = await prisma.draft.findUnique({
      where: { leagueId: league.id },
    });
    expect(draft?.status).toBe("PENDING");

    await prisma.league.delete({ where: { id: league.id } });
  });

  it("joinLeagueWithCode adds second team; duplicate join throws", async () => {
    const { league, inviteCode } = await createLeagueForCommissioner({
      commissionerId: userA.id,
      name: "Join Test",
      seasonYear: 2026,
      myTeamName: "A",
    });

    const j = await joinLeagueWithCode({
      userId: userB.id,
      inviteCode,
      teamName: "B Team",
    });
    expect(j.team.teamName).toBe("B Team");

    await expect(
      joinLeagueWithCode({
        userId: userB.id,
        inviteCode,
        teamName: "Again",
      }),
    ).rejects.toMatchObject({ status: 409 });

    await prisma.league.delete({ where: { id: league.id } });
  });

  it("joinLeagueWithCode rejects unknown code", async () => {
    await expect(
      joinLeagueWithCode({
        userId: userB.id,
        inviteCode: "ZZZZZZZZ",
        teamName: "X",
      }),
    ).rejects.toSatisfy((err: unknown) => {
      return (
        err instanceof LeagueServiceError &&
        err.status === 404 &&
        err.code === "INVALID_CODE"
      );
    });
  });
});
