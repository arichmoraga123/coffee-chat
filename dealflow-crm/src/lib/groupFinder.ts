/**
 * Group Finder (Fit & Practice spec F3). Scoring follows the JSON's `scoring` rule exactly:
 * for each group, sum (option weight × question weight) over the answers, divide by maxScores[group],
 * and show the top 3 as a 0–100 match. "Why this fits" lists the answers that added the most points.
 * Pure and client-safe.
 */
import data from "../../content/fit/PEB_Group_Finder.json";

export type GroupProfile = {
  id: string;
  name: string;
  type: "coverage" | "product" | string;
  oneLiner: string;
  whatYouDo: string;
  typicalDeals: string[];
  skills: string[];
  goodFitIf: string[];
  tradeoffs: string[];
  relatedLessons: string[];
  hubs: string[];
  whyAngles: string[];
  questionsToAskBankers: string[];
};
export type FinderOption = { label: string; weights: Record<string, number> };
export type FinderQuestion = { id: string; prompt: string; note?: string; weight?: number; optional?: boolean; options: FinderOption[] };
export type GroupFinderData = {
  version: number;
  groups: GroupProfile[];
  questions: FinderQuestion[];
  maxScores: Record<string, number>;
  scoring: string;
  disclaimer: string;
};

export const GROUP_FINDER = data as unknown as GroupFinderData;

/** questionId → chosen option index (unanswered / skipped questions are left out). */
export type FinderAnswers = Record<string, number>;

export type GroupMatch = {
  id: string;
  name: string;
  score: number;
  /** 0–100 */
  match: number;
  why: { questionId: string; prompt: string; label: string; points: number }[];
};

/** The questionnaire's optional questions (q10, city) can be skipped. */
export const isOptional = (q: FinderQuestion) => Boolean(q.optional) || (q.weight !== undefined && q.weight < 1);

export function scoreGroupFinder(answers: FinderAnswers, d: GroupFinderData = GROUP_FINDER): GroupMatch[] {
  const totals = new Map<string, number>();
  const contrib = new Map<string, GroupMatch["why"]>();
  for (const q of d.questions) {
    const idx = answers[q.id];
    if (idx === undefined || idx === null) continue;
    const opt = q.options[idx];
    if (!opt) continue;
    const qw = q.weight ?? 1;
    for (const [g, w] of Object.entries(opt.weights)) {
      const pts = w * qw;
      if (!pts) continue;
      totals.set(g, (totals.get(g) ?? 0) + pts);
      contrib.set(g, [...(contrib.get(g) ?? []), { questionId: q.id, prompt: q.prompt, label: opt.label, points: pts }]);
    }
  }
  return d.groups
    .map((g) => {
      const score = totals.get(g.id) ?? 0;
      const max = d.maxScores[g.id] || 1;
      const why = [...(contrib.get(g.id) ?? [])].sort((a, b) => b.points - a.points).slice(0, 3);
      return { id: g.id, name: g.name, score, match: Math.min(100, Math.round((score / max) * 100)), why };
    })
    .sort((a, b) => b.match - a.match || b.score - a.score || a.name.localeCompare(b.name));
}

export const groupById = (id: string, d: GroupFinderData = GROUP_FINDER) => d.groups.find((g) => g.id === id) ?? null;

/** Group → Openings track and contacts "Group / Team" search words. */
export const GROUP_TRACK: Record<string, string> = {
  tmt: "IB",
  healthcare: "IB",
  industrials: "IB",
  consumer: "IB",
  fig: "IB",
  energy: "IB",
  realestate: "IB",
  fsg: "IB",
  ma: "IB",
  levfin: "IB",
  ecm: "IB",
  dcm: "IB",
  rx: "IB",
};

/** Short search term for contacts in this group ("Healthcare", "Restructuring", …). */
export function groupSearchTerm(g: GroupProfile): string {
  const paren = /\(([^)]+)\)/.exec(g.name)?.[1];
  return paren ?? g.name.split(/[,&]/)[0].trim();
}

/** Group → the label used in Profile → Targets → Groups. */
export const GROUP_TARGET_LABEL: Record<string, string> = {
  tmt: "TMT",
  healthcare: "Healthcare",
  industrials: "Industrials",
  consumer: "Consumer & Retail",
  fig: "FIG",
  energy: "Energy & Power",
  realestate: "Real Estate",
  fsg: "Sponsors / FSG",
  ma: "M&A",
  levfin: "Leveraged Finance",
  ecm: "ECM",
  dcm: "DCM",
  rx: "Restructuring",
};

/** maxScores[group] = the most points a group can get: sum over questions of (best option weight × question weight). */
export function computeMaxScores(questions: FinderQuestion[], groupIds: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const g of groupIds) {
    out[g] = questions.reduce((s, q) => s + Math.max(0, ...q.options.map((o) => o.weights[g] ?? 0)) * (q.weight ?? 1), 0);
  }
  return out;
}
