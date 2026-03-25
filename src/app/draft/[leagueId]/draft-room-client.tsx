"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { teamIndexForSnakePick } from "@/server/draft/snake";

type RoleFilter = "ALL" | "BATTER" | "BOWLER" | "ALL_ROUNDER" | "KEEPER";

type DraftTab = "draft" | "roster" | "board";

type DraftApiState = {
  league: {
    id: string;
    name: string;
    seasonYear: number;
    commissionerId: string;
    isCommissioner: boolean;
  };
  draft: {
    id: string;
    status: string;
    currentPickIndex: number;
    pickDeadlineAt: string | null;
    totalPicks: number;
    pickTimerSeconds: number;
    autopickEnabled: boolean;
    draftSalaryCap: number;
  };
  teams: {
    id: string;
    teamName: string;
    draftPosition: number | null;
    userId: string;
    userEmail: string | null;
    rosterCount: number;
    rosterSpotsLeft: number;
    draftBudgetRemaining: number | null;
  }[];
  picks: {
    overall: number;
    round: number;
    teamId: string;
    teamName: string;
    playerId: string;
    playerName: string;
    playerListPrice: number;
    franchise: string;
    roles: string[];
    wasAutopick: boolean;
    autopickReason: string | null;
  }[];
  currentTeam: { id: string; teamName: string; userId: string } | null;
  isMyTurn: boolean;
  picksUntilMyTurn: number | null;
  myTeam: {
    id: string;
    teamName: string;
    draftBudgetRemaining: number | null;
    rosterCount: number;
    rosterSpotsLeft: number;
    rosterSize: number;
  } | null;
  myRosterPlayers: {
    overall: number;
    round: number;
    playerId: string;
    playerName: string;
    playerListPrice: number;
    franchise: string;
    roles: string[];
  }[];
  availablePlayers: {
    id: string;
    name: string;
    franchise: string;
    roles: string[];
    consensusRank: number | null;
    listPrice: number;
  }[];
};

type Props = { leagueId: string };

const ROLE_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "BATTER", label: "Batters" },
  { value: "BOWLER", label: "Bowlers" },
  { value: "ALL_ROUNDER", label: "All-rounders" },
  { value: "KEEPER", label: "Wicketkeepers" },
];

function tabClass(active: boolean) {
  return active
    ? "border-b-2 border-[var(--accent)] text-[var(--foreground)]"
    : "border-b-2 border-transparent text-[var(--muted)] hover:text-[var(--foreground)]";
}

function DraftBoardGrid({ state }: { state: DraftApiState }) {
  const draftTeams = useMemo(() => {
    return [...state.teams]
      .filter((t) => t.draftPosition != null)
      .sort((a, b) => (a.draftPosition ?? 0) - (b.draftPosition ?? 0));
  }, [state.teams]);

  const rosterSize =
    state.myTeam?.rosterSize ??
    (draftTeams.length > 0 ? state.draft.totalPicks / draftTeams.length : 15);

  const grid = useMemo(() => {
    const rows = Math.max(1, Math.round(rosterSize));
    const cols = draftTeams.length;
    const m: (DraftApiState["picks"][0] | null)[][] = Array.from({ length: rows }, () =>
      Array(cols).fill(null),
    );
    for (const p of state.picks) {
      const col = draftTeams.findIndex((t) => t.id === p.teamId);
      const row = p.round - 1;
      if (col >= 0 && row >= 0 && row < rows && col < cols) {
        m[row]![col] = p;
      }
    }
    return m;
  }, [state.picks, draftTeams, rosterSize]);

  const n = draftTeams.length;
  let nextRow = 0;
  let nextCol = 0;
  const showNext =
    state.draft.status === "IN_PROGRESS" &&
    n >= 2 &&
    state.draft.currentPickIndex < state.draft.totalPicks;
  if (showNext) {
    nextRow = Math.floor(state.draft.currentPickIndex / n);
    nextCol = teamIndexForSnakePick(state.draft.currentPickIndex, n);
  }

  if (draftTeams.length === 0) {
    return (
      <p className="rounded-lg border border-white/10 bg-[#12161c] px-4 py-8 text-center text-sm text-[var(--muted)]">
        Draft order is set when the commissioner starts the draft.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0e1117] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left">
        <thead>
          <tr>
            <th className="sticky left-0 z-20 w-14 min-w-14 border-b border-r border-white/[0.06] bg-[#141920] px-2 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
              Rd
            </th>
            {draftTeams.map((t) => (
              <th
                key={t.id}
                className={`border-b border-white/[0.06] px-1.5 py-2 text-center ${
                  state.currentTeam?.id === t.id ? "bg-[var(--accent)]/12" : "bg-[#141920]"
                }`}
              >
                <div className="mx-auto flex max-w-[104px] flex-col items-center gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
                    {t.draftPosition}
                  </span>
                  <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-[var(--foreground)]">
                    {t.teamName}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((row, ri) => (
            <tr key={ri}>
              <td className="sticky left-0 z-10 border-b border-r border-white/[0.06] bg-[#141920] px-2 py-0 text-center align-middle">
                <span className="text-xs font-mono font-semibold text-[var(--accent)]">
                  {ri + 1}
                </span>
              </td>
              {row.map((cell, ci) => {
                const isOnClockSlot =
                  showNext && ri === nextRow && ci === nextCol && cell == null;
                return (
                  <td
                    key={ci}
                    className={`border-b border-white/[0.04] p-1 align-top ${
                      state.currentTeam?.id === draftTeams[ci]?.id
                        ? "bg-[var(--accent)]/[0.06]"
                        : ""
                    }`}
                  >
                    <div
                      className={`flex min-h-[52px] flex-col justify-center rounded-md border px-1.5 py-1.5 ${
                        cell
                          ? "border-white/[0.08] bg-[#1a1f28]"
                          : isOnClockSlot
                            ? "border-[var(--accent)] bg-[var(--accent)]/10 shadow-[0_0_0_1px_rgba(20,184,166,0.35)]"
                            : "border-white/[0.05] bg-[#12161c]/80"
                      }`}
                    >
                      {cell ? (
                        <>
                          <span className="line-clamp-2 text-[11px] font-semibold leading-snug text-[var(--foreground)]">
                            {cell.playerName}
                          </span>
                          <span className="mt-0.5 text-[9px] font-mono text-[var(--muted)]">
                            {cell.franchise} · {cell.playerListPrice}
                          </span>
                        </>
                      ) : isOnClockSlot ? (
                        <span className="text-center text-[10px] font-medium uppercase tracking-wide text-[var(--accent)]">
                          On the clock
                        </span>
                      ) : (
                        <span className="text-center text-[10px] text-[var(--muted)]/50">—</span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DraftRoomClient({ leagueId }: Props) {
  const [state, setState] = useState<DraftApiState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [tab, setTab] = useState<DraftTab>("draft");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/leagues/${leagueId}/draft`, {
      credentials: "include",
    });
    const json = (await res.json()) as { error?: string } & Partial<DraftApiState>;
    if (!res.ok) {
      setError(json.error ?? `Request failed (${res.status})`);
      setState(null);
      return;
    }
    setError(null);
    setState({
      ...json,
      picksUntilMyTurn:
        json.picksUntilMyTurn !== undefined ? json.picksUntilMyTurn : null,
      myRosterPlayers: json.myRosterPlayers ?? [],
      picks: json.picks ?? [],
    } as DraftApiState);
  }, [leagueId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => void load(), 2000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  async function startDraft() {
    setBusy("start");
    setError(null);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/draft/start`, {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? `Start failed (${res.status})`);
        return;
      }
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function pickPlayer(playerId: string) {
    setBusy(`pick:${playerId}`);
    setError(null);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/draft/pick`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      const json = (await res.json()) as { error?: string; code?: string };
      if (!res.ok) {
        setError(json.error ?? `Pick failed (${res.status})`);
        return;
      }
      await load();
    } finally {
      setBusy(null);
    }
  }

  const deadlineMs = state?.draft.pickDeadlineAt
    ? new Date(state.draft.pickDeadlineAt).getTime()
    : null;
  const secondsLeft =
    deadlineMs != null ? Math.max(0, Math.ceil((deadlineMs - now) / 1000)) : null;

  const filteredPlayers = useMemo(() => {
    if (!state?.availablePlayers) return [];
    let list = state.availablePlayers;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.franchise.toLowerCase().includes(q),
      );
    }
    if (roleFilter !== "ALL") {
      list = list.filter((p) => p.roles.includes(roleFilter));
    }
    const minN = priceMin === "" ? null : Number.parseFloat(priceMin);
    const maxN = priceMax === "" ? null : Number.parseFloat(priceMax);
    if (minN != null && Number.isFinite(minN)) {
      list = list.filter((p) => p.listPrice >= minN);
    }
    if (maxN != null && Number.isFinite(maxN)) {
      list = list.filter((p) => p.listPrice <= maxN);
    }
    return list;
  }, [state?.availablePlayers, search, roleFilter, priceMin, priceMax]);

  const myBudget = state?.myTeam?.draftBudgetRemaining;
  const canAfford = (price: number) =>
    myBudget == null ? true : price <= myBudget;

  const onClockMessage = useMemo(() => {
    if (!state || state.draft.status !== "IN_PROGRESS") return null;
    if (state.isMyTurn) return "You're on the clock now.";
    if (state.picksUntilMyTurn == null) return null;
    if (state.picksUntilMyTurn <= 0) return null;
    const n = state.picksUntilMyTurn;
    return `You're on the clock in: ${n} pick${n === 1 ? "" : "s"}.`;
  }, [state]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm text-[var(--muted)]">
        <Link href="/" className="text-[var(--accent)]">
          Home
        </Link>
      </p>
      <h1 className="mt-2 text-xl font-semibold">Draft room</h1>
      {state && (
        <p className="mt-1 text-sm text-[var(--muted)]">
          {state.league.name} · Season {state.league.seasonYear}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      {!state && !error && (
        <p className="mt-6 text-sm text-[var(--muted)]">Loading draft…</p>
      )}

      {state && (
        <>
          <nav
            className="mt-6 flex gap-1 border-b border-white/10"
            aria-label="Draft views"
          >
            <button
              type="button"
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${tabClass(tab === "draft")}`}
              onClick={() => setTab("draft")}
            >
              Draft
            </button>
            <button
              type="button"
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${tabClass(tab === "roster")}`}
              onClick={() => setTab("roster")}
            >
              My roster
            </button>
            <button
              type="button"
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${tabClass(tab === "board")}`}
              onClick={() => setTab("board")}
            >
              Draft board
            </button>
          </nav>

          <div className="mt-6">
            {tab === "draft" && (
              <div className="space-y-6">
                <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      Status:{" "}
                      <span className="font-mono text-[var(--accent)]">
                        {state.draft.status}
                      </span>
                    </p>
                    {state.draft.status === "IN_PROGRESS" && secondsLeft != null && (
                      <p className="font-mono text-sm text-[var(--muted)]">
                        Pick clock: {secondsLeft}s
                      </p>
                    )}
                  </div>
                  {state.draft.status === "PENDING" && state.league.isCommissioner && (
                    <button
                      type="button"
                      className="mt-3 rounded bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"
                      disabled={!!busy}
                      onClick={() => void startDraft()}
                    >
                      {busy === "start" ? "Starting…" : "Start draft"}
                    </button>
                  )}
                  {state.draft.status === "PENDING" && !state.league.isCommissioner && (
                    <p className="mt-3 text-sm text-[var(--muted)]">
                      Waiting for the commissioner to start the draft.
                    </p>
                  )}
                  {state.draft.status === "IN_PROGRESS" && (
                    <div className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                      <p>
                        Pick {state.draft.currentPickIndex + 1} of {state.draft.totalPicks}
                        {state.currentTeam && (
                          <>
                            {" "}
                            ·{" "}
                            <span className="text-[var(--foreground)]">On the clock:</span>{" "}
                            <span className="font-semibold text-[var(--accent)]">
                              {state.currentTeam.teamName}
                            </span>
                          </>
                        )}
                        {state.isMyTurn && (
                          <span className="ml-1 font-medium text-[var(--accent)]">
                            (your pick)
                          </span>
                        )}
                      </p>
                      {onClockMessage && (
                        <p className="text-[var(--foreground)]">{onClockMessage}</p>
                      )}
                    </div>
                  )}
                  {state.draft.status === "COMPLETE" && (
                    <p className="mt-3 text-sm text-[var(--muted)]">Draft complete.</p>
                  )}
                </section>

                {state.myTeam && (
                  <section className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4">
                    <h2 className="text-sm font-semibold text-[var(--foreground)]">
                      Your team
                    </h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">{state.myTeam.teamName}</p>
                    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <dt className="text-[var(--muted)]">Salary cap (start)</dt>
                        <dd className="font-mono text-[var(--foreground)]">
                          {state.draft.draftSalaryCap ?? "—"}{" "}
                          <span className="text-xs text-[var(--muted)]">units</span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--muted)]">Budget left</dt>
                        <dd className="font-mono text-[var(--foreground)]">
                          {state.myTeam.draftBudgetRemaining != null
                            ? state.myTeam.draftBudgetRemaining.toFixed(0)
                            : "—"}{" "}
                          <span className="text-xs text-[var(--muted)]">units</span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--muted)]">Roster filled</dt>
                        <dd className="font-mono text-[var(--foreground)]">
                          {state.myTeam.rosterCount} / {state.myTeam.rosterSize}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--muted)]">Spots left</dt>
                        <dd className="font-mono text-[var(--foreground)]">
                          {state.myTeam.rosterSpotsLeft}
                        </dd>
                      </div>
                    </dl>
                  </section>
                )}

                <section>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Teams
                  </h2>
                  <ul className="mt-2 space-y-2 text-sm">
                    {state.teams.map((t) => {
                      const onClock = state.currentTeam?.id === t.id;
                      return (
                        <li
                          key={t.id}
                          className={`flex flex-wrap items-baseline justify-between gap-2 rounded-lg px-3 py-2 transition-colors ${
                            onClock
                              ? "border-2 border-[var(--accent)] bg-[var(--accent)]/15 ring-1 ring-[var(--accent)]/40"
                              : "border border-white/5 bg-white/[0.02]"
                          }`}
                        >
                          <span className="flex flex-wrap items-center gap-2">
                            {onClock && (
                              <span className="rounded bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-950">
                                On the clock
                              </span>
                            )}
                            <span>
                              {t.draftPosition != null ? `${t.draftPosition}. ` : ""}
                              {t.teamName}
                            </span>
                          </span>
                          <span className="text-[var(--muted)]">
                            {t.userEmail}
                            {state.draft.status === "IN_PROGRESS" && (
                              <span className="ml-2 font-mono text-xs text-[var(--foreground)]">
                                · {t.rosterCount} picked
                                {t.draftBudgetRemaining != null && (
                                  <> · {t.draftBudgetRemaining.toFixed(0)} left</>
                                )}
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                {state.draft.status === "IN_PROGRESS" && (
                  <section className="space-y-4">
                    <div className="flex flex-col gap-3">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                        Available players
                      </h2>
                      <p className="text-xs text-[var(--muted)]">
                        List updates every ~2s. Picked players disappear from the pool for
                        everyone.
                      </p>
                      <input
                        type="search"
                        placeholder="Search name or franchise…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full max-w-md rounded-lg border border-[#2a3140] bg-[#151a24] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                      />
                      <div className="flex flex-wrap gap-2">
                        {ROLE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setRoleFilter(opt.value)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                              roleFilter === opt.value
                                ? "bg-[var(--accent)] text-zinc-950"
                                : "border border-white/15 bg-white/[0.04] text-[var(--foreground)] hover:bg-white/[0.08]"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-end gap-3">
                        <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                          Min price
                          <input
                            type="number"
                            min={0}
                            value={priceMin}
                            onChange={(e) => setPriceMin(e.target.value)}
                            className="w-28 rounded border border-[#2a3140] bg-[#151a24] px-2 py-1.5 font-mono text-sm text-[var(--foreground)]"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                          Max price
                          <input
                            type="number"
                            min={0}
                            value={priceMax}
                            onChange={(e) => setPriceMax(e.target.value)}
                            className="w-28 rounded border border-[#2a3140] bg-[#151a24] px-2 py-1.5 font-mono text-sm text-[var(--foreground)]"
                          />
                        </label>
                        <button
                          type="button"
                          className="text-xs text-[var(--accent)] underline"
                          onClick={() => {
                            setPriceMin("");
                            setPriceMax("");
                            setRoleFilter("ALL");
                            setSearch("");
                          }}
                        >
                          Clear filters
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-white/10">
                      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-wide text-[var(--muted)]">
                            <th className="px-3 py-2 font-medium">#</th>
                            <th className="px-3 py-2 font-medium">Player</th>
                            <th className="px-3 py-2 font-medium">Franchise</th>
                            <th className="px-3 py-2 font-medium">Roles</th>
                            <th className="px-3 py-2 font-medium">Price</th>
                            <th className="px-3 py-2 font-medium">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPlayers.length === 0 ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="px-3 py-8 text-center text-[var(--muted)]"
                              >
                                No players match your filters.
                              </td>
                            </tr>
                          ) : (
                            filteredPlayers.map((p) => {
                              const affordable = canAfford(p.listPrice);
                              const canDraft = state.isMyTurn && affordable && !busy;
                              return (
                                <tr
                                  key={p.id}
                                  className="border-b border-white/5 hover:bg-white/[0.02]"
                                >
                                  <td className="px-3 py-2 font-mono text-[var(--muted)]">
                                    {p.consensusRank ?? "—"}
                                  </td>
                                  <td className="px-3 py-2 font-medium text-[var(--foreground)]">
                                    {p.name}
                                  </td>
                                  <td className="px-3 py-2 text-[var(--muted)]">
                                    {p.franchise}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-[var(--muted)]">
                                    {p.roles.join(", ")}
                                  </td>
                                  <td className="px-3 py-2 font-mono text-[var(--foreground)]">
                                    {p.listPrice}
                                  </td>
                                  <td className="px-3 py-2">
                                    {state.isMyTurn ? (
                                      <button
                                        type="button"
                                        disabled={!canDraft}
                                        title={
                                          !affordable
                                            ? "Over your remaining budget"
                                            : undefined
                                        }
                                        className="rounded border border-[var(--accent)] px-2 py-1 text-xs font-medium text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
                                        onClick={() => void pickPlayer(p.id)}
                                      >
                                        {busy === `pick:${p.id}` ? "…" : "Draft"}
                                      </button>
                                    ) : (
                                      <span className="text-xs text-[var(--muted)]">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-[var(--muted)]">
                      Showing {filteredPlayers.length} of {state.availablePlayers.length}{" "}
                      loaded in this round (server refreshes the pool).
                    </p>
                  </section>
                )}

                <section>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Pick feed
                  </h2>
                  <ol className="mt-2 max-h-48 space-y-1 overflow-y-auto font-mono text-xs text-[var(--muted)]">
                    {state.picks.map((p) => (
                      <li key={`${p.overall}-${p.playerId}`}>
                        {p.overall}. {p.teamName} — {p.playerName} ({p.playerListPrice}){" "}
                        {p.wasAutopick ? " (autopick)" : ""}
                      </li>
                    ))}
                  </ol>
                </section>
              </div>
            )}

            {tab === "roster" && (
              <div className="space-y-4">
                {!state.myTeam ? (
                  <p className="text-sm text-[var(--muted)]">No team found for your account.</p>
                ) : (
                  <>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                      <h2 className="text-lg font-semibold text-[var(--foreground)]">
                        {state.myTeam.teamName}
                      </h2>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        Active roster · {state.myTeam.rosterCount} / {state.myTeam.rosterSize}{" "}
                        players
                        {state.draft.status === "IN_PROGRESS" &&
                          state.myTeam.draftBudgetRemaining != null && (
                            <span className="ml-2 font-mono">
                              · {state.myTeam.draftBudgetRemaining.toFixed(0)} budget left
                            </span>
                          )}
                      </p>
                    </div>
                    {state.myRosterPlayers.length === 0 ? (
                      <p className="text-sm text-[var(--muted)]">
                        No picks yet. When the draft runs, your players appear here.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-white/10">
                        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                          <thead>
                            <tr className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-wide text-[var(--muted)]">
                              <th className="px-3 py-2">Pick</th>
                              <th className="px-3 py-2">Rnd</th>
                              <th className="px-3 py-2">Player</th>
                              <th className="px-3 py-2">Franchise</th>
                              <th className="px-3 py-2">Roles</th>
                              <th className="px-3 py-2">Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {state.myRosterPlayers.map((r) => (
                              <tr
                                key={`${r.overall}-${r.playerId}`}
                                className="border-b border-white/5"
                              >
                                <td className="px-3 py-2 font-mono text-[var(--muted)]">
                                  #{r.overall}
                                </td>
                                <td className="px-3 py-2 font-mono">{r.round}</td>
                                <td className="px-3 py-2 font-medium text-[var(--foreground)]">
                                  {r.playerName}
                                </td>
                                <td className="px-3 py-2 text-[var(--muted)]">{r.franchise}</td>
                                <td className="px-3 py-2 text-xs text-[var(--muted)]">
                                  {r.roles.join(", ")}
                                </td>
                                <td className="px-3 py-2 font-mono">{r.playerListPrice}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {tab === "board" && (
              <div className="space-y-4">
                {state.draft.status === "IN_PROGRESS" && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
                    <span className="text-[var(--muted)]">
                      Pick{" "}
                      <span className="font-mono text-[var(--foreground)]">
                        {state.draft.currentPickIndex + 1}
                      </span>{" "}
                      / {state.draft.totalPicks}
                    </span>
                    {state.currentTeam && (
                      <span className="text-[var(--muted)]">
                        On the clock:{" "}
                        <span className="font-semibold text-[var(--accent)]">
                          {state.currentTeam.teamName}
                        </span>
                      </span>
                    )}
                    {secondsLeft != null && (
                      <span className="font-mono text-[var(--muted)]">{secondsLeft}s</span>
                    )}
                  </div>
                )}
                <DraftBoardGrid state={state} />
                {onClockMessage && state.draft.status === "IN_PROGRESS" && (
                  <p className="text-center text-sm text-[var(--foreground)]">{onClockMessage}</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
