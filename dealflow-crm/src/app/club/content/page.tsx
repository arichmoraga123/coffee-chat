import { requireUserId } from "@/lib/auth";
import { resolveClubIdForUser } from "@/lib/club-server";
import { prisma } from "@/lib/prisma";
import { ClubContentTabs } from "@/components/club-content-tabs";

export const dynamic = "force-dynamic";

export default async function ClubContentPage() {
  const userId = await requireUserId();
  const clubId = await resolveClubIdForUser(userId);
  if (!clubId) return <p className="text-sm text-zinc-400">No club context.</p>;

  const rows = await prisma.clubPost.findMany({
    where: { clubId },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    include: { author: { select: { name: true } } },
  });

  const posts = rows.map((p) => ({
    id: p.id,
    title: p.title,
    type: p.type,
    dueDate: p.dueDate ? p.dueDate.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    readBy: p.readBy,
    author: p.author,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-50">Club content</h1>
      <ClubContentTabs posts={posts} userId={userId} />
    </div>
  );
}
