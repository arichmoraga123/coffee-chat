import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-auth";
import { runDaily } from "@/lib/daily";

export const maxDuration = 300;

/** Every day about 8:30 AM Eastern (vercel.json): digests, mentor reminders, event reminders, Trash purge. */
export async function GET(req: Request) {
  const denied = requireCronSecret(req);
  if (denied) return denied;
  return NextResponse.json(await runDaily());
}
