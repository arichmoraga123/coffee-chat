import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

function utcDayString(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addUtcDays(dayStr: string, delta: number) {
  const [y, m, d] = dayStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return utcDayString(dt);
}

/** Call when user finishes a drill session (any activity counts as a drill day). */
export async function POST() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = utcDayString(new Date());
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { drillStreak: true, lastDrillDay: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.lastDrillDay === today) {
    return NextResponse.json({ drillStreak: user.drillStreak, lastDrillDay: user.lastDrillDay });
  }

  let nextStreak = 1;
  if (user.lastDrillDay) {
    const yesterday = addUtcDays(today, -1);
    if (user.lastDrillDay === yesterday) {
      nextStreak = user.drillStreak + 1;
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { drillStreak: nextStreak, lastDrillDay: today },
    select: { drillStreak: true, lastDrillDay: true },
  });
  return NextResponse.json(updated);
}
