"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type RoleFilter = "ALL" | "BATTER" | "BOWLER" | "ALL_ROUNDER" | "KEEPER";

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
    wasAutopick: boolean;
    autopickReason: string | null;
  }[];
  currentTeam: { id: string; teamName: string; userId: string } | null;
  isMyTurn: boolean;
  myTeam: {
    id: string;
    teamName: string;
    draftBudgetRemaining: number | null;
    rosterCount: number;
    rosterSpotsLeft: number;
    rosterSize: number;
  } | null;
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

export function DraftRoomClient({ leagueId }: Props) {
  const [state, setState] = useState<DraftApiState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
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
    setState(json as DraftApiState);
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

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
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
        <div className="mt-6 space-y-6">
          <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-[var(--foreground)]">
                Status:{" "}
                <span className="font-mono text-[var(--accent)]">{state.draft.status}</span>
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
              <p className="mt-3 text-sm text-[var(--muted)]">
                Pick {state.draft.currentPickIndex + 1} of {state.draft.totalPicks}
                {state.currentTeam && (
                  <>
                    {" "}
                    · On the clock:{" "}
                    <span className="text-[var(--foreground)]">{state.currentTeam.teamName}</span>
                  </>
                )}
                {state.isMyTurn && (
                  <span className="ml-1 font-medium text-[var(--accent)]">(your pick)</span>
                )}
              </p>
            )}
            {state.draft.status === "COMPLETE" && (
              <p className="mt-3 text-sm text-[var(--muted)]">Draft complete.</p>
            )}
          </section>

          {state.myTeam && (
            <section className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Your team</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{state.myTeam.teamName}</p>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-[var(--muted)]">Salary cap (start)</dt>
                  <dd className="font-mono text-[var(--foreground)]">
                    {state.draft.draftSalaryCap ?? "—"} <span className="text-xs text-[var(--muted)]">units</span>
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
              {state.teams.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded border border-white/5 bg-white/[0.02] px-3 py-2"
                >
                  <span>
                    {t.draftPosition != null ? `${t.draftPosition}. ` : ""}
                    {t.teamName}
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
              ))}
            </ul>
          </section>

          {state.draft.status === "IN_PROGRESS" && (
            <section className="space-y-4">
              <div className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Available players
                </h2>
                <p className="text-xs text-[var(--muted)]">
                  List updates every ~2s. Picked players disappear from the pool for everyone.
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
                        <td colSpan={6} className="px-3 py-8 text-center text-[var(--muted)]">
                          No players match your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredPlayers.map((p) => {
                        const affordable = canAfford(p.listPrice);
                        const canDraft =
                          state.isMyTurn && affordable && !busy;
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
                            <td className="px-3 py-2 text-[var(--muted)]">{p.franchise}</td>
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
                Showing {filteredPlayers.length} of {state.availablePlayers.length} loaded in
                this round (server refreshes the pool).
              </p>
            </section>
          )}

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
              Picks
            </h2>
            <ol className="mt-2 space-y-1 font-mono text-xs text-[var(--muted)]">
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
    </main>
  );
}
