import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getUserIdFromSession } from "@/lib/auth";
import { resolveClubIdForUser } from "@/lib/club-server";
import { ALLOWED_EXT, ALLOWED_TYPES, MAX_FILE_BYTES, canPost, fileStorageMode, saveFile } from "@/lib/club-publish";
import { blobToken } from "@/lib/learn/blob-storage";

/**
 * Officer file uploads for club posts.
 * - GET → { mode, clubId }: "blob" uploads go straight from the browser to Vercel Blob (files up to 25 MB);
 *   "local" (development without Blob) posts the file here as multipart.
 * - POST JSON → the Vercel Blob client-upload handshake (token only for officers, only under club/<clubId>/).
 * - POST multipart → server-side save.
 */
async function ctx() {
  const userId = await getUserIdFromSession();
  if (!userId) return null;
  const clubId = await resolveClubIdForUser(userId);
  if (!clubId || !(await canPost(userId, clubId))) return null;
  return { userId, clubId };
}

export async function GET() {
  const c = await ctx();
  if (!c) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ mode: fileStorageMode(), clubId: c.clubId });
}

export async function POST(req: Request) {
  const type = req.headers.get("content-type") ?? "";
  if (type.startsWith("multipart/form-data")) {
    const c = await ctx();
    if (!c) return NextResponse.json({ error: "Only officers and admins can upload." }, { status: 403 });
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file." }, { status: 400 });
    if (!ALLOWED_EXT.test(file.name)) return NextResponse.json({ error: "Use PDF, Excel, PowerPoint, Word, or an image." }, { status: 400 });
    if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "Files can be up to 25 MB." }, { status: 400 });
    try {
      const stored = await saveFile(c.clubId, file.name, file.type || "application/octet-stream", Buffer.from(await file.arrayBuffer()));
      return NextResponse.json(stored);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 503 });
    }
  }
  const body = (await req.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  try {
    const result = await handleUpload({
      body,
      request: req,
      token: blobToken(),
      onBeforeGenerateToken: async (pathname) => {
        const c = await ctx();
        if (!c) throw new Error("Only officers and admins can upload.");
        if (!pathname.startsWith(`club/${c.clubId}/`) || !ALLOWED_EXT.test(pathname)) throw new Error("That file type isn't allowed.");
        return { allowedContentTypes: ALLOWED_TYPES, maximumSizeInBytes: MAX_FILE_BYTES, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
