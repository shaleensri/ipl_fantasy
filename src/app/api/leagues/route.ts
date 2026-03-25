import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createLeagueForCommissioner, LeagueServiceError } from "@/server/leagues";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  myTeamName: z.string().trim().min(1).max(80),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const seasonYear = new Date().getUTCFullYear();

  try {
    const { league, inviteCode } = await createLeagueForCommissioner({
      commissionerId: session.user.id,
      name: parsed.data.name,
      seasonYear,
      myTeamName: parsed.data.myTeamName,
    });

    return NextResponse.json({
      ok: true,
      leagueId: league.id,
      leagueName: league.name,
      inviteCode,
      seasonYear: league.seasonYear,
    });
  } catch (e) {
    if (e instanceof LeagueServiceError) {
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: e.status },
      );
    }
    throw e;
  }
}
