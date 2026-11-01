import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { peBroadMembership } from "@/lib/club-social";
import { activityText } from "@/lib/club-profiles";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Reactions } from "@/components/club/reactions";
import { FirmSharePrompt } from "@/components/club/sharing-controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Activity" };

export default async function ActivityPage() {
  const userId = await requireUserId();
  const m = await peBroadMembership(userId);
  if (!m) return <EmptyState title="The activity feed is for PE@Broad members." />;
  const [items, me] = await Promise.all([
    prisma.clubActivity.findMany({
      where: { clubId: m.clubId, user: { deletedAt: null } },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        id: true,
        kind: true,
        data: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
        reactions: { select: { userId: true, emoji: true } },
      },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { shareFirms: true } }),
  ]);
  return (
    <div className="max-w-[780px] space-y-4">
      {me?.shareFirms === null ? <FirmSharePrompt /> : null}
      {items.length === 0 ? (
        <EmptyState title="No activity yet." description="Lesson completions, challenge results, and streak milestones show up here." />
      ) : (
        <ul className="divide-y divide-divider rounded-[var(--radius-lg)] border border-border bg-surface">
          {items.map((a) => (
            <li key={a.id} className="flex gap-3 px-5 py-4">
              <Avatar name={a.user.name} size={32} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink">
                  <Link href={`/club/pe-broad/members/${a.user.id}`} className="font-medium hover:underline">
                    {a.user.name}
                  </Link>{" "}
                  <span className="text-ink-2">{activityText(a.kind, a.data as Record<string, unknown>)}</span>
                </p>
                <p className="mt-0.5 text-[13px] text-ink-3">{formatDistanceToNow(a.createdAt, { addSuffix: true })}</p>
                <Reactions activityId={a.id} reactions={a.reactions} me={userId} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
