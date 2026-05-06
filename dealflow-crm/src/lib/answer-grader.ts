export type KeywordGrade = "correct" | "partial" | "incorrect";

export type KeywordGradeResult = {
  grade: KeywordGrade;
  hitRate: number;
  foundKeywords: string[];
  missedKeywords: string[];
  suggestedAction: "known" | "partial" | "review";
  xpEarned: number;
};

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const KEYWORD_ALIASES: Record<string, string[]> = {
  bs: ["balance sheet"],
  "balance sheet": ["bs"],
  cfs: ["cash flow", "cash flow statement"],
  "cash flow": ["cfs", "cash flow statement"],
  "cash flow statement": ["cfs", "cash flow"],
  is: ["income statement"],
  "income statement": ["is"],
  ni: ["net income"],
  "net income": ["ni"],
  "d a": ["depreciation"],
  "d&a": ["depreciation"],
  depreciation: ["d&a", "d a"],
};

function uniqueKeywords(keywords: string[]) {
  return Array.from(
    new Set(
      keywords
        .map((k) => normalizeText(k))
        .filter((k) => k.length >= 2),
    ),
  );
}

function variantsForKeyword(keyword: string): string[] {
  const base = normalizeText(keyword);
  const aliases = KEYWORD_ALIASES[base] ?? [];
  return Array.from(new Set([base, ...aliases.map((a) => normalizeText(a))])).filter(Boolean);
}

function matchesVariant(normalizedUser: string, variant: string) {
  if (!variant) return false;
  const exactPattern = new RegExp(`\\b${escapeRegExp(variant)}\\b`, "i");
  if (exactPattern.test(normalizedUser)) return true;

  // Phrase-aware fallback: if all key terms from a phrase are present, treat as a match.
  const tokens = variant
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !["the", "and", "for", "with"].includes(t));
  if (tokens.length >= 2) {
    return tokens.every((t) => new RegExp(`\\b${escapeRegExp(t)}\\b`, "i").test(normalizedUser));
  }
  return false;
}

export function gradeAnswerByKeywords(input: {
  userAnswer: string;
  modelAnswer: string;
  keywords?: string[];
}): KeywordGradeResult {
  const normalizedUser = normalizeText(input.userAnswer);
  const normalizedModel = normalizeText(input.modelAnswer);
  const seedKeywords = input.keywords && input.keywords.length > 0 ? input.keywords : normalizedModel.split(" ").slice(0, 6);
  const keywords = uniqueKeywords(seedKeywords);

  if (keywords.length === 0) {
    return {
      grade: "incorrect",
      hitRate: 0,
      foundKeywords: [],
      missedKeywords: [],
      suggestedAction: "review",
      xpEarned: 0,
    };
  }

  const foundKeywords = keywords.filter((kw) => variantsForKeyword(kw).some((v) => matchesVariant(normalizedUser, v)));
  const missedKeywords = keywords.filter((kw) => !foundKeywords.includes(kw));
  const hitRate = foundKeywords.length / keywords.length;

  if (hitRate >= 0.6) {
    return {
      grade: "correct",
      hitRate,
      foundKeywords,
      missedKeywords,
      suggestedAction: "known",
      xpEarned: 10,
    };
  }
  if (hitRate >= 0.3) {
    return {
      grade: "partial",
      hitRate,
      foundKeywords,
      missedKeywords,
      suggestedAction: "partial",
      xpEarned: 5,
    };
  }
  return {
    grade: "incorrect",
    hitRate,
    foundKeywords,
    missedKeywords,
    suggestedAction: "review",
    xpEarned: 0,
  };
}
