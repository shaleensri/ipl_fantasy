import { randomInt } from "crypto";
import type { Draft, League, Team } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { compareAutopickCandidates, type AutopickPlayerView } from "@/lib/autopick";
import {
  resolveDraftRules,
  totalPicks as computeTotalPicks,
} from "@/server/draft/config";
import { roundNumberForPick, teamIndexForSnakePick } from "@/server/draft/snake";

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
  const playerCount = await prisma.player.count({
    where: { seasonYear: league.seasonYear, active: true },
  });
  if (playerCount < total) {
    throw new DraftServiceError(
      "Player pool is too small for this roster size × teams. Run `npm run db:seed` or lower roster size in league settings.",
      400,
      "POOL_TOO_SMALL",
    );
  }

  const orderedIds = shuffleTeamIds(teams.map((t) => t.id));
  const deadline = new Date(Date.now() + rules.pickTimerSeconds * 1000);

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.team.update({
        where: { id: orderedIds[i]! },
        data: { draftPosition: i + 1 },
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

    const views: AutopickPlayerView[] = pool.map((p) => ({
      id: p.id,
      name: p.name,
      roles: p.roles,
      consensusRank: p.consensusRank,
    }));
    views.sort(compareAutopickCandidates);
    const best = views[0];
    if (!best) {
      await prisma.draft.update({
        where: { id: draft.id },
        data: { status: "COMPLETE", pickDeadlineAt: null },
      });
      return;
    }

    const rank = best.consensusRank ?? "?";
    const reason = `Autopick: best available by consensus rank (${rank}) — ${best.name}.`;

    await recordPick({
      league,
      draft,
      teamId,
      playerId: best.id,
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
  pickIndex: number;
  wasAutopick: boolean;
  autopickReason?: string;
  totalPicks: number;
  pickTimerSeconds: number;
};

async function recordPick(args: RecordPickArgs) {
  const { league, draft, teamId, playerId, pickIndex, wasAutopick, autopickReason } =
    args;
  const teamCount = args.league.teams.filter((t) => t.draftPosition != null).length;
  const overall = pickIndex + 1;
  const round = roundNumberForPick(pickIndex, teamCount);

  await prisma.$transaction(async (tx) => {
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

  await recordPick({
    league,
    draft,
    teamId: onClockTeamId,
    playerId,
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
    take: 200,
  });

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
    },
    teams: league.teams.map((t) => ({
      id: t.id,
      teamName: t.teamName,
      draftPosition: t.draftPosition,
      userId: t.userId,
      userEmail: t.user.email,
    })),
    picks: draft.picks.map((p) => ({
      overall: p.overall,
      round: p.round,
      teamId: p.teamId,
      teamName: p.team.teamName,
      playerId: p.playerId,
      playerName: p.player.name,
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
    availablePlayers: availablePlayers.map((p) => ({
      id: p.id,
      name: p.name,
      franchise: p.franchise,
      roles: p.roles,
      consensusRank: p.consensusRank,
    })),
  };
}
