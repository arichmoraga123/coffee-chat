import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { canPost } from "@/lib/club-publish";
import { publishSchema } from "@/lib/club-publish-schema";
import { writeItem } from "@/lib/club-publish-write";

type Kind = "post" | "project" | "event" | "announcement";

async function clubOf(kind: Kind, id: string): Promise<string | null> {
  const where = { where: { id }, select: { clubId: true } };
  const row =
    kind === "post"
      ? await prisma.clubPost.findUnique(where)
      : kind === "project"
        ? await prisma.clubProject.findUnique(where)
        : kind === "event"
          ? await prisma.clubEvent.findUnique(where)
          : await prisma.clubAnnouncement.findUnique(where);
  return row?.clubId ?? null;
}

async function guard(ctx: { params: Promise<{ kind: string; id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { kind, id } = await ctx.params;
  if (!["post", "project", "event", "announcement"].includes(kind)) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  const clubId = await clubOf(kind as Kind, id);
  if (!clubId) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (!(await canPost(userId, clubId))) return { error: NextResponse.json({ error: "Only officers and admins can change posts." }, { status: 403 }) };
  return { userId, clubId, kind: kind as Kind, id };
}

/** Edit (full form body), or { action: "archive" | "unarchive" | "pin" | "unpin" }. Edits never re-notify. */
export async function PATCH(req: Request, ctx: { params: Promise<{ kind: string; id: string }> }) {
  const g = await guard(ctx);
  if ("error" in g) return g.error;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const action = body?.action;
  if (action === "archive" || action === "unarchive") {
    const data = { archivedAt: action === "archive" ? new Date() : null };
    if (g.kind === "post") await prisma.clubPost.update({ where: { id: g.id }, data });
    else if (g.kind === "project") await prisma.clubProject.update({ where: { id: g.id }, data });
    else if (g.kind === "event") await prisma.clubEvent.update({ where: { id: g.id }, data });
    else return NextResponse.json({ error: "Announcements can be deleted or unpinned." }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  if (action === "pin" || action === "unpin") {
    if (g.kind === "announcement") {
      if (action === "pin") await prisma.clubAnnouncement.updateMany({ where: { clubId: g.clubId, isPinned: true }, data: { isPinned: false } });
      await prisma.clubAnnouncement.update({ where: { id: g.id }, data: { isPinned: action === "pin" } });
    } else if (g.kind === "post") await prisma.clubPost.update({ where: { id: g.id }, data: { isPinned: action === "pin" } });
    else return NextResponse.json({ error: "Can't pin that." }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  const parsed = publishSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check the form." }, { status: 400 });
  const kindOfType = ["resource", "assignment", "reading", "case_study"].includes(parsed.data.type) ? "post" : parsed.data.type;
  if (kindOfType !== g.kind) return NextResponse.json({ error: "Type can't change when editing." }, { status: 400 });
  const item = await writeItem(g.clubId, g.userId, parsed.data, g.id);
  return NextResponse.json(item);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ kind: string; id: string }> }) {
  const g = await guard(ctx);
  if ("error" in g) return g.error;
  if (g.kind === "post") await prisma.clubPost.delete({ where: { id: g.id } });
  else if (g.kind === "project") await prisma.clubProject.delete({ where: { id: g.id } });
  else if (g.kind === "event") await prisma.clubEvent.delete({ where: { id: g.id } });
  else await prisma.clubAnnouncement.delete({ where: { id: g.id } });
  return NextResponse.json({ ok: true });
}
