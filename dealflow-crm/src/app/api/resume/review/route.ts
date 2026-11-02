import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { anthropicJsonWithProgress, getAnthropicApiKey } from "@/lib/anthropic";
import { CAREER_TRACK_OPTIONS } from "@/lib/career-tracks";
import { getPrimaryTrack } from "@/lib/track-utils";
import { RESUME_V2, V2_KEEP, postV2 } from "./v2";

const CAREER_TRACK_SET = new Set<string>(CAREER_TRACK_OPTIONS);

export const maxDuration = 120;

const str = { type: "string" };
const strArr = { type: "array", items: str };
const obj = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

/** Structured-output schema: the API guarantees the reply matches it (no JSON retries). */
const REVIEW_SCHEMA = obj({
  overallScore: { type: "integer" },
  oneLiner: str,
  recruitingReadiness: { type: "string", enum: ["Not Ready", "Developing", "Ready", "Strong"] },
  targetTrack: str,
  top5Improvements: strArr,
  sections: obj({
    formatting: obj({ grade: str, feedback: str, issues: strArr, fixes: strArr }),
    experience: obj({
      grade: str,
      feedback: str,
      weakBullets: { type: "array", items: obj({ original: str, problem: str, rewritten: str }) },
    }),
    education: obj({ grade: str, feedback: str, issues: strArr }),
    skills: obj({ grade: str, feedback: str, missing: strArr, suggestions: strArr }),
    trackSpecific: obj({ grade: str, feedback: str, strengths: strArr, gaps: strArr }),
  }),
  topFirmsMatch: { type: "array", items: obj({ firm: str, fitScore: { type: "integer" }, reason: str }) },
});

/** Rough size of a complete review, used only to drive the progress bar. */
const EXPECTED_REVIEW_CHARS = 5500;

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
  return `${singleTrack}\n\n${base}\n${scoring}\noverallScore is 0-100. Keep text SHORT: feedback max 2 sentences, issues/fixes max 1 sentence each. Give 3-5 weakBullets quoted verbatim from the resume with strong rewrites (action verb + what + quantified result). top5Improvements must be specific and ordered by impact. topFirmsMatch: 3-5 realistic target firms for this candidate.`;
}

type ReviewJson = { overallScore: number } & Record<string, unknown>;

async function analyzeWithClaude(
  userId: string,
  pdfBase64: string,
  track: string,
  onText: (soFar: string) => void,
): Promise<ReviewJson> {
  return anthropicJsonWithProgress<ReviewJson>(
    [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
      {
        type: "text",
        text: `${JSON_INSTRUCTION}\nTarget track: ${track}\n\nAnalyze the PDF directly, including its visual layout.`,
      },
    ],
    REVIEW_SCHEMA,
    {
      system: getTrackPrompt(track),
      maxTokens: 6000,
      effort: "low",
      usageLog: { userId, feature: "resume-review" },
    },
    onText,
  );
}

export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromSession();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!getAnthropicApiKey()) {
      return NextResponse.json({ error: "AI is not configured" }, { status: 503 });
    }
    if (RESUME_V2()) return await postV2(req, userId);

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

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "PDF is too large (max 8 MB). Export a smaller file and try again." }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const pdfBase64 = buf.toString("base64");
    if (!pdfBase64.length) {
      return NextResponse.json({ error: "Could not read PDF bytes" }, { status: 400 });
    }
    const requestedTrack = String(form.get("targetTrack") ?? "").trim();
    const careerTracks = profile?.careerTracks ?? [];
    const targetTrack = resolveTargetTrack(requestedTrack, careerTracks);

    const fileName = file.name.slice(0, 255);

    // Stream newline-delimited JSON events so the UI can show live progress and the score early.
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: Record<string, unknown>) =>
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        let lastPct = 0;
        let sentScore = false;
        try {
          send({ type: "progress", pct: 3, stage: "Reading your resume" });
          const feedback = await analyzeWithClaude(userId, pdfBase64, targetTrack, (soFar) => {
            const pct = Math.min(95, 5 + Math.round((soFar.length / EXPECTED_REVIEW_CHARS) * 90));
            if (!sentScore) {
              const m = /"overallScore"\s*:\s*(\d+)\s*[,}]/.exec(soFar);
              if (m) {
                sentScore = true;
                send({ type: "score", score: Math.min(100, Number(m[1])) });
              }
            }
            if (pct >= lastPct + 3) {
              lastPct = pct;
              send({ type: "progress", pct });
            }
          });

          const score = Math.min(100, Math.max(0, Math.round(Number(feedback.overallScore) || 0)));
          const review = await prisma.resumeReview.create({
            data: {
              userId,
              fileName,
              score,
              feedback: { ...feedback, targetTrack, visualAnalysisUnavailable: false, visualAnalysisNote: null },
            },
          });

          const extras = await prisma.resumeReview.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            skip: 3,
            select: { id: true },
          });
          if (extras.length) {
            await prisma.resumeReview.deleteMany({ where: { id: { in: extras.map((e) => e.id) } } });
          }
          send({ type: "done", review });
        } catch (error) {
          console.error("[resume-review] failed", error);
          send({ type: "error", error: error instanceof Error ? error.message : "Resume review failed" });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(body, {
      headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" },
    });
  } catch (error) {
    console.error("[resume-review] unexpected error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Resume review failed unexpectedly" },
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
    take: RESUME_V2() ? V2_KEEP : 3,
  });
  return NextResponse.json({ reviews });
}
