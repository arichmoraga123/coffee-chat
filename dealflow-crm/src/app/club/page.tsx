import Link from "next/link";
import { format } from "date-fns";
import { requireUserId } from "@/lib/auth";
import { resolveClubIdForUser } from "@/lib/club-server";
import { getClubDashboardPayload } from "@/lib/club-data";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { PE_BROAD_NAME } from "@/lib/club-roster";
import { JoinPeBroadButton } from "@/components/club/join-pebroad-button";

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

  return (
    <div className="space-y-6">
      {joinBanner}
      {d.club.description ? <p className="max-w-2xl text-sm text-ink-2">{d.club.description}</p> : null}

      {d.pinnedAnnouncements.length ? (
        <section>
          <h2 className="section-title mb-3">Pinned announcements</h2>
          <div className="space-y-2">
            {d.pinnedAnnouncements.map((a) => (
              <Card key={a.id} className="p-5">
                <p className="text-sm font-medium text-ink">{a.title}</p>
                <p className="mt-1 text-xs text-ink-3">
                  {a.author.name} · {format(a.createdAt, "MMM d, yyyy")}
                </p>
                <p className="mt-2 line-clamp-3 text-sm text-ink-2">{a.body}</p>
                <Link href="/club/announcements" className="mt-2 inline-block text-xs text-accent hover:underline">
                  View all
                </Link>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="section-title">Upcoming events</h2>
          <ul className="mt-3 space-y-2">
            {d.upcomingEvents.length === 0 ? (
              <li className="text-sm text-ink-3">No upcoming events.</li>
            ) : (
              d.upcomingEvents.map((e) => (
                <li key={e.id} className="text-sm text-ink-2">
                  <span className="font-medium text-ink">{e.title}</span>
                  <span className="text-ink-3"> — {format(e.date, "MMM d, h:mm a")}</span>
                </li>
              ))
            )}
          </ul>
          <Link href="/club/events" className="mt-3 inline-block text-xs text-accent hover:underline">
            Calendar & RSVP
          </Link>
        </Card>

        <Card className="p-5">
          <h2 className="section-title">Officer contacts</h2>
          <ul className="mt-3 space-y-2">
            {d.officers.length === 0 ? (
              <li className="text-sm text-ink-3">No officers listed yet.</li>
            ) : (
              d.officers.map((o, i) => (
                <li key={i} className="text-sm text-ink-2">
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] uppercase text-ink-2">{o.role}</span>{" "}
                  <span className="font-medium text-ink">{o.name}</span>
                  {o.email ? <span className="block text-xs text-ink-3">{o.email}</span> : null}
                </li>
              ))
            )}
          </ul>
        </Card>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="section-title">Active projects</h2>
          <Link href="/club/projects" className="text-xs text-accent hover:underline">
            All projects
          </Link>
        </div>
        <div className="space-y-2">
          {d.activeProjects.length === 0 ? (
            <p className="text-sm text-ink-3">No active projects.</p>
          ) : (
            d.activeProjects.map((p) => (
              <Card key={p.id} className="p-4">
                <p className="text-sm font-medium text-ink">{p.title}</p>
                {p.dueDate ? (
                  <p className="text-xs text-ink-3">Due {format(p.dueDate, "MMM d, yyyy")}</p>
                ) : null}
              </Card>
            ))
          )}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="section-title">Recent posts</h2>
          <Link href="/club/content" className="text-xs text-accent hover:underline">
            Content library
          </Link>
        </div>
        <div className="space-y-2">
          {d.recentPosts.length === 0 ? (
            <p className="text-sm text-ink-3">No posts yet.</p>
          ) : (
            d.recentPosts.map((p) => (
              <Card key={p.id} className="p-4">
                <p className="text-xs uppercase text-ink-3">{p.type}</p>
                <p className="text-sm font-medium text-ink">{p.title}</p>
                <p className="text-xs text-ink-3">{p.author.name}</p>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
