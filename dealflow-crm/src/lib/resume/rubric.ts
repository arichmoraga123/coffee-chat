/**
 * Resume reviewer v2: grading levels, rubric weights and the grading rules.
 * Weights are out of 100 per level. Edit them here (an admin editor can read the same config later).
 * No server-only imports: scripts use this file too.
 */

export const CLASS_LEVELS = ["Freshman", "Sophomore", "Junior", "Senior"] as const;
export type ClassLevel = (typeof CLASS_LEVELS)[number];

export const RECRUITING_TARGETS = [
  "IB",
  "PE",
  "VC",
  "Growth Equity",
  "Private Credit",
  "Hedge Fund / Markets",
  "Consulting",
  "Corporate Finance",
  "Other",
] as const;
export type RecruitingTarget = (typeof RECRUITING_TARGETS)[number];

export const EXPERIENCE_OPTIONS = [
  { id: "financeInternship", label: "Finance internship" },
  { id: "otherInternship", label: "Other internship" },
  { id: "partTimeJob", label: "Part-time or summer job" },
  { id: "financeClub", label: "Finance club" },
  { id: "caseCompetition", label: "Case competition" },
  { id: "selfStudy", label: "Self-study (WSP, BIWS, etc.)" },
] as const;
export type ExperienceId = (typeof EXPERIENCE_OPTIONS)[number]["id"];

export const CATEGORIES = [
  { key: "formatting", name: "Formatting & structure", measures: "Computed in code from the PDF layout checks" },
  {
    key: "bullets",
    name: "Bullet writing quality",
    measures: "Strong action verb, specific, shows result, quantified where possible, concise, consistent tense",
  },
  {
    key: "relevance",
    name: "Experience relevance",
    measures: "How well experiences show skills banks want. Any job counts",
  },
  {
    key: "leadership",
    name: "Leadership & involvement",
    measures: "Roles with responsibility: clubs, teams, organizing, varsity sports, jobs with trust",
  },
  {
    key: "finance",
    name: "Finance interest & skills",
    measures: "Finance clubs, coursework, case competitions, stock pitches, modeling self-study, Excel",
  },
  {
    key: "education",
    name: "Education & academics",
    measures: "GPA presentation, honors, relevant coursework, test scores where helpful",
  },
] as const;
export type CategoryKey = (typeof CATEGORIES)[number]["key"];
export type CategoryName = (typeof CATEGORIES)[number]["name"];

/** The categories the AI scores (formatting comes from code). */
export const AI_CATEGORY_NAMES = CATEGORIES.filter((c) => c.key !== "formatting").map((c) => c.name) as Exclude<
  CategoryName,
  "Formatting & structure"
>[];

export const RUBRIC_WEIGHTS: Record<ClassLevel, Record<CategoryKey, number>> = {
  Freshman: { formatting: 20, bullets: 30, relevance: 10, leadership: 20, finance: 10, education: 10 },
  Sophomore: { formatting: 15, bullets: 25, relevance: 20, leadership: 15, finance: 15, education: 10 },
  Junior: { formatting: 15, bullets: 25, relevance: 30, leadership: 10, finance: 10, education: 10 },
  Senior: { formatting: 15, bullets: 25, relevance: 30, leadership: 10, finance: 10, education: 10 },
};

export function categoryKeyOf(name: string): CategoryKey | null {
  return CATEGORIES.find((c) => c.name === name)?.key ?? null;
}

/** Verbatim grading rules for the prompt (spec section 2). */
export const GRADING_RULES = `1. Grade against a strong resume for this level, not against professionals. A 9/10 freshman resume is one a bank would happily see from a freshman.
2. Freshman: a missing finance internship is never a deduction. A freshman with no finance internship and well-written bullets should be able to score 8 or higher.
3. Sophomore: finance exposure is expected through clubs, coursework, case competitions, or self-study. An internship is a plus, not a requirement.
4. Junior/Senior: a relevant internship is expected. Its absence lowers Experience relevance, but bullets and leadership still count fully.
5. Transferable experience counts. Restaurant, retail, tutoring, lifeguarding, family business, varsity sports, and military are graded on what the bullets show: responsibility, client service, attention to detail, working under pressure, numbers handled, people led.
6. Grade the writing, not the prestige. The same job described well scores higher than a big-name internship described vaguely.
7. Every deduction cites the exact text it's about, and says how to fix it.
8. Rewrites never invent facts. Use [X] placeholders where a number would help ("Served [X] customers per shift").`;

/** One line on what each target values, so feedback is pointed at the right job. */
export const TARGET_FOCUS: Record<RecruitingTarget, string> = {
  IB: "Investment banking analyst roles: attention to detail, Excel and modeling, teamwork under deadlines, client service, quantified results.",
  PE: "Private equity: investing judgment, modeling, ownership of outcomes. For students, mostly a path through IB first, so IB-style skills count.",
  VC: "Venture capital: startup and market curiosity, sourcing, research and writing, product sense.",
  "Growth Equity": "Growth equity: company research, sourcing and outreach, market sizing, modeling.",
  "Private Credit": "Private credit: credit analysis, accounting, risk thinking, careful writing.",
  "Hedge Fund / Markets": "Hedge funds, trading and markets: stock pitches, quantitative skills, markets knowledge, coding or statistics.",
  Consulting: "Consulting: structured problem solving, leadership, impact stories, communication.",
  "Corporate Finance": "Corporate finance: Excel, budgeting and analysis, working with non-finance teams, accounting basics.",
  Other: "General business recruiting: responsibility, results, communication, analytical skills.",
};

/** Score bands relative to the chosen level. */
export function scoreBand(score: number): { label: string; tone: "success" | "accent" | "warn" | "danger" } {
  if (score >= 9) return { label: "Ready to send", tone: "success" };
  if (score >= 7) return { label: "Strong — a few fixes", tone: "accent" };
  if (score >= 5) return { label: "Solid base — needs a revision pass", tone: "warn" };
  return { label: "Needs a rewrite — start with the Top 3 fixes", tone: "danger" };
}

/** Graduation year → class level for the current academic year (July starts a new year). */
export function levelFromGradYear(gradYear: number | null | undefined, now = new Date()): ClassLevel | null {
  if (!gradYear) return null;
  const yearsLeft = gradYear - now.getFullYear() + (now.getMonth() >= 6 ? 0 : 1);
  if (yearsLeft >= 4) return "Freshman";
  if (yearsLeft === 3) return "Sophomore";
  if (yearsLeft === 2) return "Junior";
  return "Senior";
}

/** Profile career track → recruiting target. */
export function targetFromTrack(track: string | null | undefined): RecruitingTarget {
  switch (track) {
    case "Investment Banking":
      return "IB";
    case "Private Equity":
      return "PE";
    case "Venture Capital":
      return "VC";
    case "Private Credit":
      return "Private Credit";
    case "Hedge Fund":
    case "Sales & Trading":
    case "Asset Management":
    case "Equity Research":
    case "Capital Markets":
      return "Hedge Fund / Markets";
    case "Consulting":
      return "Consulting";
    case "Corporate Finance":
      return "Corporate Finance";
    default:
      return "Other";
  }
}

/** Weighted average of 0–10 category scores, rounded to the nearest 0.5. */
export function overallScore(level: ClassLevel, scores: Partial<Record<CategoryKey, number>>): number {
  const w = RUBRIC_WEIGHTS[level];
  let sum = 0;
  let total = 0;
  for (const c of CATEGORIES) {
    const s = scores[c.key];
    if (typeof s !== "number" || !Number.isFinite(s)) continue;
    sum += w[c.key] * Math.max(0, Math.min(10, s));
    total += w[c.key];
  }
  if (!total) return 0;
  return Math.round((sum / total) * 2) / 2;
}
