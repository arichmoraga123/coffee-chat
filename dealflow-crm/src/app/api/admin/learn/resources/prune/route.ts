import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { deleteResources } from "@/lib/learn/resource-delete";

/** ADMIN — delete every version except the newest student file and answer key for each workbook. */
export async function POST() {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;
  const rows = await prisma.lessonResource.findMany({ orderBy: { version: "desc" }, select: { id: true, workbookKey: true, kind: true } });
  const seen = new Set<string>();
  const old: string[] = [];
  for (const r of rows) {
    const k = `${r.workbookKey}:${r.kind}`;
    if (seen.has(k)) old.push(r.id);
    else seen.add(k);
  }
  return NextResponse.json({ deleted: old.length ? await deleteResources(old) : 0 });
}
