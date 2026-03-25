import { redirect } from "next/navigation";

/** Legacy stub URL — draft UI lives at `/draft/[leagueId]`. */
export default function DraftDemoRedirectPage() {
  redirect("/");
}
