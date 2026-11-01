import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { easternToUtc, type PublishInput } from "@/lib/club-publish-schema";
import type { StoredFile } from "@/lib/club-publish";

/** Only files we stored for this club (Blob path under club/<clubId>/, or local dev ids). */
export function validFiles(clubId: string, files: StoredFile[]): StoredFile[] {
  return files.filter((f) => {
    if (f.key.startsWith("local:")) return process.env.NODE_ENV !== "production" && /^local:[a-f0-9]{20}$/.test(f.key);
    try {
      const u = new URL(f.key);
      return u.protocol === "https:" && u.hostname.endsWith(".blob.vercel-storage.com") && u.pathname.startsWith(`/club/${clubId}/`);
    } catch {
      return false;
    }
  });
}

const ymdToDate = (s: string | null | undefined) => (s ? new Date(`${s}T12:00:00Z`) : null);

/** Creates (no id) or updates (id) the row for a publish input. Returns the in-app URL. */
export async function writeItem(clubId: string, authorId: string, input: PublishInput, id?: string): Promise<{ id: string; url: string; summary: string }> {
  switch (input.type) {
    case "resource":
    case "assignment":
    case "reading":
    case "case_study": {
      const data = {
        title: input.title,
        content: input.description,
        type: input.type,
        dueDate: input.type === "resource" ? null : ymdToDate(input.dueDate),
        files: validFiles(clubId, input.files) as unknown as Prisma.InputJsonValue,
        links: input.links,
        tags: input.tags,
        lessonIds: input.lessonIds,
        audience: input.audience as Prisma.InputJsonValue,
        allowDone: input.type === "resource" ? false : input.allowDone,
      };
      const row = id ? await prisma.clubPost.update({ where: { id }, data }) : await prisma.clubPost.create({ data: { ...data, clubId, authorId } });
      return { id: row.id, url: `/club/content/${row.id}`, summary: input.description };
    }
    case "project": {
      const data = {
        title: input.title,
        description: input.description,
        memberIds: [...new Set([...(input.leadId ? [input.leadId] : []), ...input.memberIds])],
        leadId: input.leadId ?? null,
        dueDate: ymdToDate(input.dueDate),
        status: input.status,
        files: validFiles(clubId, input.files) as unknown as Prisma.InputJsonValue,
        links: input.links,
      };
      const row = id ? await prisma.clubProject.update({ where: { id }, data }) : await prisma.clubProject.create({ data: { ...data, clubId } });
      return { id: row.id, url: `/club/projects/${row.id}`, summary: input.description };
    }
    case "event": {
      const data = {
        title: input.title,
        description: input.description || null,
        date: easternToUtc(input.start),
        endDate: input.end ? easternToUtc(input.end) : null,
        location: input.location || null,
        meetingLink: input.meetingLink || null,
        capacity: input.capacity ?? null,
        rsvpOn: input.rsvpOn,
        type: "meeting",
      };
      const row = id ? await prisma.clubEvent.update({ where: { id }, data }) : await prisma.clubEvent.create({ data: { ...data, clubId, createdById: authorId } });
      const when = row.date.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
      return { id: row.id, url: `/club/events#${row.id}`, summary: `${when} ET${row.location ? ` · ${row.location}` : ""}${input.description ? ` — ${input.description}` : ""}` };
    }
    case "announcement": {
      const data = { title: input.title, body: input.body, isPinned: input.pinned };
      const row = id ? await prisma.clubAnnouncement.update({ where: { id }, data }) : await prisma.clubAnnouncement.create({ data: { ...data, clubId, authorId } });
      if (input.pinned) await prisma.clubAnnouncement.updateMany({ where: { clubId, isPinned: true, id: { not: row.id } }, data: { isPinned: false } });
      return { id: row.id, url: `/club/announcements#${row.id}`, summary: input.body.replace(/[*_#>\[\]()`-]/g, "").slice(0, 300) };
    }
  }
}
