import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { clubViewer, lessonOptions, visiblePost } from "@/lib/club-view";
import { TYPE_LABEL, audienceLabel, publicFiles, type PostType } from "@/lib/club-publish";
import { ContentBrowser } from "@/components/club/content-browser";
import { EmptyState } from "@/components/ui/empty-state";
import { PostToClubButton } from "@/components/club/publish-dialog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Club content" };

const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export default async function ClubContentPage() {
  const userId = await requireUserId();
  const v = await clubViewer(userId);
  if (!v) return <p className="text-sm text-ink-2">No club context.</p>;
  const rows = await prisma.clubPost.findMany({
    where: { clubId: v.clubId, ...(v.canPost ? {} : { archivedAt: null }) },
    orderBy: [{ archivedAt: { sort: "desc", nulls: "first" } }, { isPinned: "desc" }, { createdAt: "desc" }],
    include: { author: { select: { name: true } }, progress: { where: { userId }, select: { doneAt: true } } },
  });
  const today = new Date().toISOString().slice(0, 10);
  const items = rows
    .filter((p) => visiblePost(v, p))
    .map((p) => ({
      id: p.id,
      type: p.type,
      typeLabel: TYPE_LABEL[p.type as PostType] ?? p.type,
      title: p.title,
      author: p.author.name,
      posted: fmt(p.createdAt),
      due: p.dueDate ? fmt(p.dueDate) : null,
      overdue: Boolean(p.dueDate && p.dueDate.toISOString().slice(0, 10) < today),
      done: Boolean(p.progress[0]?.doneAt),
      allowDone: p.allowDone,
      files: publicFiles(p.files).length,
      tags: p.tags,
      archived: Boolean(p.archivedAt),
      audience: v.canPost ? audienceLabel(p.audience) : null,
    }));
  return (
    <div className="space-y-4">
      <h2 className="section-title">Content</h2>
      {items.length || !v.canPost ? (
        <ContentBrowser items={items} showArchived={v.canPost} />
      ) : (
        <EmptyState title="No content yet" description="Share resources, assignments, readings and case studies with members." action={<PostToClubButton isAdmin={v.isAdmin} lessons={lessonOptions()} label="Add content" type="resource" variant="secondary" />} />
      )}
    </div>
  );
}
