import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canEarnXp } from "@/lib/club-social";

import type { GradeResult, McqContext, PublicMcq } from "./types";

export type { GradeResult, McqContext, PublicMcq };

const MCQ_SELECT = {
  id: true,
  question: true,
  options: true,
  lessonId: true,
  category: true,
  difficulty: true,
} as const;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

export function toPublicMcq(q: Prisma.QuestionGetPayload<{ select: typeof MCQ_SELECT }>): PublicMcq {
  return {
    id: q.id,
    question: q.question,
    options: shuffle(q.options),
    lessonId: q.lessonId,
    category: q.category,
    difficulty: q.difficulty,
  };
}

/** MCQ-eligible questions only (never the older flashcard-only bank). */
export const MCQ_WHERE: Prisma.QuestionWhereInput = {
  mcqEligible: true,
  status: "active",
  correctIndex: { not: null },
};

export type McqFilters = { module?: number; lessonId?: string; difficulty?: string; category?: string };

export async function listMcqs(filters: McqFilters, limit = 10, excludeIds: string[] = []): Promise<PublicMcq[]> {
  const where: Prisma.QuestionWhereInput = { ...MCQ_WHERE, id: { notIn: excludeIds } };
  if (filters.lessonId) where.lessonId = filters.lessonId;
  else if (typeof filters.module === "number") where.lessonId = { startsWith: `${filters.module}-` };
  if (filters.difficulty) where.difficulty = filters.difficulty;
  if (filters.category) where.category = filters.category;
  const rows = await prisma.question.findMany({ where, select: MCQ_SELECT });
  return shuffle(rows).slice(0, limit).map(toPublicMcq);
}

/**
 * Grades an answer on the server by option text, logs a QuestionAttempt and updates the question's
 * known/review status. Practice answers earn +10 XP the first time a question is mastered; daily-set XP
 * is awarded when the set is completed.
 */
export async function gradeMcqAnswer(
  userId: string,
  questionId: string,
  chosenText: string,
  msToAnswer: number,
  context: McqContext,
): Promise<GradeResult | null> {
  const q = await prisma.question.findFirst({
    where: { id: questionId, ...MCQ_WHERE },
    select: { id: true, options: true, correctIndex: true, explanation: true, lessonId: true },
  });
  if (!q || q.correctIndex === null || !q.options[q.correctIndex]) return null;
  const correctText = q.options[q.correctIndex];
  const correct = norm(chosenText) === norm(correctText);
  const ms = Math.max(0, Math.min(Math.round(msToAnswer) || 0, 30 * 60_000));

  const prior = await prisma.userQuestionProgress.findUnique({
    where: { userId_questionId: { userId, questionId } },
    select: { status: true },
  });
  const firstMastery = correct && context === "practice" && prior?.status !== "known";
  const xp = firstMastery && (await canEarnXp(userId)) ? 10 : 0;

  await prisma.$transaction(async (tx) => {
    await tx.questionAttempt.create({
      data: { userId, questionId, correct, chosenText: chosenText.slice(0, 1000), msToAnswer: ms, context },
    });
    await tx.userQuestionProgress.upsert({
      where: { userId_questionId: { userId, questionId } },
      create: { userId, questionId, status: correct ? "known" : "review" },
      update: { status: correct ? "known" : "review", lastSeen: new Date() },
    });
    if (xp > 0) {
      const u = await tx.user.update({
        where: { id: userId },
        data: { xp: { increment: xp }, weeklyXP: { increment: xp } },
        select: { name: true, xp: true, weeklyXP: true, drillStreak: true },
      });
      await tx.leaderboardEntry.upsert({
        where: { userId },
        create: { userId, username: u.name, weeklyXP: u.weeklyXP, totalXP: u.xp, streak: u.drillStreak },
        update: { username: u.name, weeklyXP: u.weeklyXP, totalXP: u.xp },
      });
    }
  });

  return { correct, correctText, explanation: q.explanation, lessonId: q.lessonId, xpAwarded: xp };
}

/* ───────────────────────── daily set ───────────────────────── */

const DAY_MS = 86_400_000;
const REVIEW_INTERVALS_DAYS = [1, 3, 7];
export const DAILY_SET_SIZE = 5;

export function utcDay(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/**
 * Spaced repetition: a missed question comes back 1 day after the miss, then 3, then 7 days after each
 * review, until it's answered correctly twice in a row (a new miss restarts the schedule).
 * Returns the time it's next due, or null if it's not in review.
 */
export function reviewDueAt(attempts: { correct: boolean; createdAt: Date }[]): Date | null {
  const sorted = [...attempts].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  let lastMiss = -1;
  sorted.forEach((a, i) => {
    if (!a.correct) lastMiss = i;
  });
  if (lastMiss < 0) return null;
  const after = sorted.slice(lastMiss + 1);
  if (after.length >= 2 && after.slice(-2).every((a) => a.correct)) return null;
  const anchor = after.length ? after[after.length - 1].createdAt : sorted[lastMiss].createdAt;
  const interval = REVIEW_INTERVALS_DAYS[Math.min(after.length, REVIEW_INTERVALS_DAYS.length - 1)];
  return new Date(anchor.getTime() + interval * DAY_MS);
}

function weightedPick<T>(items: { item: T; weight: number }[], n: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((s, x) => s + x.weight, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length - 1; idx++) {
      r -= pool[idx].weight;
      if (r <= 0) break;
    }
    out.push(pool[idx].item);
    pool.splice(idx, 1);
  }
  return out;
}

/** Picks (once per day) the user's 5 questions: due reviews first, then questions from their weakest lessons. */
export async function getOrCreateDailySet(userId: string): Promise<string[]> {
  const today = utcDay();
  const existing = await prisma.dailyQuestionSet.findUnique({ where: { userId_date: { userId, date: today } } });
  if (existing) return existing.questionIds;

  const [questions, attempts] = await Promise.all([
    prisma.question.findMany({ where: MCQ_WHERE, select: { id: true, lessonId: true } }),
    prisma.questionAttempt.findMany({
      where: { userId },
      select: { questionId: true, correct: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const byQuestion = new Map<string, { correct: boolean; createdAt: Date }[]>();
  for (const a of attempts) byQuestion.set(a.questionId, [...(byQuestion.get(a.questionId) ?? []), a]);

  const now = Date.now();
  const due = questions
    .map((q) => ({ id: q.id, due: reviewDueAt(byQuestion.get(q.id) ?? []) }))
    .filter((x) => x.due && x.due.getTime() <= now)
    .sort((a, b) => a.due!.getTime() - b.due!.getTime())
    .map((x) => x.id);

  // Accuracy by lesson; lessons with no attempts count as 50%.
  const lessonStats = new Map<string, { right: number; total: number }>();
  const lessonOf = new Map(questions.map((q) => [q.id, q.lessonId ?? "?"]));
  for (const a of attempts) {
    const l = lessonOf.get(a.questionId);
    if (!l) continue;
    const s = lessonStats.get(l) ?? { right: 0, total: 0 };
    s.total++;
    if (a.correct) s.right++;
    lessonStats.set(l, s);
  }
  const accuracy = (lesson: string) => {
    const s = lessonStats.get(lesson);
    return s && s.total ? s.right / s.total : 0.5;
  };

  const picked = due.slice(0, DAILY_SET_SIZE);
  // Fresh questions: never answered correctly yet (and not already picked), weighted toward weak lessons.
  const known = new Set(attempts.filter((a) => a.correct).map((a) => a.questionId));
  const candidates = questions.filter((q) => !picked.includes(q.id) && !known.has(q.id));
  const fallback = questions.filter((q) => !picked.includes(q.id));
  const pool = (candidates.length >= DAILY_SET_SIZE ? candidates : fallback).map((q) => ({
    item: q.id,
    weight: 1.15 - accuracy(q.lessonId ?? "?"),
  }));
  picked.push(...weightedPick(pool, DAILY_SET_SIZE - picked.length));

  try {
    await prisma.dailyQuestionSet.create({ data: { userId, date: today, questionIds: picked } });
    return picked;
  } catch {
    // Created concurrently by another request — use that one.
    const row = await prisma.dailyQuestionSet.findUnique({ where: { userId_date: { userId, date: today } } });
    return row?.questionIds ?? picked;
  }
}

export async function publicMcqsByIds(ids: string[]): Promise<PublicMcq[]> {
  const rows = await prisma.question.findMany({ where: { id: { in: ids }, ...MCQ_WHERE }, select: MCQ_SELECT });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => Boolean(r)).map(toPublicMcq);
}

/* ───────────────────────── practice modes (F1.4) ───────────────────────── */

export type PracticeMode = "weak" | "missed" | "hard";

/**
 * weak: the user's three lowest-accuracy lessons (at least 5 attempts each), mixed.
 * missed: only questions the user got wrong and hasn't since gotten right, oldest miss first.
 * hard: hard questions, for the chosen module (or all).
 */
export async function practiceModeQuestions(
  userId: string,
  mode: PracticeMode,
  opts: { module?: number; limit: number; exclude: string[] },
): Promise<{ questions: PublicMcq[]; note: string }> {
  if (mode === "hard") {
    const questions = await listMcqs({ module: opts.module, difficulty: "Hard" }, opts.limit, opts.exclude);
    return { questions, note: typeof opts.module === "number" ? `Hard questions from Module ${opts.module}` : "Hard questions from every module" };
  }
  const attempts = await prisma.questionAttempt.findMany({
    where: { userId, question: MCQ_WHERE },
    select: { questionId: true, correct: true, createdAt: true, question: { select: { lessonId: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (mode === "weak") {
    const stats = new Map<string, { right: number; total: number }>();
    for (const a of attempts) {
      const l = a.question.lessonId;
      if (!l) continue;
      const s = stats.get(l) ?? { right: 0, total: 0 };
      s.total++;
      if (a.correct) s.right++;
      stats.set(l, s);
    }
    const weakest = [...stats.entries()]
      .filter(([, s]) => s.total >= 5)
      .sort((a, b) => a[1].right / a[1].total - b[1].right / b[1].total)
      .slice(0, 3);
    if (!weakest.length) return { questions: [], note: "Answer at least 5 questions in a lesson to find your weak spots." };
    const rows = await prisma.question.findMany({
      where: { ...MCQ_WHERE, lessonId: { in: weakest.map(([l]) => l) }, id: { notIn: opts.exclude } },
      select: MCQ_SELECT,
    });
    const label = weakest.map(([l, s]) => `${l.replace("-", ".")} (${Math.round((s.right / s.total) * 100)}%)`).join(", ");
    return { questions: shuffle(rows).slice(0, opts.limit).map(toPublicMcq), note: `Your weakest lessons: ${label}` };
  }
  // missed
  const firstMiss = new Map<string, Date>();
  const latest = new Map<string, boolean>();
  for (const a of attempts) {
    if (!a.correct && !firstMiss.has(a.questionId)) firstMiss.set(a.questionId, a.createdAt);
    latest.set(a.questionId, a.correct);
  }
  const ids = [...firstMiss.entries()]
    .filter(([id]) => latest.get(id) === false && !opts.exclude.includes(id))
    .sort((a, b) => a[1].getTime() - b[1].getTime())
    .map(([id]) => id)
    .slice(0, opts.limit);
  if (!ids.length) return { questions: [], note: "No missed questions to review. Nice." };
  const rows = await prisma.question.findMany({ where: { ...MCQ_WHERE, id: { in: ids } }, select: MCQ_SELECT });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return { questions: ids.flatMap((id) => (byId.has(id) ? [toPublicMcq(byId.get(id)!)] : [])), note: `${ids.length} question${ids.length === 1 ? "" : "s"} you missed, oldest first` };
}
