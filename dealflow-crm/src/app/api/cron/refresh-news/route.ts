import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-auth";
import { refreshNewsFromApi } from "@/lib/news-ingest";

export async function GET(req: Request) {
  const denied = requireCronSecret(req);
  if (denied) return denied;
  const result = await refreshNewsFromApi();
  return NextResponse.json(result);
}
