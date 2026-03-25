import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { DraftServiceError, getDraftState } from "@/server/draft/service";

type RouteContext = { params: Promise<{ leagueId: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leagueId } = await context.params;

  try {
    const state = await getDraftState(leagueId, session.user.id);
    return NextResponse.json(state);
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
