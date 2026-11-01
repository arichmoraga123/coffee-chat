import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { announcementInput, clubViewer, lessonOptions } from "@/lib/club-view";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SimpleMarkdown } from "@/components/ui/simple-markdown";
import { ClubMarkReadAnnouncementButton } from "@/components/club-mark-read-button";
import { ItemAdminMenu } from "@/components/club/item-admin-menu";
import { PostToClubButton } from "@/components/club/publish-dialog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Announcements" };

export default async function ClubAnnouncementsPage() {
  const userId = await requireUserId();
  const v = await clubViewer(userId);
  if (!v) return <p className="text-sm text-ink-2">No club context.</p>;
  const rows = await prisma.clubAnnouncement.findMany({
    where: { clubId: v.clubId },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    include: { author: { select: { name: true } } },
  });
  const lessons = v.canPost ? lessonOptions() : [];
  if (!rows.length) {
    return (
      <EmptyState
        title="No announcements yet"
        description={v.canPost ? "Post news, deadlines and reminders. Pin one to the Overview." : "Officer announcements show up here."}
        action={v.canPost ? <PostToClubButton isAdmin={v.isAdmin} lessons={lessons} label="Add announcement" type="announcement" variant="secondary" /> : undefined}
      />
    );
  }
  return (
    <div className="space-y-3">
      <h2 className="section-title">Announcements</h2>
      {rows.map((a) => (
        <Card key={a.id} id={a.id} className="scroll-mt-6 p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {a.isPinned ? <span className="mb-1 inline-block rounded bg-accent-tint px-2 py-0.5 text-xs font-semibold text-accent">Pinned</span> : null}
              <h3 className="text-base font-semibold text-ink">{a.title}</h3>
              <p className="text-[13px] text-ink-3">
                {a.author.name} · {a.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" })}
                {v.canPost ? ` · ${a.readBy.length} read` : ""}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-1">
              {v.canPost ? <ItemAdminMenu target={{ kind: "announcement", id: a.id, input: announcementInput(a) }} isAdmin={v.isAdmin} lessons={lessons} pinned={a.isPinned} /> : null}
              <ClubMarkReadAnnouncementButton id={a.id} read={a.readBy.includes(userId)} />
            </div>
          </div>
          <SimpleMarkdown text={a.body} className="mt-3 text-sm leading-relaxed text-ink-2" />
        </Card>
      ))}
    </div>
  );
}
