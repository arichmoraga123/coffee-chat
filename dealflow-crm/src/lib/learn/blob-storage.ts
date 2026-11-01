import "server-only";
import { get, put } from "@vercel/blob";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";

/** Development without Blob: workbooks go to a local folder so the full flow can be tried. Never in production. */
const LOCAL_DIR = path.join(process.env.TMPDIR ?? "/tmp", "prospect-workbooks");
const localMode = () => !blobToken() && process.env.NODE_ENV !== "production";
export const workbookStorageReady = () => Boolean(blobToken()) || localMode();

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const MAX_WORKBOOK_BYTES = 10 * 1024 * 1024;

/**
 * The Blob read-write token. Vercel names it after the prefix chosen when connecting the store
 * (BLOB_READ_WRITE_TOKEN by default, e.g. Lesson_READ_WRITE_TOKEN with a "Lesson" prefix), so accept any
 * *_READ_WRITE_TOKEN env var holding a Vercel Blob token.
 */
export function blobToken(): string | undefined {
  const direct = process.env.BLOB_READ_WRITE_TOKEN?.trim() || process.env.Lesson_READ_WRITE_TOKEN?.trim();
  if (direct) return direct;
  for (const [key, value] of Object.entries(process.env)) {
    if (key.endsWith("_READ_WRITE_TOKEN") && value?.trim().startsWith("vercel_blob_rw_")) return value.trim();
  }
  return undefined;
}

export function blobConfigured(): boolean {
  return Boolean(blobToken());
}

/**
 * Stores a workbook in Vercel Blob. Uses private blobs (no public URL at all) and falls back to an
 * unguessable public URL only if the store doesn't support private access. Either way the URL is
 * only ever used server-side by the download route.
 */
export async function storeWorkbook(pathname: string, data: Buffer): Promise<{ url: string }> {
  if (localMode()) {
    const id = randomBytes(10).toString("hex");
    await mkdir(LOCAL_DIR, { recursive: true });
    await writeFile(path.join(LOCAL_DIR, id), data);
    return { url: `local:${id}` };
  }
  try {
    const r = await put(pathname, data, { access: "private", addRandomSuffix: true, contentType: XLSX_MIME, token: blobToken() });
    return { url: r.url };
  } catch (e) {
    console.warn("[learn] private blob upload failed, retrying as public with random suffix:", (e as Error).message);
    const r = await put(pathname, data, { access: "public", addRandomSuffix: true, contentType: XLSX_MIME, token: blobToken() });
    return { url: r.url };
  }
}

/** Opens a stored workbook for streaming to the client. */
export async function openWorkbook(url: string): Promise<ReadableStream<Uint8Array> | null> {
  if (url.startsWith("local:")) {
    const buf = await readFile(path.join(LOCAL_DIR, url.slice(6).replace(/[^a-f0-9]/g, ""))).catch(() => null);
    if (!buf) return null;
    return new ReadableStream({
      start(c) {
        c.enqueue(new Uint8Array(buf));
        c.close();
      },
    });
  }
  for (const access of ["private", "public"] as const) {
    try {
      const r = await get(url, { access, token: blobToken() });
      if (r && r.statusCode === 200) return r.stream;
    } catch {
      /* try the other access mode */
    }
  }
  return null;
}

/** "PEB_03_CAPM_Beta_WACC_KEY.xlsx" → { workbookKey: "PEB_03_CAPM_Beta_WACC", kind: "answer_key" } */
export function parseWorkbookFileName(name: string): { workbookKey: string; kind: "student" | "answer_key" } | null {
  const m = /^(PEB_\d{2}_[A-Za-z0-9_]+?)(_KEY)?\.xlsx$/i.exec(name.trim());
  if (!m) return null;
  return { workbookKey: m[1], kind: m[2] ? "answer_key" : "student" };
}

/** .xlsx files are zip archives: check the "PK" signature as well as the extension/MIME. */
export function looksLikeXlsx(name: string, mime: string, data: Buffer): boolean {
  const extOk = name.toLowerCase().endsWith(".xlsx");
  const mimeOk = !mime || mime === XLSX_MIME || mime === "application/octet-stream" || mime === "application/zip";
  return extOk && mimeOk && data.length > 4 && data[0] === 0x50 && data[1] === 0x4b;
}
