import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { workbookKeys } from "@/lib/learn/lessons";
import { workbookTitle } from "@/lib/learn/workbook-map";
import { MAX_WORKBOOK_BYTES, looksLikeXlsx, parseWorkbookFileName, storeWorkbook, workbookStorageReady } from "@/lib/learn/blob-storage";
import { unzip } from "@/lib/unzip";

export const maxDuration = 120;

type Row = { fileName: string; workbookKey: string | null; kind: string | null; nextVersion: number | null; sizeBytes: number; status: "new" | "update" | "skip"; reason?: string };

/**
 * ADMIN — upload the whole workbook zip (e.g. PEB_Practice_Workbooks_v2.zip).
 * Without confirm=1: returns a summary of what would be created. With confirm=1: stores new versions.
 */
export async function POST(req: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;
  const form = await req.formData();
  const file = form.get("file");
  const confirm = form.get("confirm") === "1";
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a .zip file." }, { status: 400 });
  if (file.size > 50 * 1024 * 1024) return NextResponse.json({ error: "Zip is over 50 MB." }, { status: 400 });
  let entries: { name: string; data: Buffer }[];
  try {
    entries = unzip(Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  const valid = new Set(workbookKeys());
  const rows: (Row & { data?: Buffer })[] = [];
  const latest = await prisma.lessonResource.findMany({ orderBy: { version: "desc" }, select: { workbookKey: true, kind: true, version: true, sizeBytes: true } });
  const seen = new Set<string>();
  for (const e of entries) {
    const base = e.name.split("/").pop() ?? e.name;
    if (base.startsWith(".") || e.name.includes("__MACOSX")) continue;
    const parsed = parseWorkbookFileName(base);
    const skip = (reason: string) => rows.push({ fileName: base, workbookKey: parsed?.workbookKey ?? null, kind: parsed?.kind ?? null, nextVersion: null, sizeBytes: e.data.length, status: "skip", reason });
    if (!parsed) {
      skip("Name doesn't look like PEB_XX_Name.xlsx or PEB_XX_Name_KEY.xlsx");
      continue;
    }
    if (!valid.has(parsed.workbookKey)) {
      skip("No lesson uses this workbook key");
      continue;
    }
    const k = `${parsed.workbookKey}:${parsed.kind}`;
    if (seen.has(k)) {
      skip("Duplicate in the zip");
      continue;
    }
    seen.add(k);
    if (e.data.length > MAX_WORKBOOK_BYTES || !looksLikeXlsx(base, "", e.data)) {
      skip("Not a valid .xlsx under 10 MB");
      continue;
    }
    const prev = latest.find((r) => r.workbookKey === parsed.workbookKey && r.kind === parsed.kind);
    rows.push({ fileName: base, workbookKey: parsed.workbookKey, kind: parsed.kind, nextVersion: (prev?.version ?? 0) + 1, sizeBytes: e.data.length, status: prev ? "update" : "new", data: e.data });
  }
  const summary = rows.map(({ data: _d, ...r }) => r).sort((a, b) => (a.workbookKey ?? "~").localeCompare(b.workbookKey ?? "~") || (a.kind ?? "").localeCompare(b.kind ?? ""));
  const missing = [...valid].filter((k) => !seen.has(`${k}:student`)).map((k) => `${k}.xlsx`);
  if (!confirm) return NextResponse.json({ summary, missing, storage: workbookStorageReady() });
  if (!workbookStorageReady()) return NextResponse.json({ error: "No Blob read-write token found. Connect a Vercel Blob store, then redeploy." }, { status: 503 });

  let created = 0;
  for (const r of rows) {
    if (r.status === "skip" || !r.data || !r.workbookKey || !r.kind) continue;
    const prev = await prisma.lessonResource.findFirst({ where: { workbookKey: r.workbookKey, kind: r.kind }, orderBy: { version: "desc" }, select: { version: true } });
    const version = (prev?.version ?? 0) + 1;
    const hash = createHash("sha256").update(r.data).digest("hex").slice(0, 10);
    const { url } = await storeWorkbook(`learn/${r.kind}/${r.workbookKey}-v${version}-${hash}.xlsx`, r.data);
    await prisma.lessonResource.create({
      data: {
        workbookKey: r.workbookKey,
        kind: r.kind,
        title: r.kind === "answer_key" ? `${workbookTitle(r.workbookKey)} — answer key` : workbookTitle(r.workbookKey),
        blobUrl: url,
        fileName: r.kind === "answer_key" ? `${r.workbookKey}_KEY.xlsx` : `${r.workbookKey}.xlsx`,
        sizeBytes: r.data.length,
        version,
        uploadedBy: auth.userId,
      },
    });
    created++;
  }
  return NextResponse.json({ created, summary });
}
