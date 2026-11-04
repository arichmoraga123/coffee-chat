import { NextResponse } from "next/server";
import { getUserIdFromSession } from "@/lib/auth";
import { leaveGroup } from "@/lib/group-competition";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await leaveGroup(userId, id);
  return NextResponse.json({ ok: true });
}
