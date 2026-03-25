type Props = { params: Promise<{ leagueId: string }> };

export default async function DraftRoomPage({ params }: Props) {
  const { leagueId } = await params;
  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-xl font-semibold">Draft room</h1>
      <p className="mt-1 font-mono text-sm text-[var(--accent)]">{leagueId}</p>
      <p className="mt-3 text-sm text-[var(--muted)]">
        Stub — Phase 3: server clock, snake order, picks, WebSocket or poll, autopick on{" "}
        <code className="rounded bg-[#151a24] px-1">pick_deadline_at</code>.
      </p>
    </main>
  );
}
