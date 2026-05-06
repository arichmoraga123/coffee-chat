import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { getAnthropicApiKey } from "@/lib/anthropic";

const SYSTEM = `You are a senior recruiter at Goldman Sachs with 15 years of experience reviewing resumes for IB, PE, and consulting roles. You have reviewed over 10,000 resumes from target and non-target schools. You give direct, specific, actionable feedback. You can see the resume as an image — visually inspect it for formatting issues including alignment, font consistency, spacing, and layout in addition to content analysis. Be extremely specific — if dates are not right-aligned say so, if bullet points are not consistently indented say so.

Return ONLY valid JSON with no markdown or explanation:
{
  overallScore: number (0-100),
  oneLiner: string,
  recruitingReadiness: string,
  visualAnalysis: {
    score: number (0-100),
    grade: string,
    feedback: string,
    issues: [
      {
        issue: string,
        severity: 'critical' | 'moderate' | 'minor',
        fix: string
      }
    ]
  },
  sections: {
    formatting: {
      score: number (0-100),
      grade: string,
      feedback: string,
      issues: string[],
      fixes: string[]
    },
    experience: {
      score: number (0-100),
      grade: string,
      feedback: string,
      weakBullets: [
        {
          original: string,
          problem: string,
          rewritten: string
        }
      ]
    },
    education: {
      score: number (0-100),
      grade: string,
      feedback: string,
      issues: string[]
    },
    skills: {
      score: number (0-100),
      grade: string,
      feedback: string,
      missing: string[],
      suggestions: string[]
    },
    financeSpecific: {
      score: number (0-100),
      grade: string,
      feedback: string,
      dealExperience: string,
      technicalSkills: string,
      quantification: string
    }
  },
  topFirmsMatch: [
    {
      firm: string,
      fitScore: number (0-100),
      reason: string
    }
  ],
  top5Improvements: string[]
}

Visual checks Claude must perform:
- Margins: consistent and 0.5-1 inch?
- Font: same font used throughout?
- Font size: body 10-12pt, headers larger?
- Alignment: bullets, dates, company names aligned?
- Spacing: consistent line spacing?
- Length: exactly one page for undergrad?
- Section headers: clearly differentiated?
- Dates: consistently formatted (May 2024 not 5/2024)?
- Bullet style: consistent • or – not mixed?
- Bold: consistent for company names and titles?
- Contact info: properly formatted at top?
- GPA: shown correctly?
- Column alignment: right-aligned dates line up?`;

const JSON_INSTRUCTION =
  "Analyze the resume text and images together. Prioritize specific fixes and quantifiable rewrite guidance.";

type AnthropicResponse = {
  content?: Array<{ type?: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string };
};

async function extractResumeText(buf: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buf });
  try {
    const extracted = await parser.getText();
    return (extracted.text ?? "").trim();
  } finally {
    await parser.destroy();
  }
}

async function renderWithPdfJs(buf: Buffer): Promise<string[]> {
  const [{ getDocument }, { createCanvas }] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("canvas"),
  ]);

  const loadingTask = getDocument({ data: new Uint8Array(buf) });
  const pdf = await loadingTask.promise;
  const pages = Math.min(2, pdf.numPages);
  const images: string[] = [];

  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2, 1500 / baseViewport.width);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
    const context = canvas.getContext("2d");
    await page.render({ canvasContext: context as never, viewport }).promise;
    const dataUrl = canvas.toDataURL("image/png");
    images.push(dataUrl.replace(/^data:image\/png;base64,/, ""));
  }

  await pdf.destroy();
  return images;
}

async function renderWithSharp(buf: Buffer): Promise<string[]> {
  const images: string[] = [];
  for (let i = 0; i < 2; i++) {
    try {
      const out = await sharp(buf, { page: i, density: 180 })
        .resize({ width: 1500, withoutEnlargement: true })
        .png()
        .toBuffer();
      images.push(out.toString("base64"));
    } catch {
      break;
    }
  }
  return images;
}

async function analyzeWithClaude(userId: string, text: string, imageBase64Png: string[]) {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) throw new Error("AI is not configured");

  const content: Array<
    | { type: "text"; text: string }
    | { type: "image"; source: { type: "base64"; media_type: "image/png"; data: string } }
  > = [
    {
      type: "text",
      text: `${JSON_INSTRUCTION}\n\nResume text:\n${text.slice(0, 50_000)}`,
    },
    ...imageBase64Png.map((img) => ({
      type: "image" as const,
      source: { type: "base64" as const, media_type: "image/png" as const, data: img },
    })),
  ];

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 3200,
      system: SYSTEM,
      messages: [{ role: "user", content }],
    }),
  });

  const raw = await res.text();
  if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${raw.slice(0, 400)}`);
  const parsed = JSON.parse(raw) as AnthropicResponse;
  if (parsed.error?.message) throw new Error(parsed.error.message);
  const textOut = parsed.content?.find((b) => b.type === "text")?.text?.trim();
  if (!textOut) throw new Error("Anthropic returned no text content");

  void prisma.apiUsageLog.create({
    data: {
      userId,
      feature: "resume-review",
      inputTokens: parsed.usage?.input_tokens ?? 0,
      outputTokens: parsed.usage?.output_tokens ?? 0,
    },
  });
  return textOut;
}

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
    text = await extractResumeText(buf);
  } catch {
    return NextResponse.json({ error: "Could not read PDF" }, { status: 400 });
  }
  if (text.length < 40) {
    return NextResponse.json({ error: "Could not extract enough text from PDF" }, { status: 400 });
  }
  const clipped = text.slice(0, 50_000);

  let visualUnavailable = false;
  let images: string[] = [];
  try {
    images = await renderWithPdfJs(buf);
  } catch {
    try {
      images = await renderWithSharp(buf);
    } catch {
      images = [];
    }
  }
  if (!images.length) visualUnavailable = true;

  let raw = "";
  try {
    raw = await analyzeWithClaude(userId, clipped, images);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Resume analysis failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

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

  const feedbackWithMeta =
    typeof feedback === "object" && feedback !== null
      ? {
          ...(feedback as Record<string, unknown>),
          visualAnalysisUnavailable: visualUnavailable,
          visualAnalysisNote: visualUnavailable ? "Visual analysis unavailable — content only" : null,
        }
      : feedback;

  const review = await prisma.resumeReview.create({
    data: {
      userId,
      fileName: file.name.slice(0, 255),
      score,
      feedback: feedbackWithMeta as object,
    },
  });

  const extras = await prisma.resumeReview.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: 3,
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
    take: 3,
  });
  return NextResponse.json({ reviews });
}
