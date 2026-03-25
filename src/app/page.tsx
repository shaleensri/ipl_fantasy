import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-10 pt-8">
      <p className="text-sm text-[var(--muted)]">Mobile-first · web only</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">IPL Fantasy Draft</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">
        Snake draft, head-to-head gameweeks aligned to IPL slates, trades, and waivers —
        for a private group of friends.
      </p>

      <nav className="mt-10 flex flex-col gap-3">
        <Link
          href="/league/create"
          className="rounded-xl bg-[var(--accent)] px-4 py-3 text-center text-sm font-medium text-[#04120f] no-underline hover:opacity-90"
        >
          Create a league
        </Link>
        <Link
          href="/league/join"
          className="rounded-xl border border-[#2a3140] px-4 py-3 text-center text-sm font-medium text-[var(--foreground)] no-underline hover:bg-[#151a24]"
        >
          Join with code
        </Link>
        <Link
          href="/draft/demo"
          className="text-center text-sm text-[var(--muted)] no-underline hover:text-[var(--foreground)]"
        >
          Draft room (stub)
        </Link>
      </nav>

      <p className="mt-auto pt-12 text-xs text-[var(--muted)]">
        Phase 1+: auth, DB migrations, realtime draft, autopick worker, scoring jobs.
      </p>
    </main>
  );
}
