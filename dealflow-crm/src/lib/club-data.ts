import { prisma } from "@/lib/prisma";
import { isClubOfficer } from "@/lib/club-server";

export async function getClubDashboardPayload(clubId: string, userId: string) {
  const now = new Date();
  const [
    club,
    memberCount,
    officers,
    pinnedAnnouncements,
    upcomingEvents,
    recentPosts,
    activeProjects,
  ] = await Promise.all([
    prisma.club.findUnique({
      where: { id: clubId },
      include: { school: { select: { name: true, shortName: true, domain: true } } },
    }),
    prisma.clubMember.count({ where: { clubId } }),
    prisma.clubMember.findMany({
      where: { clubId, role: { in: ["president", "vp", "sector_head"] } },
      include: { user: { select: { id: true, name: true, email: true, careerTracks: true } } },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.clubAnnouncement.findMany({
      where: { clubId, isPinned: true },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { author: { select: { name: true } } },
    }),
    prisma.clubEvent.findMany({
      where: { clubId, date: { gte: now } },
      orderBy: { date: "asc" },
      take: 3,
    }),
    prisma.clubPost.findMany({
      where: { clubId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { author: { select: { name: true } } },
    }),
    prisma.clubProject.findMany({
      where: { clubId, status: "active" },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { deliverables: true },
    }),
  ]);

  const viewerOfficer = await isClubOfficer(userId, clubId);

  return {
    club,
    memberCount,
    officers: officers.map((o) => ({
      role: o.role,
      name: o.user.name,
      email: viewerOfficer ? o.user.email : undefined,
      careerTracks: o.user.careerTracks,
    })),
    pinnedAnnouncements,
    upcomingEvents,
    recentPosts,
    activeProjects,
    viewerOfficer,
  };
}
