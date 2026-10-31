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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#4a6fa5]/40 bg-[#4a6fa5]/10 p-4">
      <p className="text-sm text-zinc-200">You&apos;re not on the PE@Broad roster yet.</p>
      <JoinPeBroadButton initialStatus={joinState} />
    </div>
  ) : null;
  if (!clubId) {
    return joinBanner ?? (
      <p className="text-sm text-zinc-400">
        No club is linked yet. Set your school in onboarding or ask an officer to add you to your club roster.
      </p>
    );
  }

  const d = await getClubDashboardPayload(clubId, userId);
  if (!d.club) {
    return <p className="text-sm text-zinc-400">Club could not be loaded.</p>;
  }

  return (
    <div className="space-y-8">
      {joinBanner}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">{d.club.name}</h1>
        <p className="text-sm text-zinc-500">
          {d.club.school?.name} · {d.memberCount} members
          {d.club.isVerified ? " · Verified" : ""}
        </p>
        {d.club.description ? <p className="max-w-2xl text-sm text-zinc-400">{d.club.description}</p> : null}
      </header>

      {d.pinnedAnnouncements.length ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Pinned announcements</h2>
          <div className="space-y-2">
            {d.pinnedAnnouncements.map((a) => (
              <Card key={a.id} className="border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-sm font-medium text-zinc-100">{a.title}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {a.author.name} · {format(a.createdAt, "MMM d, yyyy")}
                </p>
                <p className="mt-2 line-clamp-3 text-sm text-zinc-400">{a.body}</p>
                <Link href="/club/announcements" className="mt-2 inline-block text-xs text-amber-200/90 hover:underline">
                  View all
                </Link>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">Upcoming events</h2>
          <ul className="mt-3 space-y-2">
            {d.upcomingEvents.length === 0 ? (
              <li className="text-sm text-zinc-500">No upcoming events.</li>
            ) : (
              d.upcomingEvents.map((e) => (
                <li key={e.id} className="text-sm text-zinc-300">
                  <span className="font-medium text-zinc-100">{e.title}</span>
                  <span className="text-zinc-500"> — {format(e.date, "MMM d, h:mm a")}</span>
                </li>
              ))
            )}
          </ul>
          <Link href="/club/events" className="mt-3 inline-block text-xs text-amber-200/90 hover:underline">
            Calendar & RSVP
          </Link>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">Officer contacts</h2>
          <ul className="mt-3 space-y-2">
            {d.officers.length === 0 ? (
              <li className="text-sm text-zinc-500">No officers listed yet.</li>
            ) : (
              d.officers.map((o, i) => (
                <li key={i} className="text-sm text-zinc-300">
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400">{o.role}</span>{" "}
                  <span className="font-medium text-zinc-100">{o.name}</span>
                  {o.email ? <span className="block text-xs text-zinc-500">{o.email}</span> : null}
                </li>
              ))
            )}
          </ul>
        </Card>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Active projects</h2>
          <Link href="/club/projects" className="text-xs text-amber-200/90 hover:underline">
            All projects
          </Link>
        </div>
        <div className="space-y-2">
          {d.activeProjects.length === 0 ? (
            <p className="text-sm text-zinc-500">No active projects.</p>
          ) : (
            d.activeProjects.map((p) => (
              <Card key={p.id} className="border-zinc-800 bg-zinc-900/40 p-3">
                <p className="text-sm font-medium text-zinc-100">{p.title}</p>
                {p.dueDate ? (
                  <p className="text-xs text-zinc-500">Due {format(p.dueDate, "MMM d, yyyy")}</p>
                ) : null}
              </Card>
            ))
          )}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Recent posts</h2>
          <Link href="/club/content" className="text-xs text-amber-200/90 hover:underline">
            Content library
          </Link>
        </div>
        <div className="space-y-2">
          {d.recentPosts.length === 0 ? (
            <p className="text-sm text-zinc-500">No posts yet.</p>
          ) : (
            d.recentPosts.map((p) => (
              <Card key={p.id} className="border-zinc-800 bg-zinc-900/40 p-3">
                <p className="text-xs uppercase text-zinc-500">{p.type}</p>
                <p className="text-sm font-medium text-zinc-100">{p.title}</p>
                <p className="text-xs text-zinc-500">{p.author.name}</p>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
