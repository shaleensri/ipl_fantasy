"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export function JoinLeagueForm() {
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get("code") ?? "";

  const [inviteCode, setInviteCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    leagueId: string;
    leagueName: string;
    teamName: string;
  } | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (codeFromUrl) {
      setInviteCode(codeFromUrl.trim().toUpperCase());
    }
  }, [codeFromUrl]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setPending(true);
    try {
      const res = await fetch("/api/leagues/join", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode, teamName }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        leagueId?: string;
        leagueName?: string;
        teamName?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not join league.");
        return;
      }
      if (data.leagueId && data.leagueName && data.teamName) {
        setSuccess({
          leagueId: data.leagueId,
          leagueName: data.leagueName,
          teamName: data.teamName,
        });
      }
      setTeamName("");
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <div className="mt-8 rounded-xl border border-[#2a3140] bg-[#151a24] px-4 py-4 text-sm">
        <p className="font-medium text-[var(--accent)]">You&apos;re in</p>
        <p className="mt-2 text-[var(--foreground)]">League: {success.leagueName}</p>
        <p className="mt-1 text-[var(--foreground)]">Team: {success.teamName}</p>
        <div className="mt-4 flex flex-col gap-2">
          <Link
            href={`/draft/${success.leagueId}`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--accent)] px-3 py-2 text-center text-sm font-semibold text-zinc-950 no-underline hover:opacity-90"
          >
            Open draft room
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#2a3140] px-3 py-2 text-center text-sm text-[var(--foreground)] no-underline hover:bg-[#1a1f2e]"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--muted)]">Invite code</span>
        <input
          name="inviteCode"
          required
          autoComplete="off"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          className="rounded-lg border border-[#2a3140] bg-[#151a24] px-3 py-2 font-mono tracking-wider text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--muted)]">Your team name</span>
        <input
          name="teamName"
          required
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          className="rounded-lg border border-[#2a3140] bg-[#151a24] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
        />
      </label>
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-50"
      >
        {pending ? "Joining…" : "Join with code"}
      </button>
    </form>
  );
}
