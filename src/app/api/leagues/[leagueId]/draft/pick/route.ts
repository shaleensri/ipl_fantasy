import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { DraftServiceError, makeManualPick } from "@/server/draft/service";

const bodySchema = z.object({
  playerId: z.string().min(1),
});

type RouteContext = { params: Promise<{ leagueId: string }> };

export async function POST(req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leagueId } = await context.params;

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

  try {
    const state = await makeManualPick(
      leagueId,
      session.user.id,
      parsed.data.playerId,
    );
    return NextResponse.json({ ok: true, ...state });
  } catch (e) {
    if (e instanceof DraftServiceError) {
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: e.status },
      );
    }
    throw e;
  }
}
