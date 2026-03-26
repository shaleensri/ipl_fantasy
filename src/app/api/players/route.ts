import { NextRequest, NextResponse } from "next/server";
import { loadPlayersFromCsv } from "@/lib/csv-players";

export function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const franchise = searchParams.get("franchise");
  const role = searchParams.get("role");

  let players = loadPlayersFromCsv();

  if (franchise) {
    players = players.filter((p) => p.franchise === franchise.toUpperCase());
  }
  if (role) {
    players = players.filter((p) =>
      p.roles.includes(role.toUpperCase() as ReturnType<typeof loadPlayersFromCsv>[number]["roles"][number]),
    );
  }

  return NextResponse.json({ players, total: players.length });
}
