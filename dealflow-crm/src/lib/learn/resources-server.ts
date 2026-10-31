import "server-only";
import { prisma } from "@/lib/prisma";
import type { ResourceInfo } from "@/components/learn/lesson-context";

/** Newest version of each workbook's student file and answer key. Storage URLs are never included. */
export async function latestResources(keys: string[]): Promise<Record<string, ResourceInfo>> {
  if (!keys.length) return {};
  const rows = await prisma.lessonResource.findMany({
    where: { workbookKey: { in: keys } },
    orderBy: { version: "desc" },
    select: { id: true, workbookKey: true, kind: true, title: true, description: true, fileName: true },
  });
  const out: Record<string, ResourceInfo> = {};
  for (const r of rows) {
    const cur = (out[r.workbookKey] ??= {});
    if (r.kind === "student" && !cur.student) {
      cur.student = { id: r.id, title: r.title, description: r.description, fileName: r.fileName };
    }
    if (r.kind === "answer_key" && !cur.answerKey) cur.answerKey = { id: r.id, fileName: r.fileName };
  }
  return out;
}

/** Admins and mentors can see answer keys and answer mentor questions. */
export function isMentorRole(role: string | null | undefined): boolean {
  return role === "ADMIN" || role === "MENTOR";
}
