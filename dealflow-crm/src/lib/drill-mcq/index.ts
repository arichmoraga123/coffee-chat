import { CORE_TECHNICAL_MCQ } from "./core-technicals";
import { CORE_TRACK_MCQ } from "./core-tracks";
import { FIRM_DRILL_QUESTIONS } from "./firm-questions";
import { mcqKey, type DrillMcq } from "./types";

export type { DrillMcq } from "./types";
export { mcqKey } from "./types";

let index: Map<string, DrillMcq> | null = null;

function buildIndex(): Map<string, DrillMcq> {
  const m = new Map<string, DrillMcq>();
  for (const [q, mcq] of Object.entries({ ...CORE_TECHNICAL_MCQ, ...CORE_TRACK_MCQ })) {
    m.set(mcqKey(q), mcq);
  }
  for (const fq of FIRM_DRILL_QUESTIONS) m.set(mcqKey(fq.question), fq.mcq);
  return m;
}

/** Hand-authored drill choices for a question, if we have them. */
export function getAuthoredMcq(question: string): DrillMcq | null {
  index ??= buildIndex();
  return index.get(mcqKey(question)) ?? null;
}

export { FIRM_TAG_PREFIX, firmsFromTags } from "./firms";
