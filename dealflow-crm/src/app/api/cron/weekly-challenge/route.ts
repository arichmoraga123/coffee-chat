import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-auth";
import { ensureWeeklyChallenge } from "@/lib/challenges";
import { getPeBroadClub } from "@/lib/club-roster";

/** Mondays: create the PE@Broad weekly challenge (10 questions weighted toward last week's weakest lessons). */
export async function GET(req: Request) {
  const denied = requireCronSecret(req);
  if (denied) return denied;
  const club = await getPeBroadClub();
  const r = await ensureWeeklyChallenge(club.id);
  return NextResponse.json("error" in r ? r : { ok: true, id: r.id });
}
