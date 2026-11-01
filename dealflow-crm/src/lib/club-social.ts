import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PE_BROAD_NAME } from "@/lib/club-roster";

/** Active PE@Broad membership for a user who isn't soft-deleted, or null. */
export async function peBroadMembership(userId: string): Promise<{ clubId: string; role: string } | null> {
  const m = await prisma.clubMember.findFirst({
    where: { userId, active: true, club: { name: PE_BROAD_NAME }, user: { deletedAt: null, accountActive: true } },
    select: { clubId: true, role: true },
  });
  return m;
}

/** Who can show up on social surfaces (standings, directory, DMs, challenges): active roster members only. */
export const SOCIAL_USER_WHERE: Prisma.UserWhereInput = { deletedAt: null, accountActive: true };

/**
 * Points are only earned once an account is verified: a verified .edu email, an active PE@Broad
 * membership (the roster is the club's own verification), or an admin/mentor account.
 */
export async function canEarnXp(userId: string, db: Prisma.TransactionClient | typeof prisma = prisma): Promise<boolean> {
  const u = await db.user.findUnique({
    where: { id: userId },
    select: { eduVerified: true, role: true, deletedAt: true, accountActive: true, clubMemberships: { where: { active: true }, select: { id: true }, take: 1 } },
  });
  if (!u || u.deletedAt || !u.accountActive) return false;
  return u.eduVerified || u.role === "ADMIN" || u.role === "MENTOR" || u.clubMemberships.length > 0;
}

/** Adds an item to the PE@Broad activity feed if the user is a member. Never throws. */
export async function postClubActivity(userId: string, kind: string, data: Record<string, unknown> = {}) {
  try {
    const m = await peBroadMembership(userId);
    if (!m) return;
    await prisma.clubActivity.create({ data: { clubId: m.clubId, userId, kind, data: data as Prisma.InputJsonValue } });
  } catch (e) {
    console.error("club activity failed", e);
  }
}

export const STREAK_MILESTONES = new Set([7, 30, 100]);
