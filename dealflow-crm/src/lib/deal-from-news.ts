import "server-only";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { anthropicMessage, getAnthropicApiKey } from "@/lib/anthropic";
import { DEAL_TYPE_OPTIONS, VERTICAL_OPTIONS, normalizeDealType, normalizeVertical } from "@/lib/deal-taxonomy";

const DEAL_KEYWORD_RE = new RegExp(
  [
    "\\bacquisition",
    "acquisitions",
    "\\bmerger",
    "mergers",
    "\\bbuyout",
    "\\blbo\\b",
    "leveraged buyout",
    "takes?\\s+private",
    "take[-\\s]private",
    "\\bacquires\\b",
    "\\braises\\b",
    "\\bfunding\\b",
    "\\bipo\\b",
    "\\bspac\\b",
    "\\brestructuring\\b",
    "\\bbankruptcy\\b",
    "direct lending",
    "credit facility",
  ].join("|"),
  "i",
);

export function matchesDealKeywords(title: string, description: string | null | undefined): boolean {
  return DEAL_KEYWORD_RE.test(`${title} ${description ?? ""}`);
}

type AiIngestFields = {
  summary?: string;
  keyThesis?: string | null;
  risks?: string | null;
  acquirer?: string | null;
  target?: string | null;
  sector?: string | null;
  dealValue?: string | null;
  dealType?: string | null;
  vertical?: string | null;
};

function parseJsonObject(text: string): AiIngestFields | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as AiIngestFields;
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

  let summary = "";
  let keyThesis: string | null = null;
  let risks: string | null = null;
  let acquirer: string | null = null;
  let target: string | null = null;
  let sector: string | null = null;
  let dealValue: string | null = null;
  let dealType = normalizeDealType("M&A");
  let vertical: string | null = null;

  const typesList = DEAL_TYPE_OPTIONS.join(", ");
  const vertsList = VERTICAL_OPTIONS.join(", ");

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
          "Return ONLY valid JSON with keys:",
          "summary (string, 2-3 sentences)",
          "keyThesis (string, 1-2 sentences)",
          "risks (string, 1-2 sentences)",
          "acquirer (string or null)",
          "target (string or null)",
          "sector (short industry label or null)",
          "dealValue (short string or null)",
          `dealType (exactly one of: ${typesList})`,
          `vertical (exactly one of: ${vertsList}, or null if unclear)`,
        ].join("\n"),
        {
          maxTokens: 500,
          system: `You classify finance news for recruiting prep. Output compact JSON only, no markdown.`,
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
        dealType = normalizeDealType(parsed.dealType);
        vertical = normalizeVertical(parsed.vertical);
      }
    } catch {
      /* heuristic fallback */
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
    vertical,
    sector,
    summary: summary.slice(0, 4000),
    keyThesis: keyThesis ? keyThesis.slice(0, 2000) : null,
    risks: risks ? risks.slice(0, 2000) : null,
    sourceUrl: url.slice(0, 2000),
    announcedAt,
    dedupeKey,
    status: "draft",
  };
}
