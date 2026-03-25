import Link from "next/link";
import { auth } from "@/auth";

export default async function JoinLeaguePage() {
  const session = await auth();

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-xl font-semibold">Join league</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Next: enter short code + team name; create{" "}
        <code className="rounded bg-[#151a24] px-1">Team</code> with{" "}
        <code className="rounded bg-[#151a24] px-1">userId</code> = your account (each
        user can have their own team per league).
      </p>
      {session?.user ? (
        <p className="mt-4 text-sm text-[var(--foreground)]">
          Logged in as {session.user.email} · role {session.user.role}
        </p>
      ) : (
        <p className="mt-4 text-sm text-red-400">
          You should not see this without signing in — try{" "}
          <Link href="/login" className="text-[var(--accent)]">
            Sign in
          </Link>
          .
        </p>
      )}
    </main>
  );
}
