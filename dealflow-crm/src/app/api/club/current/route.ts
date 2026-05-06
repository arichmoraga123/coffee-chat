import { NextResponse } from "next/server";
import { getUserIdFromSession } from "@/lib/auth";
import { resolveClubIdForUser } from "@/lib/club-server";
import { getClubDashboardPayload } from "@/lib/club-data";

export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clubId = await resolveClubIdForUser(userId);
  if (!clubId) return NextResponse.json({ clubId: null, dashboard: null });

  const dashboard = await getClubDashboardPayload(clubId, userId);
  return NextResponse.json({ clubId, dashboard });
}
