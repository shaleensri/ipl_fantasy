import Link from "next/link";
import { auth } from "@/auth";
import { CreateLeagueForm } from "./create-league-form";

export default async function CreateLeaguePage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <p className="text-sm">
          <Link href="/" className="text-[var(--accent)] no-underline hover:underline">
            ← Home
          </Link>
        </p>
        <h1 className="mt-4 text-xl font-semibold">Create league</h1>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Sign in to create a league. You&apos;ll become commissioner and get an invite
          code to share.
        </p>
        <Link
          href="/login?callbackUrl=/league/create"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-zinc-950 no-underline hover:opacity-90"
        >
          Sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <p className="text-sm">
        <Link href="/" className="text-[var(--accent)] no-underline hover:underline">
          ← Home
        </Link>
      </p>
      <h1 className="mt-4 text-xl font-semibold">Create league</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        You&apos;ll be the commissioner. We create your team, a draft shell, and a short
        invite code friends can use on{" "}
        <Link href="/league/join" className="text-[var(--accent)]">
          Join with invite code
        </Link>
        .
      </p>
      <p className="mt-2 text-sm text-[var(--foreground)]">
        Signed in as {session.user.email}
      </p>
      <CreateLeagueForm />
    </main>
  );
}
