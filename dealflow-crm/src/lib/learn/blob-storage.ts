import "server-only";
import { get, put } from "@vercel/blob";

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const MAX_WORKBOOK_BYTES = 10 * 1024 * 1024;

export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

/**
 * Stores a workbook in Vercel Blob. Uses private blobs (no public URL at all) and falls back to an
 * unguessable public URL only if the store doesn't support private access. Either way the URL is
 * only ever used server-side by the download route.
 */
export async function storeWorkbook(pathname: string, data: Buffer): Promise<{ url: string }> {
  try {
    const r = await put(pathname, data, { access: "private", addRandomSuffix: true, contentType: XLSX_MIME });
    return { url: r.url };
  } catch (e) {
    console.warn("[learn] private blob upload failed, retrying as public with random suffix:", (e as Error).message);
    const r = await put(pathname, data, { access: "public", addRandomSuffix: true, contentType: XLSX_MIME });
    return { url: r.url };
  }
}

/** Opens a stored workbook for streaming to the client. */
export async function openWorkbook(url: string): Promise<ReadableStream<Uint8Array> | null> {
  for (const access of ["private", "public"] as const) {
    try {
      const r = await get(url, { access });
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
