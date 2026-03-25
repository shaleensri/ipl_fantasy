import Link from "next/link";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { getMyLeagueMemberships } from "@/server/leagues";

/** Primary CTA — high contrast label on accent (avoids “missing” or faint button text). */
const primaryBtn =
  "inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-3 text-center text-sm font-semibold text-zinc-950 no-underline hover:opacity-90 sm:w-auto";

const secondaryBtn =
  "inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#2a3140] px-4 py-3 text-center text-sm font-medium text-[var(--foreground)] no-underline hover:bg-[#151a24] sm:w-auto";

export default async function HomePage() {
  const session = await auth();
  const memberships =
    session?.user?.id != null
      ? await getMyLeagueMemberships(session.user.id)
      : [];
  const hasLeague = memberships.length > 0;

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-10 pt-8">
      <p className="text-sm text-[var(--muted)]">Mobile-first · web only</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">IPL Fantasy Draft</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">
        Snake draft, head-to-head gameweeks aligned to IPL slates, trades, and waivers —
        for a private group of friends.
      </p>

      {session?.user ? (
        <div className="mt-6 rounded-xl border border-[#2a3140] bg-[#151a24] px-4 py-3 text-sm">
          <p className="text-[var(--foreground)]">
            Signed in as <span className="font-medium">{session.user.email}</span>
            {session.user.name ? ` (${session.user.name})` : ""}
          </p>
          <p className="mt-2 text-[var(--muted)]">
            <span className="text-[var(--foreground)]">Role:</span>{" "}
            <span className="text-[var(--accent)]">
              {session.user.role === "ADMIN" ? "Admin & player" : "Player"}
            </span>
          </p>
          <div className="mt-3">
            <SignOutButton />
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:gap-3">
          <Link href="/login" className={secondaryBtn}>
            Sign in
          </Link>
          <Link href="/register" className={primaryBtn}>
            Create account
          </Link>
        </div>
      )}

      {session?.user && memberships.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Your leagues
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {memberships.map((m) => {
              const isCommissioner = m.league.commissionerId === session.user!.id;
              return (
                <li
                  key={m.id}
                  className="rounded-xl border border-[#2a3140] bg-[#151a24] px-4 py-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium text-[var(--foreground)]">{m.league.name}</p>
                    {isCommissioner && (
                      <span className="rounded bg-[#1e2633] px-2 py-0.5 text-xs text-[var(--muted)]">
                        Commissioner
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Your team: <span className="text-[var(--foreground)]">{m.teamName}</span>
                  </p>
                  <Link
                    href={`/draft/${m.leagueId}`}
                    className={`${primaryBtn} mt-3 w-full`}
                  >
                    Open draft room
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <nav className="mt-10 flex flex-col gap-3">
        {session?.user && !hasLeague && (
          <Link href="/league/create" className={primaryBtn}>
            Create a league
          </Link>
        )}
        {session?.user && (
          <Link href="/league/join" className={secondaryBtn}>
            Join with invite code
          </Link>
        )}
        {!session?.user && (
          <p className="text-sm text-[var(--muted)]">
            <Link href="/login" className="text-[var(--accent)] no-underline hover:underline">
              Sign in
            </Link>{" "}
            to create or join a league.
          </p>
        )}
      </nav>

      <p className="mt-auto pt-12 text-xs text-[var(--muted)]">
        Credentials sign-in with JWT session. Use <strong className="text-[var(--foreground)]">Open draft room</strong>{" "}
        after seeding players (<code className="rounded bg-[#151a24] px-1">npm run db:seed</code>).
      </p>
    </main>
  );
}
