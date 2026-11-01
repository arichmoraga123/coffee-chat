import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin-auth";
import { ensureWeeklyChallenge } from "@/lib/challenges";
import { getPeBroadClub } from "@/lib/club-roster";

/** Admin override: replace this week's club challenge topic (only before anyone has started it). */
export async function POST(req: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;
  const parsed = z
    .object({
      modules: z.array(z.number().int()).optional(),
      lessons: z.array(z.string()).optional(),
      difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
      label: z.string().max(120).optional(),
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const club = await getPeBroadClub();
  const r = await ensureWeeklyChallenge(club.id, parsed.data, auth.userId);
  if ("error" in r) return NextResponse.json(r, { status: 409 });
  return NextResponse.json({ id: r.id });
}
