import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getLesson } from "./lessons";
import { gradeCalc, gradeFillBlank, gradeMcq, gradeOrder } from "./grading";
import { isGraded, type Lesson } from "./schema";

export type BlockState = {
  done?: boolean;
  attempts?: number;
  correct?: boolean;
  revealed?: boolean;
  opened?: boolean;
  step?: number;
  /** checkpoint self-grades by prompt index */
  marks?: Record<string, "nailed" | "shaky">;
};
export type BlockStateMap = Record<string, BlockState>;

export type LessonEvent =
  | { kind: "answer"; value: unknown }
  | { kind: "reveal" }
  | { kind: "opened" }
  | { kind: "step"; index: number }
  | { kind: "checkpoint"; index: number; mark: "nailed" | "shaky" };

export const XP = { firstTry: 5, secondTry: 2, complete: 25, deepDive: 10, deepDiveCap: 3 } as const;

export type EventResult = {
  ok: boolean;
  error?: string;
  state?: BlockState;
  correct?: boolean;
  xpGained: number;
  lessonStatus: "in_progress" | "completed";
  justCompleted: boolean;
  score: number;
};

function utcDay(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
function prevDay(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

/** Graded blocks done + checkpoint self-graded = complete. */
export function isLessonComplete(lesson: Lesson, state: BlockStateMap): boolean {
  for (const b of lesson.blocks) {
    if (isGraded(b) && !state[b.id]?.done) return false;
    if (b.type === "checkpoint" && b.selfGrade !== false && !state[b.id]?.done) return false;
  }
  return true;
}

/** % of graded blocks answered correctly on the first or second try. */
export function lessonScore(lesson: Lesson, state: BlockStateMap): number {
  const graded = lesson.blocks.filter(isGraded);
  if (!graded.length) return 100;
  const good = graded.filter((b) => state[b.id]?.correct && (state[b.id]?.attempts ?? 99) <= 2).length;
  return Math.round((good / graded.length) * 100);
}

function grade(block: ReturnType<typeof findBlock>, value: unknown): boolean {
  if (!block) return false;
  switch (block.type) {
    case "fillBlank":
      return gradeFillBlank(block, (value && typeof value === "object" ? value : {}) as Record<string, string>).correct;
    case "calc":
      return gradeCalc(block, String(value ?? ""));
    case "mcq":
      return gradeMcq(block, String(value ?? ""));
    case "orderSteps":
      return gradeOrder(block, Array.isArray(value) ? value.map(String) : []).correct;
    default:
      return false;
  }
}

function findBlock(lesson: Lesson, blockId: string) {
  return lesson.blocks.find((b) => b.id === blockId) ?? null;
}

/**
 * Applies one lesson event for a user. Grading happens here, on the server, so XP can't be
 * claimed by a modified client. The progress row is locked for the duration of the update.
 */
export async function applyLessonEvent(
  userId: string,
  lessonId: string,
  blockId: string,
  event: LessonEvent,
): Promise<EventResult> {
  const lesson = getLesson(lessonId);
  const block = lesson ? findBlock(lesson, blockId) : null;
  const fail = (error: string): EventResult => ({
    ok: false,
    error,
    xpGained: 0,
    lessonStatus: "in_progress",
    justCompleted: false,
    score: 0,
  });
  if (!lesson || !block) return fail("Unknown lesson or block");

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId },
    update: {},
  });

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT 1 FROM "LessonProgress" WHERE "userId" = ${userId} AND "lessonId" = ${lessonId} FOR UPDATE`;
    const row = await tx.lessonProgress.findUniqueOrThrow({ where: { userId_lessonId: { userId, lessonId } } });
    const all = { ...((row.blockState ?? {}) as BlockStateMap) };
    const st: BlockState = { ...(all[blockId] ?? {}) };
    let xp = 0;
    let deepDiveXp = row.deepDiveXp;
    let correct: boolean | undefined;

    switch (event.kind) {
      case "answer": {
        if (!isGraded(block)) return fail("Block is not graded");
        if (st.done) {
          correct = Boolean(st.correct);
          break;
        }
        st.attempts = (st.attempts ?? 0) + 1;
        correct = grade(block, event.value);
        if (correct) {
          st.done = true;
          st.correct = true;
          xp += st.attempts === 1 ? XP.firstTry : st.attempts === 2 ? XP.secondTry : 0;
        } else if (block.type === "mcq") {
          // Multiple choice reveals the explanation on submit, so one attempt ends it.
          st.done = true;
          st.correct = false;
        }
        break;
      }
      case "reveal": {
        if (!isGraded(block)) return fail("Block is not graded");
        if (!st.done && (st.attempts ?? 0) >= 2) {
          st.done = true;
          st.correct = false;
          st.revealed = true;
        } else if (!st.done) {
          return fail("Try twice before revealing the answer");
        }
        break;
      }
      case "opened": {
        if (block.type !== "deepDive") return fail("Not a deep dive");
        if (!st.opened) {
          st.opened = true;
          if (deepDiveXp < XP.deepDiveCap) {
            xp += XP.deepDive;
            deepDiveXp += 1;
          }
        }
        break;
      }
      case "step": {
        if (block.type !== "stepThrough") return fail("Not a step-through");
        const idx = Math.max(0, Math.min(block.steps.length - 1, Math.floor(event.index)));
        st.step = Math.max(st.step ?? 0, idx);
        if (idx >= block.steps.length - 1) st.done = true;
        break;
      }
      case "checkpoint": {
        if (block.type !== "checkpoint") return fail("Not a checkpoint");
        const idx = Math.floor(event.index);
        const prompt = block.prompts[idx];
        if (!prompt) return fail("Unknown prompt");
        st.marks = { ...(st.marks ?? {}), [String(idx)]: event.mark };
        if (event.mark === "shaky") {
          await tx.reviewItem.upsert({
            where: { userId_lessonId_blockId_prompt: { userId, lessonId, blockId, prompt } },
            create: { userId, lessonId, blockId, prompt },
            update: { resolved: false },
          });
        } else {
          await tx.reviewItem.updateMany({ where: { userId, lessonId, blockId, prompt }, data: { resolved: true } });
        }
        st.done = block.prompts.every((_, i) => st.marks?.[String(i)]);
        break;
      }
    }

    all[blockId] = st;
    const complete = isLessonComplete(lesson, all);
    const justCompleted = complete && row.status !== "completed";
    if (justCompleted) xp += XP.complete;
    const score = lessonScore(lesson, all);

    await tx.lessonProgress.update({
      where: { id: row.id },
      data: {
        blockState: all as Prisma.InputJsonValue,
        deepDiveXp,
        score,
        ...(justCompleted ? { status: "completed", completedAt: new Date() } : {}),
      },
    });

    // XP + daily streak (any lesson activity counts toward the streak).
    const user = await tx.user.findUnique({ where: { id: userId }, select: { lastDrillDay: true, drillStreak: true } });
    const today = utcDay();
    const data: Prisma.UserUpdateInput = {};
    if (xp > 0) {
      data.xp = { increment: xp };
      data.weeklyXP = { increment: xp };
    }
    if (user && user.lastDrillDay !== today) {
      data.drillStreak = user.lastDrillDay === prevDay(today) ? user.drillStreak + 1 : 1;
      data.lastDrillDay = today;
    }
    if (Object.keys(data).length) {
      const u = await tx.user.update({
        where: { id: userId },
        data,
        select: { name: true, xp: true, weeklyXP: true, drillStreak: true },
      });
      if (xp > 0) {
        await tx.leaderboardEntry.upsert({
          where: { userId },
          create: { userId, username: u.name, weeklyXP: u.weeklyXP, totalXP: u.xp, streak: u.drillStreak },
          update: { username: u.name, weeklyXP: u.weeklyXP, totalXP: u.xp, streak: u.drillStreak },
        });
      }
    }

    return {
      ok: true,
      state: st,
      correct,
      xpGained: xp,
      lessonStatus: complete ? "completed" : "in_progress",
      justCompleted,
      score,
    };
  });
}
