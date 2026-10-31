import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { refreshNewsFromApi } from "@/lib/news-ingest";

export const maxDuration = 300;

/** ADMIN — pull the latest news now and auto-publish real transactions with dollar values. */
export async function POST() {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;
  const result = await refreshNewsFromApi();
  return NextResponse.json(result);
}
