import "server-only";
import { NextResponse } from "next/server";
import type { BetaContentBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { prisma } from "@/lib/prisma";
import { anthropicJsonWithProgress } from "@/lib/anthropic";
import { unzip } from "@/lib/unzip";
import { getPrimaryTrack } from "@/lib/track-utils";
import { runFormatChecks, type FormatResult } from "@/lib/resume/format-checks";
import { docxText, gradeResume, type GradeInput } from "@/lib/resume/grader";
import {
  CLASS_LEVELS,
  EXPERIENCE_OPTIONS,
  RECRUITING_TARGETS,
  levelFromGradYear,
  targetFromTrack,
  type ClassLevel,
  type ExperienceId,
  type RecruitingTarget,
} from "@/lib/resume/rubric";
import { deleteResumeFile, readResumeFile, storeResumeFile } from "@/lib/resume/store";

export const RESUME_V2 = () => process.env.RESUME_V2?.trim().toLowerCase() === "true";
export const V2_KEEP = 10;

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const EXPECTED_CHARS = 9000;

type Stored = { fileUrl?: string | null; fileType?: "pdf" | "docx" };

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/** POST (v2): multipart with `file`, or `reviewId` to re-grade a stored resume at a new level. */
export async function postV2(req: Request, userId: string): Promise<Response> {
  const form = await req.formData();
  const profile = await prisma.user.findUnique({ where: { id: userId }, select: { careerTracks: true, classYear: true } });

  const rawLevel = String(form.get("level") ?? "");
  const rawTarget = String(form.get("target") ?? "");
  const level: ClassLevel = (CLASS_LEVELS as readonly string[]).includes(rawLevel)
    ? (rawLevel as ClassLevel)
    : (levelFromGradYear(profile?.classYear) ?? "Sophomore");
  const target: RecruitingTarget = (RECRUITING_TARGETS as readonly string[]).includes(rawTarget)
    ? (rawTarget as RecruitingTarget)
    : targetFromTrack(getPrimaryTrack(profile?.careerTracks ?? []));
  const validExp = new Set<string>(EXPERIENCE_OPTIONS.map((o) => o.id));
  const experience = form.getAll("experience").map(String).filter((e): e is ExperienceId => validExp.has(e));

  let buf: Buffer;
  let fileName: string;
  let fileType: "pdf" | "docx";
  let fileUrl: string | null = null;

  const reviewId = String(form.get("reviewId") ?? "");
  const file = form.get("file");
  if (reviewId) {
    const prior = await prisma.resumeReview.findFirst({ where: { id: reviewId, userId } });
    const stored = (prior?.feedback ?? {}) as Stored;
    if (!prior || !stored.fileUrl) return bad("That resume isn't stored anymore — upload it again.");
    const data = await readResumeFile(stored.fileUrl);
    if (!data) return bad("That resume isn't stored anymore — upload it again.");
    buf = data;
    fileName = prior.fileName;
    fileType = stored.fileType ?? "pdf";
    fileUrl = stored.fileUrl;
  } else if (file instanceof File) {
    const lower = file.name.toLowerCase();
    if (file.type === "application/pdf" || lower.endsWith(".pdf")) fileType = "pdf";
    else if (file.type === DOCX_MIME || lower.endsWith(".docx")) fileType = "docx";
    else return bad("Upload a PDF (or a .docx for content-only feedback).");
    if (file.size > 8 * 1024 * 1024) return bad("File is too large (max 8 MB). Export a smaller file and try again.");
    buf = Buffer.from(await file.arrayBuffer());
    if (!buf.length) return bad("Could not read the file.");
    fileName = file.name.slice(0, 255);
  } else {
    return bad("file required");
  }

  let format: FormatResult | null = null;
  let text: string | undefined;
  if (fileType === "pdf") {
    try {
      format = await runFormatChecks(new Uint8Array(buf));
    } catch (e) {
      console.error("[resume-v2] could not read PDF layout", e);
      return bad("Couldn't read that PDF. Re-export it from Word or Google Docs and try again.");
    }
  } else {
    const doc = unzip(buf, { maxEntries: 500, maxTotalBytes: 40 * 1024 * 1024 }).find((e) => e.name === "word/document.xml");
    if (!doc) return bad("Couldn't read that .docx. Export it to PDF and try again.");
    text = docxText(doc.data.toString("utf8"));
    if (!text.trim()) return bad("That .docx has no text.");
  }

  const input: GradeInput = { level, target, experience, pdf: fileType === "pdf" ? new Uint8Array(buf) : undefined, text, format };

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      let lastPct = 0;
      try {
        send({ type: "progress", pct: 4, stage: "Checking the layout" });
        if (format) send({ type: "formatting", score: format.score });
        const review = await gradeResume(input, async ({ system, content, schema }) =>
          anthropicJsonWithProgress<unknown>(
            content as unknown as BetaContentBlockParam[],
            schema,
            { system, maxTokens: 12000, effort: "low", usageLog: { userId, feature: "resume-review" } },
            (soFar) => {
              const pct = Math.min(95, 8 + Math.round((soFar.length / EXPECTED_CHARS) * 87));
              if (pct >= lastPct + 3) {
                lastPct = pct;
                send({ type: "progress", pct, stage: "Reading your bullets" });
              }
            },
          ),
        );

        if (!fileUrl) {
          fileUrl = await storeResumeFile(userId, fileName, buf, fileType === "pdf" ? "application/pdf" : DOCX_MIME).catch((e) => {
            console.warn("[resume-v2] could not store file:", (e as Error).message);
            return null;
          });
        }
        const row = await prisma.resumeReview.create({
          data: {
            userId,
            fileName,
            score: Math.round(review.overall * 10),
            feedback: { ...review, fileUrl, fileType, bulletTexts: review.bullets.map((b) => b.original) },
          },
        });

        // Keep the latest V2_KEEP reviews; delete older ones and their stored files (unless still shared).
        const extras = await prisma.resumeReview.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          skip: V2_KEEP,
          select: { id: true, feedback: true },
        });
        if (extras.length) {
          await prisma.resumeReview.deleteMany({ where: { id: { in: extras.map((e) => e.id) } } });
          await cleanupFiles(userId, extras.map((e) => (e.feedback as Stored | null)?.fileUrl));
        }
        send({ type: "done", review: row });
      } catch (error) {
        console.error("[resume-v2] failed", error);
        send({ type: "error", error: error instanceof Error ? error.message : "Resume review failed" });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" },
  });
}

/** Deletes stored files no remaining review of this user points at (re-grades share a file). */
export async function cleanupFiles(userId: string, urls: Array<string | null | undefined>) {
  const candidates = [...new Set(urls.filter((u): u is string => Boolean(u)))];
  if (!candidates.length) return;
  const remaining = await prisma.resumeReview.findMany({ where: { userId }, select: { feedback: true } });
  const inUse = new Set(remaining.map((r) => (r.feedback as Stored | null)?.fileUrl).filter(Boolean));
  for (const u of candidates) if (!inUse.has(u)) await deleteResumeFile(u);
}
