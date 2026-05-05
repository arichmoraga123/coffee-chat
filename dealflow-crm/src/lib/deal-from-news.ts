import "server-only";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { anthropicMessage, getAnthropicApiKey } from "@/lib/anthropic";

/** Headline + description must match one of these (case-insensitive). */
const DEAL_KEYWORD_RE =
  /\b(acquisition|acquisitions|merger|mergers|merging|buyout|buyouts|\blbo\b|leveraged buyout|takes?\s+private|take[-\s]private)\b/i;

export function matchesDealKeywords(title: string, description: string | null | undefined): boolean {
  return DEAL_KEYWORD_RE.test(`${title} ${description ?? ""}`);
}

export function classifyDealType(title: string, description: string | null | undefined): "IPO" | "LBO" | "M&A" {
  const blob = `${title} ${description ?? ""}`;
  if (/\bipo\b|initial public offering|going public|lists on the/i.test(blob)) return "IPO";
  if (/\bbuyout\b|take[-\s]?private|takes\s+private|\blbo\b|leveraged buyout/i.test(blob)) return "LBO";
  if (/\bacquisition|\bmergers?\b|\bm&a\b|\bmerge\b/i.test(blob)) return "M&A";
  return "M&A";
}

type AiDealFields = {
  summary?: string;
  keyThesis?: string | null;
  risks?: string | null;
  acquirer?: string | null;
  target?: string | null;
  sector?: string | null;
  dealValue?: string | null;
};

function parseJsonObject(text: string): AiDealFields | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as AiDealFields;
  } catch {
    return null;
  }
}

export async function buildNewsDealRow(input: {
  title: string;
  description: string | null;
  url: string;
  announcedAt: Date;
}): Promise<Prisma.DealCreateManyInput | null> {
  const { title, description, url, announcedAt } = input;
  const normalizedTitle = title.trim().slice(0, 500);
  if (!normalizedTitle) return null;

  const dealType = classifyDealType(normalizedTitle, description);
  let summary = "";
  let keyThesis: string | null = null;
  let risks: string | null = null;
  let acquirer: string | null = null;
  let target: string | null = null;
  let sector: string | null = null;
  let dealValue: string | null = null;

  if (getAnthropicApiKey()) {
    try {
      const raw = await anthropicMessage(
        [
          "News headline:",
          normalizedTitle,
          "",
          "Description or excerpt:",
          description?.trim() || "(none)",
          "",
          "Return ONLY valid JSON with these keys:",
          "summary (string, 2–3 sentences overview for candidates)",
          "keyThesis (string, 2–3 sentences on strategic / investment rationale)",
          "risks (string, 2–3 sentences on execution, regulatory, or market risks)",
          "acquirer (string or null)",
          "target (string or null)",
          "sector (short industry label or null)",
          "dealValue (short human-readable string or null if unknown)",
        ].join("\n"),
        {
          maxTokens: 900,
          system:
            "You are a concise investment banking analyst. Output compact JSON only, no markdown fences or commentary.",
        },
      );
      const parsed = parseJsonObject(raw);
      if (parsed?.summary?.trim()) {
        summary = parsed.summary.trim();
        keyThesis = parsed.keyThesis?.trim() || null;
        risks = parsed.risks?.trim() || null;
        acquirer = parsed.acquirer?.trim() || null;
        target = parsed.target?.trim() || null;
        sector = parsed.sector?.trim() || null;
        dealValue = parsed.dealValue?.trim() || null;
      }
    } catch {
      /* fall through to heuristic summary */
    }
  }

  if (!summary) {
    summary = [description?.trim(), normalizedTitle].filter(Boolean).join(" — ").slice(0, 2000);
  }
  if (!summary.trim()) summary = normalizedTitle;

  const dedupeKey = createHash("sha256")
    .update(`newsdeal|${normalizedTitle.toLowerCase()}`)
    .digest("hex");

  return {
    title: normalizedTitle,
    acquirer,
    target,
    dealValue,
    dealType,
    sector,
    summary: summary.slice(0, 4000),
    keyThesis: keyThesis ? keyThesis.slice(0, 2000) : null,
    risks: risks ? risks.slice(0, 2000) : null,
    sourceUrl: url.slice(0, 2000),
    announcedAt,
    dedupeKey,
  };
}
