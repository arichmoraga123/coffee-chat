import { NextResponse } from "next/server";
import { getUserIdFromSession } from "@/lib/auth";
import { completeReferralForUser } from "@/lib/referrals";

export async function POST() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const done = await completeReferralForUser(userId);
  return NextResponse.json({ ok: true, referrerName: done?.referrerName ?? null });
}
