import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { getAnthropicApiKey } from "@/lib/anthropic";
import { getPrimaryTrack } from "@/lib/track-utils";

const COMMON_SCHEMA_PROMPT = `Return ONLY valid JSON with no markdown or explanation using this exact structure:
{
  overallScore: number (0-100),
  oneLiner: string,
  recruitingReadiness: string,
  targetTrack: string,
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
      score: number,
      grade: string,
      feedback: string,
      issues: string[],
      fixes: string[]
    },
    experience: {
      score: number,
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
      score: number,
      grade: string,
      feedback: string,
      issues: string[]
    },
    skills: {
      score: number,
      grade: string,
      feedback: string,
      missing: string[],
      suggestions: string[]
    },
    trackSpecific: {
      score: number,
      grade: string,
      feedback: string,
      strengths: string[],
      gaps: string[]
    }
  },
  topFirmsMatch: [
    {
      firm: string,
      fitScore: number,
      reason: string
    }
  ],
  top5Improvements: string[]
}`;

const TRACK_PROMPTS: Record<string, string> = {
  "Investment Banking":
    "You are a senior recruiter at Goldman Sachs IBD with 15 years experience reviewing resumes. You have reviewed over 10,000 resumes from target and non-target schools. Look for: deal experience, modeling skills, GPA prominence, quantified achievements, finance internships, relevant clubs (investment club, PE club), clean one-page format, strong action verbs (executed, analyzed, modeled, advised). Penalize: vague bullets, missing quantification, irrelevant experience taking up prime resume space.",
  "Private Equity":
    "You are a senior recruiter at Goldman Sachs IBD with 15 years experience reviewing resumes. You have reviewed over 10,000 resumes from target and non-target schools. Look for: deal experience, modeling skills, GPA prominence, quantified achievements, finance internships, relevant clubs (investment club, PE club), clean one-page format, strong action verbs (executed, analyzed, modeled, advised). Penalize: vague bullets, missing quantification, irrelevant experience taking up prime resume space.",
  "Venture Capital":
    "You are a senior recruiter at Goldman Sachs IBD with 15 years experience reviewing resumes. You have reviewed over 10,000 resumes from target and non-target schools. Look for: deal experience, modeling skills, GPA prominence, quantified achievements, finance internships, relevant clubs (investment club, PE club), clean one-page format, strong action verbs (executed, analyzed, modeled, advised). Penalize: vague bullets, missing quantification, irrelevant experience taking up prime resume space.",
  Consulting:
    "You are a senior recruiter at McKinsey & Company. Look for: leadership experiences, impact metrics, problem-solving examples, diversity of experience, GPA prominence, case competition wins, structured bullet points showing situation-action-result, communication skills evident in descriptions. Consulting resumes value breadth over depth — penalize resumes that are too finance-heavy and lack leadership and impact stories.",
  "Sales & Trading":
    "You are a senior S&T recruiter at Morgan Stanley. Look for: quantitative skills, markets knowledge, fast-paced environment experience, any trading or risk experience, relevant coursework (stats, econometrics, programming), Bloomberg experience, concise punchy bullets. Penalize: long-winded descriptions, lack of quant evidence.",
  "Asset Management":
    "You are a senior recruiter at BlackRock. Look for: investment thesis experience, stock pitches, portfolio management exposure, CFA progress, deep sector knowledge, research experience, written communication quality. Penalize: no evidence of independent investment thinking.",
  "Equity Research":
    "You are a senior recruiter at BlackRock. Look for: investment thesis experience, stock pitches, portfolio management exposure, CFA progress, deep sector knowledge, research experience, written communication quality. Penalize: no evidence of independent investment thinking.",
  "Big 4 Accounting":
    "You are a senior campus recruiter at PwC. Look for: accounting coursework (GAAP, audit, tax), CPA exam eligibility, Excel proficiency, attention to detail in formatting, internship experience at accounting firms, relevant certifications, leadership in accounting clubs.",
  "Wealth Management":
    "You are a senior recruiter at Morgan Stanley Wealth Management. Look for: client-facing experience, communication skills, Series 7/66 awareness, financial planning knowledge, relationship building examples. Penalize: no evidence of interpersonal or client service skills.",
  "Corporate Finance":
    "You are a senior finance recruiter at a Fortune 500. Look for: Excel/financial modeling, budgeting experience, cross-functional work, communication with non-finance stakeholders, operational understanding, accounting foundation.",
  "Capital Markets":
    "You are a senior DCM/ECM recruiter at JPMorgan. Look for: markets knowledge, debt/equity products understanding, financial modeling, client coverage experience, ability to work under time pressure.",
  "Tech/Startup":
    "You are a senior recruiter at Google. Look for: technical skills (programming languages), project experience, quantified impact, startup experience, product thinking, GitHub/portfolio links, internship progression.",
};

const FALLBACK_PROMPT =
  "You are a senior recruiter at Goldman Sachs with 15 years of experience reviewing resumes for IB, PE, and consulting roles. You have reviewed over 10,000 resumes from target and non-target schools. You give direct, specific, actionable feedback.";

const JSON_INSTRUCTION =
  "Analyze the resume text and infer formatting quality from text patterns. Detect date formatting consistency, bullet character consistency, line-length alignment patterns, and capitalization consistency. Prioritize specific fixes and quantifiable rewrite guidance.";

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

function getTrackPrompt(track: string) {
  const base = TRACK_PROMPTS[track] ?? FALLBACK_PROMPT;
  const scoring =
    track === "Investment Banking" || track === "Private Equity" || track === "Venture Capital"
      ? "Scoring weights: trackSpecific 30%, Experience 30%, Formatting 20%, Education 15%, Skills 5%."
      : track === "Consulting"
        ? "Scoring weights: Experience/Leadership 35%, Education 25%, Formatting 20%, trackSpecific 20%."
        : track === "Sales & Trading"
          ? "Scoring weights: Skills/Quant 35%, Experience 30%, Education 20%, Formatting 15%."
          : track === "Big 4 Accounting"
            ? "Scoring weights: Education/GPA 30%, Experience 30%, Skills 25%, Formatting 15%."
            : "Scoring weights: equal weight across sections.";
  return `${base}\n${scoring}\n${COMMON_SCHEMA_PROMPT}`;
}

async function analyzeWithClaude(userId: string, text: string, track: string) {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) throw new Error("AI is not configured");

  const content: Array<{ type: "text"; text: string }> = [
    {
      type: "text",
      text: `${JSON_INSTRUCTION}\nTarget track: ${track}\n\nAnalyze the text for formatting patterns and infer visual issues from the structure of the extracted text.\n\nResume text:\n${text.slice(0, 50_000)}`,
    },
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
      system: getTrackPrompt(track),
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
  try {
    console.log("[resume-review] POST start");
    const userId = await getUserIdFromSession();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!getAnthropicApiKey()) {
      return NextResponse.json({ error: "AI is not configured" }, { status: 503 });
    }

    console.log("[resume-review] parsing formData");
    const form = await req.formData();
    const profile = await prisma.user.findUnique({
      where: { id: userId },
      select: { careerTracks: true },
    });
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "PDF only" }, { status: 400 });
    }

    console.log("[resume-review] reading file buffer");
    const buf = Buffer.from(await file.arrayBuffer());
    console.log("[resume-review] extracting text");
    let text = "";
    try {
      text = await extractResumeText(buf);
    } catch (error) {
      console.error("[resume-review] text extraction failed", error);
      return NextResponse.json({ error: "Could not read PDF" }, { status: 400 });
    }
    if (text.length < 40) {
      return NextResponse.json({ error: "Could not extract enough text from PDF" }, { status: 400 });
    }
    const clipped = text.slice(0, 50_000);
    const requestedTrack = String(form.get("targetTrack") ?? "").trim();
    const userPrimaryTrack = getPrimaryTrack(profile?.careerTracks ?? []);
    const targetTrack = requestedTrack || userPrimaryTrack || "General";
    console.log("[resume-review] target track", targetTrack);

    console.log("[resume-review] calling claude");
    let raw = "";
    try {
      raw = await analyzeWithClaude(userId, clipped, targetTrack);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Resume analysis failed";
      console.error("[resume-review] claude call failed", msg);
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    console.log("[resume-review] parsing claude json");
    let feedback: unknown;
    try {
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start === -1 || end <= start) throw new Error("no json");
      feedback = JSON.parse(raw.slice(start, end + 1));
    } catch (error) {
      console.error("[resume-review] invalid json", error);
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
            targetTrack,
            visualAnalysisUnavailable: true,
            visualAnalysisNote: "Visual analysis inferred from extracted text patterns only",
          }
        : feedback;

    console.log("[resume-review] saving review");
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

    console.log("[resume-review] POST success");
    return NextResponse.json({ review });
  } catch (error) {
    console.error("[resume-review] unexpected error", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Resume review failed unexpectedly",
      },
      { status: 500 },
    );
  }
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
