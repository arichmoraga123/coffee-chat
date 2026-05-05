import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { anthropicMessage, getAnthropicApiKey } from "@/lib/anthropic";

const SYSTEM = `You are an expert investment banking and private equity recruiter who has reviewed thousands of resumes from target and non-target school candidates. Analyze this resume and provide specific, actionable feedback for a student recruiting for IB/PE roles. Be direct and specific — point out exact weaknesses and provide rewritten versions of weak bullet points.`;

const JSON_INSTRUCTION = `Return ONLY valid JSON (no markdown) with this exact shape:
{
  "overallScore": <number 0-100>,
  "formatting": { "summary": string, "onePage": boolean, "issues": string[] },
  "experienceBullets": { "summary": string, "strengths": string[], "weaknesses": string[] },
  "skillsEducation": { "summary": string, "suggestions": string[] },
  "financeSpecific": { "summary": string, "suggestions": string[] },
  "targetFirmFit": { "summary": string, "suggestedFirms": string[], "suggestedVerticals": string[] },
  "topImprovements": [ { "section": string, "original": string, "rewritten": string, "reason": string } ]
}
Use at most 5 items in topImprovements.`;

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getAnthropicApiKey()) {
    return NextResponse.json({ error: "AI is not configured" }, { status: 503 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "PDF only" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let text = "";
  try {
    const parser = new PDFParse({ data: buf });
    const extracted = await parser.getText();
    text = (extracted.text ?? "").trim();
    await parser.destroy();
  } catch {
    return NextResponse.json({ error: "Could not read PDF" }, { status: 400 });
  }
  if (text.length < 40) {
    return NextResponse.json({ error: "Could not extract enough text from PDF" }, { status: 400 });
  }
  const clipped = text.slice(0, 50_000);

  const raw = await anthropicMessage(
    `${JSON_INSTRUCTION}\n\n---\n\nResume text:\n${clipped}`,
    {
      system: SYSTEM,
      maxTokens: 2000,
      usageLog: { userId, feature: "resume-review" },
    },
  );

  let feedback: unknown;
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("no json");
    feedback = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return NextResponse.json({ error: "AI returned invalid JSON — try again" }, { status: 502 });
  }

  const score =
    typeof feedback === "object" &&
    feedback !== null &&
    "overallScore" in feedback &&
    typeof (feedback as { overallScore: unknown }).overallScore === "number"
      ? Math.min(100, Math.max(0, Math.round((feedback as { overallScore: number }).overallScore)))
      : 0;

  const review = await prisma.resumeReview.create({
    data: {
      userId,
      fileName: file.name.slice(0, 255),
      score,
      feedback: feedback as object,
    },
  });

  const extras = await prisma.resumeReview.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: 5,
    select: { id: true },
  });
  if (extras.length) {
    await prisma.resumeReview.deleteMany({
      where: { id: { in: extras.map((e) => e.id) } },
    });
  }

  return NextResponse.json({ review });
}

export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reviews = await prisma.resumeReview.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  return NextResponse.json({ reviews });
}
