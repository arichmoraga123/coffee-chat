import "server-only";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { blobToken } from "@/lib/learn/blob-storage";

/** Removes workbook versions: the stored file, their download log, and the row. */
export async function deleteResources(ids: string[]) {
  const rows = await prisma.lessonResource.findMany({ where: { id: { in: ids } }, select: { id: true, blobUrl: true } });
  const urls = rows.map((r) => r.blobUrl).filter((u) => u.startsWith("https://"));
  if (urls.length) await del(urls, { token: blobToken() }).catch((e) => console.warn("[learn] blob delete failed", (e as Error).message));
  await prisma.$transaction([
    prisma.resourceDownload.deleteMany({ where: { resourceId: { in: rows.map((r) => r.id) } } }),
    prisma.lessonResource.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } }),
  ]);
  return rows.length;
}
