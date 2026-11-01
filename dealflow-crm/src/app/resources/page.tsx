import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { ResourcesView } from "@/components/resources-view";
import { clubViewer, publicFiles, visiblePost } from "@/lib/club-view";
import { ClubResourcesSection } from "@/components/club/club-resources-section";

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const userId = await requireUserId();
  const [rows, v] = await Promise.all([prisma.resourceBookmark.findMany({ where: { userId }, select: { resourceSlug: true } }), clubViewer(userId)]);
  let club: React.ReactNode = null;
  if (v) {
    const member = v.canPost || (await prisma.clubMember.findUnique({ where: { clubId_userId: { clubId: v.clubId, userId } }, select: { active: true } }))?.active;
    if (member) {
      const posts = await prisma.clubPost.findMany({
        where: { clubId: v.clubId, type: "resource", archivedAt: null },
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { author: { select: { name: true } } },
      });
      const items = posts
        .filter((p) => visiblePost(v, p))
        .map((p) => ({
          id: p.id,
          title: p.title,
          author: p.author.name,
          posted: p.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }),
          files: publicFiles(p.files).length,
          tags: p.tags,
          snippet: p.content.slice(0, 300),
        }));
      if (items.length) club = <ClubResourcesSection items={items} />;
    }
  }
  return (
    <div className="space-y-6">
      {club}
      <ResourcesView initialBookmarkSlugs={rows.map((r) => r.resourceSlug)} />
    </div>
  );
}
