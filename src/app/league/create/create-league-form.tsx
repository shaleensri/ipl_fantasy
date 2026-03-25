"use client";

import Link from "next/link";
import { useState } from "react";

const primaryBtn =
  "rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-50";

export function CreateLeagueForm() {
  const [name, setName] = useState("");
  const [myTeamName, setMyTeamName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    inviteCode: string;
    leagueName: string;
    leagueId: string;
  } | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setPending(true);
    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          myTeamName,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        inviteCode?: string;
        leagueName?: string;
        leagueId?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not create league.");
        return;
      }
      if (data.inviteCode && data.leagueName && data.leagueId) {
        setSuccess({
          inviteCode: data.inviteCode,
          leagueName: data.leagueName,
          leagueId: data.leagueId,
        });
      }
      setName("");
      setMyTeamName("");
    } finally {
      setPending(false);
    }
  }

  if (success) {
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/league/join?code=${encodeURIComponent(success.inviteCode)}`
        : "";

    return (
      <div className="mt-8 rounded-xl border border-[#2a3140] bg-[#151a24] px-4 py-4 text-sm">
        <p className="font-medium text-[var(--accent)]">League created</p>
        <p className="mt-2 text-[var(--foreground)]">
          <span className="text-[var(--muted)]">Name:</span> {success.leagueName}
        </p>
        <p className="mt-2 text-[var(--foreground)]">
          <span className="text-[var(--muted)]">Invite code:</span>{" "}
          <span className="font-mono tracking-wider">{success.inviteCode}</span>
        </p>
        <p className="mt-3 text-[var(--muted)]">
          Share this link so friends can join (they will need an account):
        </p>
        <p className="mt-1 break-all font-mono text-xs text-[var(--foreground)]">
          {shareUrl}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Link
            href={`/draft/${success.leagueId}`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--accent)] px-3 py-2 text-center text-sm font-semibold text-zinc-950 no-underline hover:opacity-90"
          >
            Open draft room
          </Link>
          <Link
            href={`/league/join?code=${encodeURIComponent(success.inviteCode)}`}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#2a3140] px-3 py-2 text-center text-sm text-[var(--foreground)] no-underline hover:bg-[#1a1f2e]"
          >
            Open join page
          </Link>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-[#2a3140] px-3 py-2 text-center text-sm text-[var(--foreground)] no-underline hover:bg-[#1a1f2e]"
            >
              Back to home
            </Link>
            <button
              type="button"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-[#2a3140] px-3 py-2 text-center text-sm text-[var(--foreground)] hover:bg-[#1a1f2e]"
              onClick={() => setSuccess(null)}
            >
              Create another league
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--muted)]">League name</span>
        <input
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-[#2a3140] bg-[#151a24] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--muted)]">Your team name</span>
        <input
          name="myTeamName"
          required
          value={myTeamName}
          onChange={(e) => setMyTeamName(e.target.value)}
          className="rounded-lg border border-[#2a3140] bg-[#151a24] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
        />
      </label>
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? "Creating league…" : "Create league"}
      </button>
    </form>
  );
}
