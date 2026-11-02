/**
 * Fit (behavioral) questions — Fit & Practice spec F2. Types and the no-AI helpers: which questions are
 * about a specific firm / city / group, assembling a draft from the outline template, speaking time and
 * generic-phrase checks. Client-safe and script-safe.
 */
import fitData from "../../content/fit/PEB_Fit_Questions.json";

export type BuilderField = { key: string; label: string; hint?: string };
export type FitQuestion = {
  id: string;
  category: string;
  prompt: string;
  whatTheyreTesting: string;
  framework: string[];
  mustInclude: string[];
  avoid: string[];
  builderFields: BuilderField[];
  outlineTemplate: string;
  likelyFollowUps: string[];
  suggestedStoryThemes: string[];
  targetLengthSeconds: string;
};
export type FitData = { version: number; categories: string[]; questions: FitQuestion[] };

export const FIT_DATA = fitData as unknown as FitData;

export type VariantKind = "firm" | "city" | "group" | null;

/** Questions answered once per firm, city or group (each choice is its own saved version). */
export function variantKind(q: Pick<FitQuestion, "id" | "prompt" | "category">): VariantKind {
  const p = q.prompt.toLowerCase();
  if (/\[city\]/.test(p) || q.id === "why-city") return "city";
  if (/\[(coverage or product group|group|this group)\]/.test(p) || q.id === "why-group" || q.id === "why-not-other-group") return "group";
  if (/\[firm\]/.test(p) || q.id === "why-firm") return "firm";
  return null;
}

/** The prompt with the chosen firm / city / group filled in. */
export function promptFor(q: FitQuestion, variant: string): string {
  if (!variant) return q.prompt;
  return q.prompt
    .replace(/\[(coverage or product group|this group|group)\]/gi, variant)
    .replace(/\[city\]/gi, variant)
    .replace(/\[firm\]/gi, variant)
    .replace(/\bour firm\b/i, variant);
}

/** "60–90" → { min: 60, max: 90 }. */
export function targetSeconds(q: Pick<FitQuestion, "targetLengthSeconds">): { min: number; max: number } | null {
  const m = /(\d+)\s*[–-]\s*(\d+)/.exec(q.targetLengthSeconds ?? "");
  return m ? { min: Number(m[1]), max: Number(m[2]) } : null;
}

export const WORDS_PER_MINUTE = 150;
export const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
/** Speaking time at about 150 words per minute. */
export const speakingSeconds = (s: string) => Math.round((wordCount(s) / WORDS_PER_MINUTE) * 60);

/** Lines interviewers hear all day. Flagged on every answer, with a suggestion. */
export const GENERIC_PHRASES: { phrase: string; suggestion: string }[] = [
  { phrase: "fast-paced environment", suggestion: "Name the moment you did your best work under a real deadline." },
  { phrase: "i want to learn a lot", suggestion: "Say which specific skill you want to build and why it matters to you." },
  { phrase: "collaborative culture", suggestion: "Quote something specific a person at the firm told you about how teams work." },
  { phrase: "i've always loved finance", suggestion: "Replace with the specific moment you got interested." },
  { phrase: "i have always loved finance", suggestion: "Replace with the specific moment you got interested." },
  { phrase: "passionate about", suggestion: "Show it with something you did instead of saying it." },
  { phrase: "steep learning curve", suggestion: "Describe what you want to be able to do in two years." },
  { phrase: "hard worker", suggestion: "Give one example of the work, with a number if you can." },
  { phrase: "detail-oriented", suggestion: "Describe a time your attention to detail caught a real problem." },
  { phrase: "people are great", suggestion: "Name who you spoke with and what they said." },
  { phrase: "prestigious", suggestion: "Name the deal or platform strength that actually draws you." },
];

export function genericFlags(text: string): { quote: string; suggestion: string }[] {
  const lower = text.toLowerCase();
  return GENERIC_PHRASES.filter((g) => lower.includes(g.phrase)).map((g) => {
    const i = lower.indexOf(g.phrase);
    return { quote: text.slice(i, i + g.phrase.length), suggestion: g.suggestion };
  });
}

export type DraftContext = {
  /** "sophomore" etc. */
  year?: string | null;
  school?: string | null;
  major?: string | null;
  hometown?: string | null;
  /** The chosen firm / city / group for this version. */
  variant?: string | null;
  variantKind?: VariantKind;
  /** Names of people the student spoke with (included interactions). */
  people?: string[];
};

const STOP = new Set(["what", "your", "with", "that", "this", "from", "about", "they", "them", "have", "where", "which", "when", "into", "make", "more", "most", "here", "their", "there", "you're", "you've", "why", "how", "the", "and", "for", "one", "two", "it's", "line", "sentence", "specific"]);
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w));
const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, "");

/**
 * Fills the outline template with the builder answers (plain text substitution, no AI).
 * A placeholder takes the builder field with the same key, then profile/context values, then the field whose
 * key or label shares a word with it. Anything it can't fill stays as [placeholder]; builder answers it couldn't
 * place are returned so the student can add them.
 */
export function assembleDraft(q: FitQuestion, builder: Record<string, string>, ctx: DraftContext = {}): { draft: string; unfilled: string[]; unused: string[] } {
  const filled = (v: string | null | undefined) => (v ?? "").trim();
  const used = new Set<string>();
  const unfilled: string[] = [];
  const fields = q.builderFields.filter((f) => filled(builder[f.key]));
  const contextValue = (ph: string): string => {
    const p = ph.toLowerCase();
    if (p === "year") return filled(ctx.year);
    if (p === "school") return filled(ctx.school);
    if (p === "major") return filled(ctx.major);
    if (p === "hometown") return filled(ctx.hometown);
    if (["city", "group", "this group", "firm", "this firm", "coverage or product group"].includes(p)) {
      const kind = p.includes("city") ? "city" : p.includes("group") ? "group" : "firm";
      return ctx.variantKind === kind ? filled(ctx.variant) : "";
    }
    if ((p === "people" || p === "person") && ctx.people?.length) return ctx.people.slice(0, 2).join(" and ");
    return "";
  };
  const draft = q.outlineTemplate.replace(/\[([^\]]+)\]/g, (whole, ph: string) => {
    const key = ph.trim();
    const exact = fields.find((f) => f.key.toLowerCase() === key.toLowerCase() && !used.has(f.key));
    if (exact) {
      used.add(exact.key);
      return filled(builder[exact.key]);
    }
    const c = contextValue(key);
    if (c) return c;
    const phWords = new Set(words(key).map(stem));
    const fuzzy = phWords.size
      ? fields.find((f) => !used.has(f.key) && [...words(f.key), ...words(f.label)].map(stem).some((w) => phWords.has(w)))
      : undefined;
    if (fuzzy) {
      used.add(fuzzy.key);
      return filled(builder[fuzzy.key]);
    }
    unfilled.push(key);
    return whole;
  });
  const unused = fields.filter((f) => !used.has(f.key)).map((f) => f.label);
  // Values ending in a period inside a sentence: keep the text tidy.
  return { draft: draft.replace(/\.\./g, ".").replace(/\s+([,.])/g, "$1").trim(), unfilled: [...new Set(unfilled)], unused };
}

/** Story Bank stories whose slot or title matches one of the question's suggested themes. */
export function storyMatchesThemes(story: { slot: string; title: string }, themes: string[]): boolean {
  const hay = `${story.slot} ${story.title}`.toLowerCase();
  return themes.some((t) => words(t).some((w) => hay.includes(stem(w))));
}

export type FitStatus = "not_started" | "drafted" | "practiced";
