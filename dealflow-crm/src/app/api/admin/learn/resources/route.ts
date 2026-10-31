import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { workbookKeys } from "@/lib/learn/lessons";
import {
  MAX_WORKBOOK_BYTES,
  blobConfigured,
  looksLikeXlsx,
  parseWorkbookFileName,
  storeWorkbook,
} from "@/lib/learn/blob-storage";

export const maxDuration = 60;

function titleFromKey(key: string, kind: string) {
  const name = key.replace(/^PEB_\d{2}_/, "").replace(/_/g, " ").replace(/\b3Statement\b/, "3-Statement");
  return kind === "answer_key" ? `${name} — answer key` : name;
}

/**
 * ADMIN — upload one or more .xlsx workbooks.
 * multipart/form-data: files (one or many). Optional for a single file: workbookKey, kind, title, description.
 * Without workbookKey/kind they are read from the file name (PEB_0X_Name.xlsx / PEB_0X_Name_KEY.xlsx).
 * Re-uploading the same key + kind creates a new version.
 */
export async function POST(req: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;
  if (!blobConfigured()) {
    return NextResponse.json({ error: "BLOB_READ_WRITE_TOKEN is not set — connect a Vercel Blob store first." }, { status: 503 });
  }

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  const validKeys = new Set(workbookKeys());
  const results: { fileName: string; ok: boolean; error?: string; version?: number }[] = [];

  for (const file of files) {
    const explicitKey = files.length === 1 ? String(form.get("workbookKey") ?? "").trim() : "";
    const explicitKind = files.length === 1 ? String(form.get("kind") ?? "").trim() : "";
    const parsed = parseWorkbookFileName(file.name);
    const workbookKey = explicitKey || parsed?.workbookKey || "";
    const kind = explicitKind || parsed?.kind || "";
    const fail = (error: string) => results.push({ fileName: file.name, ok: false, error });

    if (!validKeys.has(workbookKey)) {
      fail(`Unknown workbook key "${workbookKey || "?"}" — pick one referenced by a lesson`);
      continue;
    }
    if (kind !== "student" && kind !== "answer_key") {
      fail("Kind must be student or answer_key");
      continue;
    }
    if (file.size > MAX_WORKBOOK_BYTES) {
      fail("File is larger than 10 MB");
      continue;
    }
    const data = Buffer.from(await file.arrayBuffer());
    if (!looksLikeXlsx(file.name, file.type, data)) {
      fail("Only .xlsx files are accepted");
      continue;
    }

    const prev = await prisma.lessonResource.findFirst({
      where: { workbookKey, kind },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const version = (prev?.version ?? 0) + 1;
    const fileName = kind === "answer_key" ? `${workbookKey}_KEY.xlsx` : `${workbookKey}.xlsx`;
    try {
      const { url } = await storeWorkbook(`learn/${kind}/${workbookKey}-v${version}.xlsx`, data);
      await prisma.lessonResource.create({
        data: {
          workbookKey,
          kind,
          title: (files.length === 1 && String(form.get("title") ?? "").trim()) || titleFromKey(workbookKey, kind),
          description: (files.length === 1 && String(form.get("description") ?? "").trim()) || null,
          blobUrl: url,
          fileName,
          sizeBytes: data.length,
          version,
          uploadedBy: auth.userId,
        },
      });
      results.push({ fileName: file.name, ok: true, version });
    } catch (e) {
      fail(e instanceof Error ? e.message : "Upload failed");
    }
  }

  const status = results.every((r) => r.ok) ? 200 : results.some((r) => r.ok) ? 207 : 400;
  return NextResponse.json({ results }, { status });
}
