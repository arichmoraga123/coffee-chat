import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      xp: true,
      weeklyXP: true,
      drillStreak: true,
      recruitingTarget: true,
      targetFirms: true,
      dailyGoal: true,
      onboardingDone: true,
      role: true,
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pendingSubmissions = await prisma.question.count({
    where: { submittedById: userId, status: "pending" },
  });

  return NextResponse.json({ ...user, pendingSubmissions });
}

export async function PATCH(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }
  if (Array.isArray(body.recruitingTarget)) {
    data.recruitingTarget = body.recruitingTarget.map((x: unknown) => String(x));
  }
  if (Array.isArray(body.targetFirms)) {
    data.targetFirms = body.targetFirms.map((x: unknown) => String(x));
  }
  if (typeof body.dailyGoal === "number" && [5, 10, 20].includes(body.dailyGoal)) {
    data.dailyGoal = body.dailyGoal;
  }
  if (typeof body.onboardingDone === "boolean") {
    data.onboardingDone = body.onboardingDone;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      name: true,
      email: true,
      recruitingTarget: true,
      targetFirms: true,
      dailyGoal: true,
      onboardingDone: true,
    },
  });

  return NextResponse.json(user);
}
