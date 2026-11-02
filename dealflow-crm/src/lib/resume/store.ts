import "server-only";
import { del, get, put } from "@vercel/blob";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { blobToken } from "@/lib/learn/blob-storage";

/** Stored resume files (private Blob; a temp folder in local development without a Blob token). */
const LOCAL_DIR = path.join(process.env.TMPDIR ?? "/tmp", "prospect-resumes");
const localMode = () => !blobToken() && process.env.NODE_ENV !== "production";
export const resumeStorageReady = () => Boolean(blobToken()) || localMode();

export async function storeResumeFile(userId: string, name: string, data: Buffer, contentType: string): Promise<string | null> {
  if (!resumeStorageReady()) return null;
  if (localMode()) {
    const id = randomBytes(12).toString("hex");
    await mkdir(LOCAL_DIR, { recursive: true });
    await writeFile(path.join(LOCAL_DIR, id), data);
    return `local:${id}`;
  }
  const safe = name.replace(/[^\w.-]+/g, "_").slice(0, 80);
  const r = await put(`resumes/${userId}/${safe}`, data, { access: "private", addRandomSuffix: true, contentType, token: blobToken() });
  return r.url;
}

export async function readResumeFile(url: string): Promise<Buffer | null> {
  if (url.startsWith("local:")) {
    return readFile(path.join(LOCAL_DIR, url.slice(6).replace(/[^a-f0-9]/g, ""))).catch(() => null);
  }
  try {
    const r = await get(url, { access: "private", token: blobToken() });
    if (!r || r.statusCode !== 200) return null;
    return Buffer.from(await new Response(r.stream).arrayBuffer());
  } catch {
    return null;
  }
}

export async function deleteResumeFile(url: string | null | undefined): Promise<void> {
  if (!url) return;
  try {
    if (url.startsWith("local:")) await rm(path.join(LOCAL_DIR, url.slice(6).replace(/[^a-f0-9]/g, "")), { force: true });
    else await del(url, { token: blobToken() });
  } catch (e) {
    console.warn("[resume] could not delete stored file:", (e as Error).message);
  }
}
