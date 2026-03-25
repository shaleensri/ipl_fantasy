"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

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
  };
  teams: {
    id: string;
    teamName: string;
    draftPosition: number | null;
    userId: string;
    userEmail: string | null;
  }[];
  picks: {
    overall: number;
    round: number;
    teamId: string;
    teamName: string;
    playerId: string;
    playerName: string;
    wasAutopick: boolean;
    autopickReason: string | null;
  }[];
  currentTeam: { id: string; teamName: string; userId: string } | null;
  isMyTurn: boolean;
  availablePlayers: {
    id: string;
    name: string;
    franchise: string;
    roles: string[];
    consensusRank: number | null;
  }[];
};

type Props = { leagueId: string };

export function DraftRoomClient({ leagueId }: Props) {
  const [state, setState] = useState<DraftApiState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

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
      const json = (await res.json()) as { error?: string };
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

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
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
                className="mt-3 rounded bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[#041e1c] disabled:opacity-50"
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

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
              Teams
            </h2>
            <ul className="mt-2 space-y-1 text-sm">
              {state.teams.map((t) => (
                <li key={t.id} className="flex justify-between gap-2">
                  <span>
                    {t.draftPosition != null ? `${t.draftPosition}. ` : ""}
                    {t.teamName}
                  </span>
                  <span className="truncate text-[var(--muted)]">{t.userEmail}</span>
                </li>
              ))}
            </ul>
          </section>

          {state.draft.status === "IN_PROGRESS" && state.isMyTurn && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                Available players
              </h2>
              <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto rounded border border-white/10 p-2 text-sm">
                {state.availablePlayers.slice(0, 40).map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-1"
                  >
                    <span>
                      <span className="font-mono text-[var(--muted)]">
                        #{p.consensusRank ?? "—"}
                      </span>{" "}
                      {p.name}{" "}
                      <span className="text-[var(--muted)]">
                        ({p.franchise} · {p.roles.join(", ")})
                      </span>
                    </span>
                    <button
                      type="button"
                      className="shrink-0 rounded border border-[var(--accent)] px-2 py-1 text-xs text-[var(--accent)] disabled:opacity-50"
                      disabled={!!busy}
                      onClick={() => void pickPlayer(p.id)}
                    >
                      {busy === `pick:${p.id}` ? "…" : "Draft"}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
              Picks
            </h2>
            <ol className="mt-2 space-y-1 font-mono text-xs text-[var(--muted)]">
              {state.picks.map((p) => (
                <li key={`${p.overall}-${p.playerId}`}>
                  {p.overall}. {p.teamName} — {p.playerName}
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
