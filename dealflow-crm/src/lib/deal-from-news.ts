import "server-only";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { anthropicJson, getAnthropicApiKey } from "@/lib/anthropic";
import { DEAL_TYPE_OPTIONS, VERTICAL_OPTIONS, normalizeDealType, normalizeVertical } from "@/lib/deal-taxonomy";

const DEAL_KEYWORD_RE = new RegExp(
  [
    "\\bacquisition",
    "acquisitions",
    "\\bacquire",
    "\\bmerger",
    "mergers",
    "\\bbuyout",
    "\\blbo\\b",
    "leveraged buyout",
    "takes?\\s+private",
    "take[-\\s]private",
    "\\bacquires\\b",
    "\\bto buy\\b",
    "\\bagrees? to buy\\b",
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

/** "$17 billion", "$3.5bn", "US$800 million", "€5bn", "$450M" */
const DOLLAR_AMOUNT_RE =
  /(?:US)?[$€£]\s?\d[\d,]*(?:\.\d+)?\s?(?:billion|bn|b|million|mn|m|trillion|tn)\b/i;

export function matchesDealKeywords(title: string, description: string | null | undefined): boolean {
  return DEAL_KEYWORD_RE.test(`${title} ${description ?? ""}`);
}

export function extractDollarAmount(text: string): string | null {
  const m = DOLLAR_AMOUNT_RE.exec(text);
  if (!m) return null;
  return m[0]
    .replace(/^US/i, "")
    .replace(/\s+/g, "")
    .replace(/billion|bn/i, "B")
    .replace(/million|mn/i, "M")
    .replace(/trillion|tn/i, "T")
    .replace(/([0-9])b$/i, "$1B")
    .replace(/([0-9])m$/i, "$1M");
}

type AiDeal = {
  isTransaction: boolean;
  dealValue: string | null;
  title: string;
  summary: string;
  keyThesis: string;
  risks: string;
  acquirer: string | null;
  target: string | null;
  sector: string | null;
  dealType: string;
  vertical: string | null;
};

const nullableStr = { anyOf: [{ type: "string" }, { type: "null" }] };
const SCHEMA = {
  type: "object",
  properties: {
    isTransaction: { type: "boolean" },
    dealValue: nullableStr,
    title: { type: "string" },
    summary: { type: "string" },
    keyThesis: { type: "string" },
    risks: { type: "string" },
    acquirer: nullableStr,
    target: nullableStr,
    sector: nullableStr,
    dealType: { type: "string", enum: [...DEAL_TYPE_OPTIONS] },
    vertical: { anyOf: [{ type: "string", enum: [...VERTICAL_OPTIONS] }, { type: "null" }] },
  },
  required: [
    "isTransaction",
    "dealValue",
    "title",
    "summary",
    "keyThesis",
    "risks",
    "acquirer",
    "target",
    "sector",
    "dealType",
    "vertical",
  ],
  additionalProperties: false,
};

const SYSTEM = `You turn finance news into deal cards for college students preparing for investment banking and PE interviews.
- isTransaction = true ONLY if the article reports a specific, agreed or completed transaction (signed M&A, take-private, completed/priced IPO, closed funding round, announced debt financing) with a disclosed dollar value. Rumors, "in talks", "exploring a sale", market commentary, earnings and opinion pieces are false.
- dealValue: the headline value in short form like "$17B", "$850M", "$15.3B EV". Null if no figure is stated in the text. Never invent numbers.
- title: "<Acquirer> to acquire <Target> for <value>" style, under 90 characters.
- summary: 2–3 factual sentences using only facts in the text (price per share, premium, financing, timing if stated).
- keyThesis: 1–2 sentences on the strategic or investment rationale.
- risks: 1–2 sentences on key risks (regulatory, valuation, leverage, integration).`;

const dedupe = (title: string) => createHash("sha256").update(`newsdeal|${title.toLowerCase()}`).digest("hex");

/**
 * Builds a deal card from a news article. Returns null unless the article describes a real
 * transaction with a dollar amount — those are published automatically to the Deals feed.
 */
export async function buildNewsDealRow(input: {
  title: string;
  description: string | null;
  url: string;
  announcedAt: Date;
}): Promise<Prisma.DealCreateManyInput | null> {
  const { title, description, url, announcedAt } = input;
  const headline = title.trim().slice(0, 500);
  if (!headline) return null;
  const text = `${headline} ${description ?? ""}`;
  const regexValue = extractDollarAmount(text);

  if (getAnthropicApiKey()) {
    try {
      const ai = await anthropicJson<AiDeal>(
        `Headline: ${headline}\n\nExcerpt: ${description?.trim() || "(none)"}`,
        SCHEMA,
        { system: SYSTEM, effort: "low", maxTokens: 1500 },
      );
      const value = ai.dealValue?.trim() || regexValue;
      if (!ai.isTransaction || !value) return null;
      const cardTitle = (ai.title?.trim() || headline).slice(0, 500);
      return {
        title: cardTitle,
        acquirer: ai.acquirer?.trim() || null,
        target: ai.target?.trim() || null,
        sector: ai.sector?.trim() || null,
        dealValue: value,
        dealType: normalizeDealType(ai.dealType),
        vertical: normalizeVertical(ai.vertical),
        summary: (ai.summary?.trim() || headline).slice(0, 4000),
        keyThesis: ai.keyThesis?.trim().slice(0, 2000) || null,
        risks: ai.risks?.trim().slice(0, 2000) || null,
        sourceUrl: url.slice(0, 2000),
        announcedAt,
        dedupeKey: dedupe(cardTitle),
        status: "published",
      };
    } catch {
      /* fall through to the heuristic below */
    }
  }

  // No AI available: only keep clear-cut headlines (deal verb + explicit dollar figure).
  const clearDeal = /\b(acquire|acquires|to buy|agrees? to buy|merge|take[-\s]private|buyout)\b/i.test(headline);
  if (!regexValue || !clearDeal || /\b(talks|explor|consider|weigh|rumou?r|report(ed|edly)?)\b/i.test(headline)) {
    return null;
  }
  return {
    title: headline,
    acquirer: null,
    target: null,
    sector: null,
    dealValue: regexValue,
    dealType: normalizeDealType("M&A"),
    vertical: null,
    summary: [description?.trim(), headline].filter(Boolean).join(" — ").slice(0, 2000),
    keyThesis: null,
    risks: null,
    sourceUrl: url.slice(0, 2000),
    announcedAt,
    dedupeKey: dedupe(headline),
    status: "published",
  };
}
