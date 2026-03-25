import Link from "next/link";

export default function DraftDemoPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-xl font-semibold">Draft room (demo)</h1>
      <p className="mt-3 text-sm text-[var(--muted)]">
        Use a real league id in production:{" "}
        <Link href="/draft/example-league-id" className="text-[var(--accent)]">
          /draft/[leagueId]
        </Link>
      </p>
    </main>
  );
}
