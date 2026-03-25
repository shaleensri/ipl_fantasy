import { DraftRoomClient } from "./draft-room-client";

type Props = { params: Promise<{ leagueId: string }> };

export default async function DraftRoomPage({ params }: Props) {
  const { leagueId } = await params;
  return <DraftRoomClient leagueId={leagueId} />;
}
