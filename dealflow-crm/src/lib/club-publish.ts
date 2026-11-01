import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { get, put } from "@vercel/blob";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isClubOfficer } from "@/lib/club-server";
import { notify } from "@/lib/notify";
import { blobConfigured, blobToken } from "@/lib/learn/blob-storage";

/** Phase L — "Post to club": who can post, who sees what, delivery, and file storage. */

export const POST_TYPES = ["resource", "assignment", "reading", "case_study"] as const;
export type PostType = (typeof POST_TYPES)[number];
export type PublishType = PostType | "project" | "event" | "announcement";
export const TYPE_LABEL: Record<PublishType, string> = {
  resource: "Resource",
  assignment: "Assignment",
  reading: "Reading",
  case_study: "Case study",
  project: "Project",
  event: "Event",
  announcement: "Announcement",
};

export type Audience = { all: true } | { tracks: string[] } | { userIds: string[] };
/** Stored on a post. `key` is the storage URL or local id; it never goes to the browser. */
export type StoredFile = { id: string; name: string; size: number; contentType: string; key: string };
export type PublicFile = Omit<StoredFile, "key">;

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];
export const ALLOWED_EXT = /\.(pdf|xlsx|xls|xlsm|pptx|ppt|docx|doc|png|jpe?g|gif|webp)$/i;

export const publicFiles = (files: unknown): PublicFile[] =>
  (Array.isArray(files) ? (files as StoredFile[]) : []).map(({ id, name, size, contentType }) => ({ id, name, size, contentType }));

/** Admins (site role) and club officers can post. */
export async function canPost(userId: string, clubId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (u?.role === "ADMIN") return true;
  return isClubOfficer(userId, clubId);
}

export async function isActiveMember(userId: string, clubId: string) {
  const m = await prisma.clubMember.findUnique({ where: { clubId_userId: { clubId, userId } }, select: { active: true } });
  return Boolean(m?.active);
}

export function parseAudience(raw: unknown): Audience {
  const a = (raw ?? {}) as Record<string, unknown>;
  if (Array.isArray(a.userIds) && a.userIds.length) return { userIds: a.userIds.map(String).slice(0, 500) };
  if (Array.isArray(a.tracks) && a.tracks.length) return { tracks: a.tracks.map(String).slice(0, 30) };
  return { all: true };
}

/** Active members the audience covers. */
export async function audienceUserIds(clubId: string, audience: Audience): Promise<string[]> {
  const members = await prisma.clubMember.findMany({ where: { clubId, active: true }, select: { userId: true, user: { select: { careerTracks: true } } } });
  if ("userIds" in audience) {
    const set = new Set(audience.userIds);
    return members.filter((m) => set.has(m.userId)).map((m) => m.userId);
  }
  if ("tracks" in audience) {
    const set = new Set(audience.tracks);
    return members.filter((m) => m.user.careerTracks.some((t) => set.has(t))).map((m) => m.userId);
  }
  return members.map((m) => m.userId);
}

/** Can this member see a post with this audience? Posters always can. */
export function audienceIncludes(audience: unknown, user: { id: string; careerTracks: string[] }) {
  const a = parseAudience(audience);
  if ("userIds" in a) return a.userIds.includes(user.id);
  if ("tracks" in a) return user.careerTracks.some((t) => a.tracks.includes(t));
  return true;
}

export function audienceLabel(audience: unknown) {
  const a = parseAudience(audience);
  if ("userIds" in a) return `${a.userIds.length} selected member${a.userIds.length === 1 ? "" : "s"}`;
  if ("tracks" in a) return a.tracks.join(", ");
  return "All members";
}

export type Delivery = { feed: boolean; inApp: boolean; email: boolean; text: boolean };

/** Activity feed + notifications for a new item. Texts only when the poster is a site admin. */
export async function deliver(opts: {
  clubId: string;
  authorId: string;
  type: PublishType;
  title: string;
  summary: string;
  url: string;
  audience: Audience;
  delivery: Delivery;
}) {
  const { clubId, authorId, type, title, url, delivery } = opts;
  const label = TYPE_LABEL[type];
  if (delivery.feed) {
    const article = /^[aeiou]/i.test(label) ? "an" : "a";
    await prisma.clubActivity
      .create({ data: { clubId, userId: authorId, kind: "club_post", data: { text: `posted ${article} ${label.toLowerCase()}: ${title}`, url, type } as Prisma.InputJsonValue } })
      .catch(() => null);
  }
  if (!delivery.inApp && !delivery.email && !delivery.text) return 0;
  const author = await prisma.user.findUnique({ where: { id: authorId }, select: { name: true, role: true } });
  const text = delivery.text && author?.role === "ADMIN";
  const ids = (await audienceUserIds(clubId, opts.audience)).filter((id) => id !== authorId);
  for (const id of ids) {
    await notify(
      id,
      "club_post",
      {
        title: `${label}: ${title}`,
        body: opts.summary.slice(0, 200) || `${author?.name ?? "An officer"} posted to PE@Broad.`,
        url,
        email: delivery.email ? { subject: `PE@Broad ${label.toLowerCase()}: ${title}`, intro: opts.summary.slice(0, 600) || undefined, cta: `Open the ${label.toLowerCase()}` } : undefined,
        sms: text ? `Prospect · PE@Broad: ${title}` : undefined,
      },
      { flush: false },
    ).catch((e) => console.error("club notify failed", e));
  }
  const { flushOutbound } = await import("@/lib/outbound");
  await flushOutbound({ limit: 500 }).catch(() => null);
  return ids.length;
}

// ---------- files ----------

const LOCAL_DIR = path.join(process.env.TMPDIR ?? "/tmp", "prospect-club-uploads");
export const fileStorageMode = (): "blob" | "local" | "off" => (blobConfigured() ? "blob" : process.env.NODE_ENV !== "production" ? "local" : "off");

/** Server-side save (local development, or small files). Blob uploads from the browser go through /api/club/files/upload. */
export async function saveFile(clubId: string, name: string, contentType: string, data: Buffer): Promise<StoredFile> {
  const id = randomBytes(10).toString("hex");
  const safe = name.replace(/[^\w.\- ]+/g, "_").slice(-120);
  if (fileStorageMode() === "blob") {
    const r = await put(`club/${clubId}/${id}/${safe}`, data, { access: "private", addRandomSuffix: true, contentType, token: blobToken() });
    return { id, name: safe, size: data.length, contentType, key: r.url };
  }
  if (fileStorageMode() === "local") {
    await mkdir(LOCAL_DIR, { recursive: true });
    await writeFile(path.join(LOCAL_DIR, id), data);
    return { id, name: safe, size: data.length, contentType, key: `local:${id}` };
  }
  throw new Error("File storage isn't set up. Add a Vercel Blob store (BLOB_READ_WRITE_TOKEN).");
}

export async function openFile(f: StoredFile): Promise<ReadableStream<Uint8Array> | Buffer | null> {
  if (f.key.startsWith("local:")) return readFile(path.join(LOCAL_DIR, f.key.slice(6).replace(/[^a-f0-9]/g, ""))).catch(() => null);
  for (const access of ["private", "public"] as const) {
    try {
      const r = await get(f.key, { access, token: blobToken() });
      if (r && r.statusCode === 200) return r.stream;
    } catch {
      /* try the other mode */
    }
  }
  return null;
}
