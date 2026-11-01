import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { applyRepair, moveToNetwork, planRepair } from "@/lib/data-repair";
import { syncFollowupTasks } from "@/lib/followup-tasks";

/** GET = what would change for me. POST { action: "dates" | "network" } = do it. */
export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [plan] = await planRepair(prisma, userId);
  return NextResponse.json({
    interactions: plan?.interactionsToRemove.length ?? 0,
    dates: plan?.datesToReset.length ?? 0,
    network: plan?.networkCandidates.length ?? 0,
  });
}

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({ action: z.enum(["dates", "network"]) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const [plan] = await planRepair(prisma, userId);
  if (!plan) return NextResponse.json({ changed: 0 });
  let changed = 0;
  if (parsed.data.action === "dates") {
    await applyRepair(prisma, plan);
    changed = plan.datesToReset.length + plan.interactionsToRemove.length;
  } else {
    changed = await moveToNetwork(prisma, userId, plan.networkCandidates);
  }
  await syncFollowupTasks(userId);
  return NextResponse.json({ changed });
}
