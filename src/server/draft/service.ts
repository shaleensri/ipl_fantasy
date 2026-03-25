import { randomInt } from "crypto";
import type { Draft, League, Team } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { compareAutopickCandidates } from "@/lib/autopick";
import {
  resolveDraftRules,
  totalPicks as computeTotalPicks,
} from "@/server/draft/config";
import {
  picksUntilSlotOnClock,
  roundNumberForPick,
  teamIndexForSnakePick,
} from "@/server/draft/snake";

export class DraftServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "DraftServiceError";
  }
}

/**
 * Years to try when `league.seasonYear` has too few `Player` rows (stale leagues,
 * seed run for UTC year only, or DB from another machine).
 */
function candidatePlayerPoolYears(leagueSeasonYear: number): number[] {
  const utc = new Date().getUTCFullYear();
  return [
    ...new Set([
      leagueSeasonYear,
      utc,
      utc - 1,
      utc + 1,
      leagueSeasonYear - 1,
      leagueSeasonYear + 1,
    ]),
  ];
}

/**
 * Ensures the league's `seasonYear` matches a season that has at least `minPlayers`
 * active players (updates `League` when a fallback year works).
 * Uses any season in the DB with a big enough pool — not only a fixed list of years.
 */
async function alignLeagueToAvailablePlayerPool(league: League, minPlayers: number) {
  const countFor = (year: number) =>
    prisma.player.count({ where: { seasonYear: year, active: true } });

  const initial = await countFor(league.seasonYear);
  if (initial >= minPlayers) return;

  const groups = await prisma.player.groupBy({
    by: ["seasonYear"],
    where: { active: true },
    _count: { _all: true },
  });

  const bigEnough = new Set(
    groups.filter((g) => g._count._all >= minPlayers).map((g) => g.seasonYear),
  );

  if (bigEnough.size === 0) {
    throw new DraftServiceError(
      "Player pool is too small for this roster size × teams. Run `npm run db:seed` or lower roster size in league settings.",
      400,
      "POOL_TOO_SMALL",
    );
  }

  const preferred = candidatePlayerPoolYears(league.seasonYear);
  const pick =
    preferred.find((y) => bigEnough.has(y)) ?? Math.max(...[...bigEnough]);

  if (pick !== league.seasonYear) {
    await prisma.league.update({
      where: { id: league.id },
      data: { seasonYear: pick },
    });
  }
}

function shuffleTeamIds(teamIds: string[]): string[] {
  const arr = [...teamIds];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export async function startDraft(leagueId: string, commissionerUserId: string) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { teams: true },
  });
  if (!league) throw new DraftServiceError("League not found", 404);
  if (league.commissionerId !== commissionerUserId) {
    throw new DraftServiceError("Only the commissioner can start the draft", 403);
  }

  const draft = await prisma.draft.findUnique({ where: { leagueId } });
  if (!draft) throw new DraftServiceError("Draft not found", 404);
  if (draft.status !== "PENDING") {
    throw new DraftServiceError("Draft already started or finished", 400, "INVALID_STATE");
  }

  const teams = league.teams;
  if (teams.length < 2) {
    throw new DraftServiceError("Need at least two teams to draft", 400, "NOT_ENOUGH_TEAMS");
  }

  const rules = resolveDraftRules(league.settings);
  const total = computeTotalPicks(teams.length, rules.rosterSize);
  await alignLeagueToAvailablePlayerPool(league, total);

  const orderedIds = shuffleTeamIds(teams.map((t) => t.id));
  const deadline = new Date(Date.now() + rules.pickTimerSeconds * 1000);
  const salaryCap = new Prisma.Decimal(rules.draftSalaryCap);

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.team.update({
        where: { id: orderedIds[i]! },
        data: { draftPosition: i + 1, draftBudgetRemaining: salaryCap },
      });
    }
    await tx.draft.update({
      where: { id: draft.id },
      data: {
        status: "IN_PROGRESS",
        currentPickIndex: 0,
        pickDeadlineAt: deadline,
      },
    });
  });

  await processDueAutopicks(leagueId);

  return getDraftState(leagueId, commissionerUserId);
}

export async function processDueAutopicks(leagueId: string): Promise<void> {
  for (let guard = 0; guard < 256; guard++) {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: { teams: { orderBy: { draftPosition: "asc" } } },
    });
    if (!league) return;
    const draft = await prisma.draft.findUnique({ where: { leagueId } });
    if (!draft || draft.status !== "IN_PROGRESS") return;

    const rules = resolveDraftRules(league.settings);
    const teams = league.teams.filter((t) => t.draftPosition != null);
    const teamCount = teams.length;
    if (teamCount < 2) return;

    const total = computeTotalPicks(teamCount, rules.rosterSize);
    if (draft.currentPickIndex >= total) {
      await prisma.draft.update({
        where: { id: draft.id },
        data: { status: "COMPLETE", pickDeadlineAt: null },
      });
      return;
    }

    const now = new Date();
    if (!draft.pickDeadlineAt || draft.pickDeadlineAt > now) return;
    if (!rules.autopickEnabled) return;

    const orderedIds = teams.map((t) => t.id);
    const pickIndex = draft.currentPickIndex;
    const slot = teamIndexForSnakePick(pickIndex, teamCount);
    const teamId = orderedIds[slot]!;

    const pickedIds = await prisma.pick.findMany({
      where: { draftId: draft.id },
      select: { playerId: true },
    });
    const pickedSet = new Set(pickedIds.map((p) => p.playerId));

    const pool = await prisma.player.findMany({
      where: {
        seasonYear: league.seasonYear,
        active: true,
        ...(pickedSet.size > 0 ? { id: { notIn: [...pickedSet] } } : {}),
      },
    });

    const teamRow = await prisma.team.findUnique({ where: { id: teamId } });
    const budget =
      teamRow?.draftBudgetRemaining != null
        ? Number(teamRow.draftBudgetRemaining)
        : Number.POSITIVE_INFINITY;

    const sorted = [...pool].sort((a, b) =>
      compareAutopickCandidates(
        {
          id: a.id,
          name: a.name,
          roles: a.roles,
          consensusRank: a.consensusRank,
        },
        {
          id: b.id,
          name: b.name,
          roles: b.roles,
          consensusRank: b.consensusRank,
        },
      ),
    );

    const affordable = sorted.find((p) => p.listPrice <= budget);
    const fallbackCheapest = [...sorted].sort((a, b) => a.listPrice - b.listPrice)[0];
    const chosen = affordable ?? fallbackCheapest;

    if (!chosen) {
      await prisma.draft.update({
        where: { id: draft.id },
        data: { status: "COMPLETE", pickDeadlineAt: null },
      });
      return;
    }

    const rank = chosen.consensusRank ?? "?";
    const reason = `Autopick: best available by consensus rank (${rank}) — ${chosen.name}.`;

    await recordPick({
      league,
      draft,
      teamId,
      playerId: chosen.id,
      playerListPrice: chosen.listPrice,
      pickIndex,
      wasAutopick: true,
      autopickReason: reason,
      totalPicks: total,
      pickTimerSeconds: rules.pickTimerSeconds,
    });
  }
}

type RecordPickArgs = {
  league: League & { teams: Team[] };
  draft: Draft;
  teamId: string;
  playerId: string;
  playerListPrice: number;
  pickIndex: number;
  wasAutopick: boolean;
  autopickReason?: string;
  totalPicks: number;
  pickTimerSeconds: number;
};

async function recordPick(args: RecordPickArgs) {
  const { league, draft, teamId, playerId, pickIndex, wasAutopick, autopickReason } =
    args;
  const price = args.playerListPrice;
  const teamCount = args.league.teams.filter((t) => t.draftPosition != null).length;
  const overall = pickIndex + 1;
  const round = roundNumberForPick(pickIndex, teamCount);

  await prisma.$transaction(async (tx) => {
    const teamRow = await tx.team.findUnique({ where: { id: teamId } });
    if (!teamRow) throw new DraftServiceError("Team not found", 404);
    if (teamRow.draftBudgetRemaining != null) {
      const rem = Number(teamRow.draftBudgetRemaining);
      if (rem < price) {
        throw new DraftServiceError(
          "Not enough salary cap for this player",
          400,
          "OVER_BUDGET",
        );
      }
    }

    await tx.pick.create({
      data: {
        draftId: draft.id,
        round,
        overall,
        teamId,
        playerId,
        wasAutopick,
        autopickReason: autopickReason ?? null,
      },
    });
    await tx.rosterEntry.create({
      data: {
        leagueId: league.id,
        teamId,
        playerId,
        acquiredVia: "DRAFT",
      },
    });
    if (teamRow.draftBudgetRemaining != null) {
      await tx.team.update({
        where: { id: teamId },
        data: { draftBudgetRemaining: { decrement: price } },
      });
    }
    const nextIndex = pickIndex + 1;
    if (nextIndex >= args.totalPicks) {
      await tx.draft.update({
        where: { id: draft.id },
        data: { currentPickIndex: nextIndex, status: "COMPLETE", pickDeadlineAt: null },
      });
    } else {
      const deadline = new Date(Date.now() + args.pickTimerSeconds * 1000);
      await tx.draft.update({
        where: { id: draft.id },
        data: { currentPickIndex: nextIndex, pickDeadlineAt: deadline },
      });
    }
  });
}

export async function makeManualPick(
  leagueId: string,
  userId: string,
  playerId: string,
) {
  await processDueAutopicks(leagueId);

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { teams: { orderBy: { draftPosition: "asc" } } },
  });
  if (!league) throw new DraftServiceError("League not found", 404);
  const draft = await prisma.draft.findUnique({ where: { leagueId } });
  if (!draft) throw new DraftServiceError("Draft not found", 404);
  if (draft.status !== "IN_PROGRESS") {
    throw new DraftServiceError("Draft is not in progress", 400, "INVALID_STATE");
  }

  const rules = resolveDraftRules(league.settings);
  const teams = league.teams.filter((t) => t.draftPosition != null);
  const teamCount = teams.length;
  const total = computeTotalPicks(teamCount, rules.rosterSize);

  if (draft.currentPickIndex >= total) {
    throw new DraftServiceError("Draft is complete", 400, "COMPLETE");
  }

  const pickIndex = draft.currentPickIndex;
  const slot = teamIndexForSnakePick(pickIndex, teamCount);
  const orderedIds = teams.map((t) => t.id);
  const onClockTeamId = orderedIds[slot]!;
  const onClockTeam = teams.find((t) => t.id === onClockTeamId);
  if (!onClockTeam || onClockTeam.userId !== userId) {
    throw new DraftServiceError("Not your pick", 403, "NOT_YOUR_PICK");
  }

  const taken = await prisma.pick.findFirst({
    where: { draftId: draft.id, playerId },
  });
  if (taken) throw new DraftServiceError("Player already drafted", 400, "TAKEN");

  const player = await prisma.player.findFirst({
    where: { id: playerId, seasonYear: league.seasonYear, active: true },
  });
  if (!player) throw new DraftServiceError("Invalid player", 400, "INVALID_PLAYER");

  const price = player.listPrice;
  if (onClockTeam.draftBudgetRemaining != null) {
    const rem = Number(onClockTeam.draftBudgetRemaining);
    if (rem < price) {
      throw new DraftServiceError("Not enough salary cap for this player", 400, "OVER_BUDGET");
    }
  }

  await recordPick({
    league,
    draft,
    teamId: onClockTeamId,
    playerId,
    playerListPrice: price,
    pickIndex,
    wasAutopick: false,
    totalPicks: total,
    pickTimerSeconds: rules.pickTimerSeconds,
  });

  await processDueAutopicks(leagueId);

  return getDraftState(leagueId, userId);
}

async function assertLeagueMember(leagueId: string, userId: string): Promise<void> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      commissionerId: true,
      teams: { where: { userId }, select: { id: true } },
    },
  });
  if (!league) throw new DraftServiceError("League not found", 404);
  if (league.commissionerId === userId) return;
  if (league.teams.length > 0) return;
  throw new DraftServiceError("Not a member of this league", 403, "NOT_MEMBER");
}

export async function getDraftState(leagueId: string, userId: string) {
  await assertLeagueMember(leagueId, userId);
  await processDueAutopicks(leagueId);

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      teams: {
        orderBy: { draftPosition: "asc" },
        include: { user: { select: { email: true, name: true } } },
      },
    },
  });
  if (!league) throw new DraftServiceError("League not found", 404);
  const draft = await prisma.draft.findUnique({
    where: { leagueId },
    include: {
      picks: {
        orderBy: { overall: "asc" },
        include: { player: true, team: true },
      },
    },
  });
  if (!draft) throw new DraftServiceError("Draft not found", 404);

  const rules = resolveDraftRules(league.settings);
  type LeagueTeamRow = (typeof league.teams)[number];
  const teams = league.teams.filter((t) => t.draftPosition != null) as Array<
    LeagueTeamRow & { draftPosition: number }
  >;
  const teamCount = teams.length;
  const total = computeTotalPicks(teamCount, rules.rosterSize);

  const orderedIds = teams.map((t) => t.id);
  let currentTeam: LeagueTeamRow | null = null;
  let isMyTurn = false;

  if (draft.status === "IN_PROGRESS" && teamCount >= 2 && draft.currentPickIndex < total) {
    const slot = teamIndexForSnakePick(draft.currentPickIndex, teamCount);
    const tid = orderedIds[slot]!;
    currentTeam = teams.find((t) => t.id === tid) ?? null;
    isMyTurn = currentTeam?.userId === userId;
  }

  const pickedIds = draft.picks.map((p) => p.playerId);
  const availablePlayers = await prisma.player.findMany({
    where: {
      seasonYear: league.seasonYear,
      active: true,
      ...(pickedIds.length > 0 ? { id: { notIn: pickedIds } } : {}),
    },
    orderBy: [{ consensusRank: "asc" }, { id: "asc" }],
    take: 500,
  });

  const picksByTeam = new Map<string, number>();
  for (const p of draft.picks) {
    picksByTeam.set(p.teamId, (picksByTeam.get(p.teamId) ?? 0) + 1);
  }

  const myRow = league.teams.find((t) => t.userId === userId);
  const myRoster = myRow ? (picksByTeam.get(myRow.id) ?? 0) : 0;
  const myTeam =
    myRow != null
      ? {
          id: myRow.id,
          teamName: myRow.teamName,
          draftBudgetRemaining:
            myRow.draftBudgetRemaining != null ? Number(myRow.draftBudgetRemaining) : null,
          rosterCount: myRoster,
          rosterSpotsLeft: Math.max(0, rules.rosterSize - myRoster),
          rosterSize: rules.rosterSize,
        }
      : null;

  const myRosterPlayers =
    myRow != null
      ? draft.picks
          .filter((p) => p.teamId === myRow.id)
          .map((p) => ({
            overall: p.overall,
            round: p.round,
            playerId: p.playerId,
            playerName: p.player.name,
            playerListPrice: p.player.listPrice,
            franchise: p.player.franchise,
            roles: p.player.roles,
          }))
      : [];

  let picksUntilMyTurn: number | null = null;
  if (
    draft.status === "IN_PROGRESS" &&
    teamCount >= 2 &&
    myRow != null &&
    draft.currentPickIndex < total
  ) {
    const mySlot = orderedIds.indexOf(myRow.id);
    if (mySlot >= 0) {
      picksUntilMyTurn = picksUntilSlotOnClock(
        draft.currentPickIndex,
        mySlot,
        teamCount,
        total,
      );
    }
  }

  return {
    league: {
      id: league.id,
      name: league.name,
      seasonYear: league.seasonYear,
      commissionerId: league.commissionerId,
      isCommissioner: league.commissionerId === userId,
    },
    draft: {
      id: draft.id,
      status: draft.status,
      currentPickIndex: draft.currentPickIndex,
      pickDeadlineAt: draft.pickDeadlineAt?.toISOString() ?? null,
      totalPicks: total,
      pickTimerSeconds: rules.pickTimerSeconds,
      autopickEnabled: rules.autopickEnabled,
      draftSalaryCap: rules.draftSalaryCap,
    },
    teams: league.teams.map((t) => ({
      id: t.id,
      teamName: t.teamName,
      draftPosition: t.draftPosition,
      userId: t.userId,
      userEmail: t.user.email,
      rosterCount: picksByTeam.get(t.id) ?? 0,
      rosterSpotsLeft: Math.max(0, rules.rosterSize - (picksByTeam.get(t.id) ?? 0)),
      draftBudgetRemaining:
        t.draftBudgetRemaining != null ? Number(t.draftBudgetRemaining) : null,
    })),
    picks: draft.picks.map((p) => ({
      overall: p.overall,
      round: p.round,
      teamId: p.teamId,
      teamName: p.team.teamName,
      playerId: p.playerId,
      playerName: p.player.name,
      playerListPrice: p.player.listPrice,
      franchise: p.player.franchise,
      roles: p.player.roles,
      wasAutopick: p.wasAutopick,
      autopickReason: p.autopickReason,
    })),
    currentTeam: currentTeam
      ? {
          id: currentTeam.id,
          teamName: currentTeam.teamName,
          userId: currentTeam.userId,
        }
      : null,
    isMyTurn,
    picksUntilMyTurn,
    myTeam,
    myRosterPlayers,
    availablePlayers: availablePlayers.map((p) => ({
      id: p.id,
      name: p.name,
      franchise: p.franchise,
      roles: p.roles,
      consensusRank: p.consensusRank,
      listPrice: p.listPrice,
    })),
  };
}
