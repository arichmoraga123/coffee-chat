import { prisma } from "@/lib/prisma";

export async function completeReferralForUser(userId: string) {
  const pending = await prisma.referral.findFirst({
    where: { refereeId: userId, status: "pending" },
    include: { referrer: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  if (!pending || pending.xpAwarded) return null;

  await prisma.$transaction([
    prisma.referral.update({
      where: { id: pending.id },
      data: { status: "completed", xpAwarded: true },
    }),
    prisma.user.update({
      where: { id: pending.referrer.id },
      data: { xp: { increment: 200 }, weeklyXP: { increment: 200 } },
    }),
  ]);
  return { referrerName: pending.referrer.name };
}
