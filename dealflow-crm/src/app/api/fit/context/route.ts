import { NextResponse } from "next/server";
import { getUserIdFromSession } from "@/lib/auth";
import { fitContext } from "@/lib/fit-server";

/** GET ?kind=firm|city|group&value= → interactions, city contacts, Group Finder result for the answer builder. */
export async function GET(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  return NextResponse.json(await fitContext(userId, sp.get("kind") ?? "", (sp.get("value") ?? "").slice(0, 200)));
}
