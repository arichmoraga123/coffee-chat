import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { getAnthropicApiKey } from "@/lib/anthropic";
import { CAREER_TRACK_OPTIONS } from "@/lib/career-tracks";
import { getPrimaryTrack } from "@/lib/track-utils";

const CAREER_TRACK_SET = new Set<string>(CAREER_TRACK_OPTIONS);

export const maxDuration = 60;
const MAX_RETRIES = 3;

const COMMON_SCHEMA_PROMPT = `Return ONLY valid JSON with no markdown or explanation using this exact structure:
{
  "overallScore": number,
  "oneLiner": string,
  "recruitingReadiness": string,
  "targetTrack": string,
  "top5Improvements": string[],
  "sections": {
    "formatting": {
      "grade": string,
      "feedback": string,
      "issues": string[],
      "fixes": string[]
    },
    "experience": {
      "grade": string,
      "feedback": string,
      "weakBullets": [
        {
          "original": string,
          "problem": string,
          "rewritten": string
        }
      ]
    },
    "education": {
      "grade": string,
      "feedback": string,
      "issues": string[]
    },
    "skills": {
      "grade": string,
      "feedback": string,
      "missing": string[],
      "suggestions": string[]
    },
    "trackSpecific": {
      "grade": string,
      "feedback": string,
      "strengths": string[],
      "gaps": string[]
    }
  },
  "topFirmsMatch": [
    {
      "firm": string,
      "fitScore": number,
      "reason": string
    }
  ]
}`;

const TRACK_PROMPTS: Record<string, string> = {
  "Investment Banking":
    "You are a senior recruiter at a top bulge-bracket or elite boutique investment bank reviewing for IB analyst/summer analyst roles only — not PE or consulting. Evaluate THIS resume only against IB recruiting norms. Look specifically for: M&A deal exposure (live deals, sell-side/buy-side, announced transactions), pitchbook and CIM experience, financial modeling (3-statement, comps, precedents, DCF as relevant), client coverage exposure, strong GPA presentation, BB/EB target-firm interest and internships, and evidence of banking-style execution. Penalize: PE-style sourcing memos framed without IB relevance, vague deal bullets, missing quantification, or clutter unrelated to IB.",
  "Private Equity":
    "You are a hiring manager at a middle-market or large-cap PE fund reviewing for analyst/associate recruiting only — not investment banking interviews. Evaluate THIS resume only against PE recruiting norms (distinct from IB). Look specifically for: LBO modeling depth, deal sourcing, portfolio monitoring, operational improvement experience, investment memos / IC materials, PE club leadership, on-cycle and off-cycle recruiting awareness, and sponsor coverage experience (working with sponsor clients or GP-led processes where applicable). Penalize: IB-only deal lists with no investor or LBO lens, generic finance wording, or missing evidence of judgment and ownership.",
  "Venture Capital":
    "You are a senior investor at a venture fund reviewing for VC analyst/intern roles. Look for: startup evaluation, market sizing, founder empathy, product sense, technical or sector depth, sourcing, and any investing club or angel exposure. Penalize: resumes that are only IB-style without startup or innovation angle.",
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
  "Hedge Fund":
    "You are a senior allocator at a multi-strategy hedge fund reviewing for research or trading analyst roles — not IB or PE. Look for: alpha-generating research, short pitches, factor/stat arb or macro exposure, risk framing, P&L ownership where appropriate, and coding/stats depth. Penalize: generic IB deal lists without public-markets or PM lens.",
  "Private Credit":
    "You are a senior recruiter at a direct lending or credit fund — not leveraged finance IB. Look for: credit analysis, covenant fluency, direct lending or syndicated loan exposure, workout/restructuring awareness, and memo writing for credit committees. Penalize: bullets that only describe M&A execution with no credit angle.",
  "Real Estate":
    "You are a senior recruiter at a real estate PE or REIT group. Look for: Argus or property modeling, cap rates, development or acquisitions exposure, market selection, debt sizing on deals, and internships in real estate finance. Penalize: generic 'finance' without property or REPE context.",
  Actuarial:
    "You are a senior actuarial hiring manager at a major insurer or consultancy. Look for: exam progress (SOA/CAS pathway), programming (R, Python, SQL), stochastic modeling coursework, internships in pricing or risk, attention to detail in formatting. Penalize: vague 'analytical' claims without exam or technical evidence.",
};

const FALLBACK_PROMPT =
  "You are a senior recruiter with 15 years of experience reviewing resumes. You have reviewed over 10,000 resumes from target and non-target schools. You give direct, specific, actionable feedback.";

const JSON_INSTRUCTION =
  "Analyze the resume document deeply. Infer formatting quality from extracted structure and text patterns where needed. Detect date formatting consistency, bullet character consistency, line-length alignment patterns, and capitalization consistency. Prioritize specific fixes and quantifiable rewrite guidance.";

type AnthropicResponse = {
  content?: Array<{ type?: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string };
};

function extractJSON(text: string): string {
  try {
    JSON.parse(text);
    return text;
  } catch {}
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }
  throw new Error("No JSON found in response");
}

function resolveTargetTrack(requestedTrack: string, careerTracks: string[]): string {
  const req = requestedTrack.trim();
  if (careerTracks.length > 0) {
    return careerTracks.includes(req) ? req : getPrimaryTrack(careerTracks);
  }
  if (req && (TRACK_PROMPTS[req] || CAREER_TRACK_SET.has(req) || req === "General")) return req;
  return "General";
}

function getTrackPrompt(track: string) {
  const base = TRACK_PROMPTS[track] ?? FALLBACK_PROMPT;
  const singleTrack =
    "CRITICAL: Grade this resume for ONLY this one target track. Do not blend, average, or mix criteria from other tracks (e.g. if the track is Investment Banking, do not apply Private Equity sourcing expectations, and vice versa).";
  const financeStyle = new Set([
    "Investment Banking",
    "Private Equity",
    "Venture Capital",
    "Hedge Fund",
    "Private Credit",
    "Corporate Finance",
    "Capital Markets",
    "Asset Management",
    "Equity Research",
    "Real Estate",
  ]);
  const scoring = financeStyle.has(track)
    ? "Scoring weights: trackSpecific 30%, Experience 30%, Formatting 20%, Education 15%, Skills 5%."
    : track === "Consulting"
      ? "Scoring weights: Experience/Leadership 35%, Education 25%, Formatting 20%, trackSpecific 20%."
      : track === "Sales & Trading"
        ? "Scoring weights: Skills/Quant 35%, Experience 30%, Education 20%, Formatting 15%."
        : track === "Big 4 Accounting" || track === "Actuarial"
          ? "Scoring weights: Education/GPA 30%, Experience 30%, Skills 25%, Formatting 15%."
          : track === "Wealth Management" || track === "Tech/Startup"
            ? "Scoring weights: Experience 35%, trackSpecific 25%, Formatting 20%, Education 12%, Skills 8%."
            : "Scoring weights: equal weight across sections.";
  return `${singleTrack}\n\n${base}\n${scoring}\nKeep all text values SHORT. Feedback strings max 2 sentences. Issue/fix strings max 1 sentence. This ensures the response fits within token limits.\n${COMMON_SCHEMA_PROMPT}`;
}

async function analyzeWithClaude(userId: string, pdfBase64: string, track: string, retryAttempt: number) {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) throw new Error("AI is not configured");
  const retryPrefix =
    retryAttempt > 0 ? "Previous attempt failed. Return ONLY valid JSON, nothing else.\n\n" : "";

  const content: Array<
    | { type: "text"; text: string }
    | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
  > = [
    {
      type: "text",
      text: `${retryPrefix}${JSON_INSTRUCTION}\nTarget track: ${track}\n\nAnalyze the PDF directly. If visual layout is imperfectly recoverable, infer likely visual issues from document structure.\n\nCRITICAL: Your entire response must be a single valid JSON object. No text before or after. No markdown. No backticks. Start with { and end with }. Nothing else.`,
    },
    {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: pdfBase64,
      },
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
      max_tokens: 2500,
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

    console.log("[resume-review] reading file buffer + encoding base64");
    const buf = Buffer.from(await file.arrayBuffer());
    const pdfBase64 = buf.toString("base64");
    if (!pdfBase64.length) {
      return NextResponse.json({ error: "Could not read PDF bytes" }, { status: 400 });
    }
    const requestedTrack = String(form.get("targetTrack") ?? "").trim();
    const careerTracks = profile?.careerTracks ?? [];
    const targetTrack = resolveTargetTrack(requestedTrack, careerTracks);
    console.log("[resume-review] target track", targetTrack, "requested", requestedTrack);

    console.log("[resume-review] calling claude with retry");
    let feedback: unknown = null;
    let attempt = 0;
    while (attempt < MAX_RETRIES && !feedback) {
      try {
        const raw = await analyzeWithClaude(userId, pdfBase64, targetTrack, attempt);
        feedback = JSON.parse(extractJSON(raw));
      } catch (error) {
        attempt += 1;
        console.log(`[resume-review] attempt ${attempt} failed, retrying...`);
        if (attempt === MAX_RETRIES) {
          console.error("[resume-review] invalid json after retries", error);
          return NextResponse.json({ error: "AI returned invalid JSON — try again" }, { status: 500 });
        }
      }
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
            visualAnalysisUnavailable: false,
            visualAnalysisNote: null,
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
