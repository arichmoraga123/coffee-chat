import { prisma } from "@/lib/prisma";

/** Resolve the club dashboard context: membership first, then first club at user's school, then PE@Broad. */
export async function resolveClubIdForUser(userId: string): Promise<string | null> {
  const membership = await prisma.clubMember.findFirst({
    where: { userId },
    orderBy: { joinedAt: "asc" },
    select: { clubId: true },
  });
  if (membership) return membership.clubId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { schoolId: true, email: true },
  });
  if (!user) return null;

  if (user.schoolId) {
    const c = await prisma.club.findFirst({
      where: { schoolId: user.schoolId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (c) return c.id;
  }

  const domain = user.email.split("@")[1]?.toLowerCase();
  if (domain) {
    const school = await prisma.school.findUnique({
      where: { domain },
      select: { id: true },
    });
    if (school) {
      const c = await prisma.club.findFirst({
        where: { schoolId: school.id },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (c) return c.id;
    }
  }

  const broad = await prisma.club.findFirst({ where: { name: "PE@Broad" }, select: { id: true } });
  return broad?.id ?? null;
}

export const OFFICER_ROLES = new Set(["president", "vp", "sector_head"]);

export async function userClubRole(userId: string, clubId: string): Promise<string | null> {
  const row = await prisma.clubMember.findUnique({
    where: { clubId_userId: { clubId, userId } },
    select: { role: true },
  });
  return row?.role ?? null;
}

export async function isClubOfficer(userId: string, clubId: string): Promise<boolean> {
  const role = await userClubRole(userId, clubId);
  return role != null && OFFICER_ROLES.has(role);
}
