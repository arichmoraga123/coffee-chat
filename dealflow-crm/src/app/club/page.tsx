import Link from "next/link";
import { format } from "date-fns";
import { requireUserId } from "@/lib/auth";
import { resolveClubIdForUser } from "@/lib/club-server";
import { getClubDashboardPayload } from "@/lib/club-data";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { PE_BROAD_NAME } from "@/lib/club-roster";
import { JoinPeBroadButton } from "@/components/club/join-pebroad-button";
import { SimpleMarkdown } from "@/components/ui/simple-markdown";
import { clubViewer, fmtEt, visiblePost } from "@/lib/club-view";
import { TYPE_LABEL, type PostType } from "@/lib/club-publish";

/** Verified @msu.edu students who aren't PE@Broad members can ask to join. */
async function peBroadJoinState(userId: string) {
  const [user, club] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { eduEmail: true, eduVerified: true } }),
    prisma.club.findFirst({ where: { name: PE_BROAD_NAME }, select: { id: true } }),
  ]);
  if (!club || !user?.eduVerified || !user.eduEmail?.toLowerCase().endsWith("@msu.edu")) return null;
  const [member, request] = await Promise.all([
    prisma.clubMember.findUnique({ where: { clubId_userId: { clubId: club.id, userId } }, select: { active: true } }),
    prisma.clubJoinRequest.findUnique({ where: { clubId_userId: { clubId: club.id, userId } }, select: { status: true } }),
  ]);
  if (member?.active) return null;
  return request?.status === "pending" ? "pending" : request?.status === "denied" ? "denied" : "none";
}

export const dynamic = "force-dynamic";

export default async function ClubHubPage() {
  const userId = await requireUserId();
  const [clubId, joinState] = await Promise.all([resolveClubIdForUser(userId), peBroadJoinState(userId)]);
  const joinBanner = joinState ? (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent bg-accent-tint p-4">
      <p className="text-sm text-ink">You&apos;re not on the PE@Broad roster yet.</p>
      <JoinPeBroadButton initialStatus={joinState} />
    </div>
  ) : null;
  if (!clubId) {
    return joinBanner ?? (
      <p className="text-sm text-ink-2">
        No club is linked yet. Set your school in onboarding or ask an officer to add you to your club roster.
      </p>
    );
  }

  const d = await getClubDashboardPayload(clubId, userId);
  if (!d.club) {
    return <p className="text-sm text-ink-2">Club could not be loaded.</p>;
  }
  const v = await clubViewer(userId);
  const now = new Date();
  const [pinned, nextEvent, posts] = await Promise.all([
    prisma.clubAnnouncement.findFirst({ where: { clubId, isPinned: true }, orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } }),
    prisma.clubEvent.findFirst({ where: { clubId, date: { gte: now }, archivedAt: null }, orderBy: { date: "asc" } }),
    prisma.clubPost.findMany({
      where: { clubId, archivedAt: null },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: { author: { select: { name: true } }, progress: { where: { userId }, select: { doneAt: true } } },
    }),
  ]);
  const visible = v ? posts.filter((p) => visiblePost(v, p)) : posts;
  const newest = visible.slice(0, 3);
  const soon = new Date(now.getTime() + 14 * 86_400_000);
  const openAssignments = visible
    .filter((p) => p.dueDate && p.dueDate <= soon && p.dueDate >= new Date(now.getTime() - 7 * 86_400_000) && !p.progress[0]?.doneAt && p.type !== "resource")
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
    .slice(0, 5);
  const fmtDay = (x: Date) => x.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <div className="space-y-6">
      {joinBanner}
      {d.club.description ? <p className="max-w-2xl text-sm text-ink-2">{d.club.description}</p> : null}

      {pinned ? (
        <Card className="border-accent/40 p-5">
          <p className="text-xs font-semibold text-accent">Pinned announcement</p>
          <p className="mt-1 font-semibold text-ink">{pinned.title}</p>
          <p className="text-[13px] text-ink-3">
            {pinned.author.name} · {format(pinned.createdAt, "MMM d")}
          </p>
          <SimpleMarkdown text={pinned.body.length > 600 ? `${pinned.body.slice(0, 600)}…` : pinned.body} className="mt-2 text-sm text-ink-2" />
          <Link href="/club/announcements" className="mt-2 inline-block text-[13px] text-accent hover:underline">
            All announcements
          </Link>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <Card title="Next event" action={<Link href="/club/events" className="text-accent hover:underline">All events</Link>}>
          {nextEvent ? (
            <div className="space-y-1">
              <p className="font-medium text-ink">{nextEvent.title}</p>
              <p className="text-sm text-ink-2">{fmtEt(nextEvent.date, { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} ET</p>
              {nextEvent.location ? <p className="text-[13px] text-ink-3">{nextEvent.location}</p> : null}
              <p className="text-[13px] text-ink-3">
                {nextEvent.rsvpIds.length} going{nextEvent.rsvpIds.includes(userId) ? " · you're going" : ""}
              </p>
            </div>
          ) : (
            <p className="text-sm text-ink-3">No upcoming events.</p>
          )}
        </Card>
        <Card title="Due soon" action={<Link href="/club/content" className="text-accent hover:underline">Content</Link>}>
          {openAssignments.length ? (
            <ul className="space-y-2 text-sm">
              {openAssignments.map((p) => (
                <li key={p.id} className="flex items-baseline justify-between gap-3">
                  <Link href={`/club/content/${p.id}`} className="min-w-0 text-ink hover:underline [overflow-wrap:anywhere]">
                    {p.title}
                  </Link>
                  <span className={`shrink-0 text-[13px] ${p.dueDate! < now ? "text-warn" : "text-ink-3"}`}>{fmtDay(p.dueDate!)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-3">Nothing due in the next two weeks.</p>
          )}
        </Card>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Newest posts</h2>
          <Link href="/club/content" className="text-[13px] text-accent hover:underline">
            All content
          </Link>
        </div>
        {newest.length ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {newest.map((p) => (
              <Link key={p.id} href={`/club/content/${p.id}`} className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 hover:border-border-strong">
                <p className="text-xs font-semibold text-accent">{TYPE_LABEL[p.type as PostType] ?? p.type}</p>
                <p className="mt-1 text-sm font-medium text-ink [overflow-wrap:anywhere]">{p.title}</p>
                <p className="mt-1 text-[13px] text-ink-3">
                  {p.author.name} · {format(p.createdAt, "MMM d")}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-3">No posts yet.</p>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card title="Active projects" action={<Link href="/club/projects" className="text-accent hover:underline">All projects</Link>}>
          {d.activeProjects.length === 0 ? (
            <p className="text-sm text-ink-3">No active projects.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {d.activeProjects.map((p) => (
                <li key={p.id} className="flex items-baseline justify-between gap-3">
                  <Link href={`/club/projects/${p.id}`} className="text-ink hover:underline">
                    {p.title}
                  </Link>
                  {p.dueDate ? <span className="text-[13px] text-ink-3">Due {format(p.dueDate, "MMM d")}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Officers">
          {d.officers.length === 0 ? (
            <p className="text-sm text-ink-3">No officers listed yet.</p>
          ) : (
            <ul className="space-y-2">
              {d.officers.map((o, i) => (
                <li key={i} className="text-sm text-ink-2">
                  <span className="font-medium text-ink">{o.name}</span> <span className="text-[13px] text-ink-3">· {o.role}</span>
                  {o.email ? <span className="block text-[13px] text-ink-3">{o.email}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
