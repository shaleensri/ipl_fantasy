import Link from "next/link";
import { auth } from "@/auth";

export default async function CreateLeaguePage() {
  const session = await auth();

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-xl font-semibold">Create league</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Next: generate invite code and persist{" "}
        <code className="rounded bg-[#151a24] px-1">League</code> with{" "}
        <code className="rounded bg-[#151a24] px-1">commissionerId</code> = your user
        id. Commissioner flows should require{" "}
        <code className="rounded bg-[#151a24] px-1">ADMIN</code> role — see{" "}
        <code className="rounded bg-[#151a24] px-1">canManageLeagueAsCommissioner</code>
        .
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
