import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export function requireCronSecret(req: Request): NextResponse | null {
  const secret = env.cronSecret;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
