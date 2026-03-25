import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/auth";
import { JoinLeagueForm } from "./join-league-form";

export default async function JoinLeaguePage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-xl font-semibold">Join league</h1>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Sign in with the account you want to play as, then enter the invite code from
          your commissioner.
        </p>
        <Link
          href="/login?callbackUrl=/league/join"
          className="mt-6 inline-block rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-[#04120f] no-underline"
        >
          Sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-xl font-semibold">Join league</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        One team per account per league. Invite links look like{" "}
        <span className="font-mono text-xs text-[var(--foreground)]">
          /league/join?code=XXXXXXXX
        </span>
        .
      </p>
      <p className="mt-2 text-sm text-[var(--foreground)]">
        Signed in as {session.user.email}
      </p>
      <Suspense
        fallback={<p className="mt-8 text-sm text-[var(--muted)]">Loading form…</p>}
      >
        <JoinLeagueForm />
      </Suspense>
    </main>
  );
}
