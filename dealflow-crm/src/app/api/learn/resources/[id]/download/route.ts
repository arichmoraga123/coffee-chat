import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { lessonsForWorkbook } from "@/lib/learn/lessons";
import { openWorkbook, XLSX_MIME } from "@/lib/learn/blob-storage";
import { isMentorRole } from "@/lib/learn/resources-server";

/**
 * Downloads a workbook. Answer keys require a completed lesson that uses the workbook (admins and
 * mentors always). The file is streamed through this route, so storage URLs never reach the browser.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const resource = await prisma.lessonResource.findUnique({ where: { id } });
  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (resource.kind === "answer_key") {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!isMentorRole(user?.role)) {
      const lessonIds = lessonsForWorkbook(resource.workbookKey).map((l) => l.id);
      const done = await prisma.lessonProgress.findFirst({
        where: { userId, lessonId: { in: lessonIds }, status: "completed" },
        select: { id: true },
      });
      if (!done) {
        return NextResponse.json({ error: "Finish the lesson to unlock the answer key." }, { status: 403 });
      }
    }
  }

  const stream = await openWorkbook(resource.blobUrl);
  if (!stream) return NextResponse.json({ error: "File unavailable — ask a mentor to re-upload it." }, { status: 502 });
  await prisma.resourceDownload.create({ data: { userId, resourceId: resource.id } });

  return new Response(stream, {
    headers: {
      "content-type": XLSX_MIME,
      "content-disposition": `attachment; filename="${resource.fileName.replace(/"/g, "")}"`,
      "cache-control": "private, no-store",
    },
  });
}
