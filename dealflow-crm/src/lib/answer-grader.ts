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

function uniqueKeywords(keywords: string[]) {
  return Array.from(
    new Set(
      keywords
        .map((k) => normalizeText(k))
        .filter((k) => k.length >= 2),
    ),
  );
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

  const foundKeywords = keywords.filter((kw) => {
    const pattern = new RegExp(`\\b${escapeRegExp(kw)}\\b`, "i");
    return pattern.test(normalizedUser);
  });
  const missedKeywords = keywords.filter((kw) => !foundKeywords.includes(kw));
  const hitRate = foundKeywords.length / keywords.length;

  if (hitRate >= 0.8) {
    return {
      grade: "correct",
      hitRate,
      foundKeywords,
      missedKeywords,
      suggestedAction: "known",
      xpEarned: 10,
    };
  }
  if (hitRate >= 0.5) {
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
