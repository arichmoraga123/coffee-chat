import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { audienceIncludes, canPost, isActiveMember, openFile, type StoredFile } from "@/lib/club-publish";

/** Authenticated download: club members only (and only posts in their audience). Logs the download. */
export async function GET(_req: Request, ctx: { params: Promise<{ kind: string; id: string; fileId: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { kind, id, fileId } = await ctx.params;
  const row =
    kind === "post"
      ? await prisma.clubPost.findUnique({ where: { id }, select: { clubId: true, files: true, audience: true } })
      : kind === "project"
        ? await prisma.clubProject.findUnique({ where: { id }, select: { clubId: true, files: true } })
        : null;
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const officer = await canPost(userId, row.clubId);
  if (!officer) {
    if (!(await isActiveMember(userId, row.clubId))) return NextResponse.json({ error: "Members only" }, { status: 403 });
    if ("audience" in row) {
      const me = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, careerTracks: true } });
      if (!me || !audienceIncludes(row.audience, me)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }
  const f = ((row.files as unknown as StoredFile[]) ?? []).find((x) => x.id === fileId);
  if (!f) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const data = await openFile(f);
  if (!data) return NextResponse.json({ error: "File is missing from storage." }, { status: 404 });
  if (kind === "post") {
    await prisma.clubPostProgress.upsert({
      where: { postId_userId: { postId: id, userId } },
      create: { postId: id, userId, downloads: 1, viewedAt: new Date() },
      update: { downloads: { increment: 1 } },
    });
  }
  const body: BodyInit = Buffer.isBuffer(data) ? new Uint8Array(data) : (data as ReadableStream<Uint8Array>);
  return new NextResponse(body, {
    headers: {
      "Content-Type": f.contentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${f.name.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
