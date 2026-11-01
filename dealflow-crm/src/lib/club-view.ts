import type { ClubAnnouncement, ClubEvent, ClubPost, ClubProject } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveClubIdForUser } from "@/lib/club-server";
import { allLessons } from "@/lib/learn/lessons";
import { audienceIncludes, canPost, parseAudience, publicFiles, type StoredFile } from "@/lib/club-publish";
import { utcToEastern, type PublishInput } from "@/lib/club-publish-schema";

/** Who is looking at the club pages and what they may do. */
export async function clubViewer(userId: string) {
  const clubId = await resolveClubIdForUser(userId);
  if (!clubId) return null;
  const [me, poster] = await Promise.all([prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, careerTracks: true } }), canPost(userId, clubId)]);
  return { clubId, userId, canPost: poster, isAdmin: me?.role === "ADMIN", me: { id: userId, careerTracks: me?.careerTracks ?? [] } };
}

export type Viewer = NonNullable<Awaited<ReturnType<typeof clubViewer>>>;

export const lessonOptions = () => allLessons().map((l) => ({ value: l.id, label: `${l.id.replace("-", ".")} ${l.title}` }));

/** Members only see posts addressed to them; posters see everything. */
export const visiblePost = (v: Viewer, p: { audience: unknown; authorId: string }) => v.canPost || p.authorId === v.userId || audienceIncludes(p.audience, v.me);

const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const noDelivery = { feed: false, inApp: false, email: false, text: false };

/** Rebuild the form input for editing. */
export function postInput(p: ClubPost): PublishInput {
  return {
    type: p.type as "resource",
    title: p.title,
    description: p.content,
    files: (p.files as unknown as StoredFile[]) ?? [],
    links: p.links,
    tags: p.tags,
    lessonIds: p.lessonIds,
    dueDate: ymd(p.dueDate),
    allowDone: p.allowDone,
    audience: parseAudience(p.audience) as PublishInput["audience"],
    delivery: noDelivery,
  };
}
export function projectInput(p: ClubProject): PublishInput {
  return {
    type: "project",
    title: p.title,
    description: p.description ?? "",
    memberIds: p.memberIds,
    leadId: p.leadId,
    dueDate: ymd(p.dueDate),
    status: (["planning", "active", "done"].includes(p.status) ? p.status : "active") as "active",
    files: (p.files as unknown as StoredFile[]) ?? [],
    links: p.links,
    audience: { all: true },
    delivery: noDelivery,
  };
}
export function eventInput(e: ClubEvent): PublishInput {
  return {
    type: "event",
    title: e.title,
    start: utcToEastern(e.date),
    end: e.endDate ? utcToEastern(e.endDate) : null,
    location: e.location ?? "",
    meetingLink: e.meetingLink,
    description: e.description ?? "",
    capacity: e.capacity,
    rsvpOn: e.rsvpOn,
    audience: { all: true },
    delivery: noDelivery,
  };
}
export function announcementInput(a: ClubAnnouncement): PublishInput {
  return { type: "announcement", title: a.title, body: a.body, pinned: a.isPinned, audience: { all: true }, delivery: noDelivery };
}

export { publicFiles };

export const fmtEt = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleString("en-US", { ...opts, timeZone: "America/New_York" });
