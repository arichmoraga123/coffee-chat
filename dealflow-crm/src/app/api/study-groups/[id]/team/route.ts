import { NextResponse } from "next/server";
import { getUserIdFromSession } from "@/lib/auth";
import { setTeam } from "@/lib/group-competition";

/** Make this group the one you earn competition points for. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const r = await setTeam(userId, id);
  return "error" in r ? NextResponse.json(r, { status: 400 }) : NextResponse.json(r);
}
