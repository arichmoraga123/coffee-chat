import "server-only";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MCQ_WHERE } from "@/lib/mcq/server";
import { canEarnXp, peBroadMembership, postClubActivity, SOCIAL_USER_WHERE } from "@/lib/club-social";
import { sendMessage, startConversation } from "@/lib/dm";
import type { PublicMcq } from "@/lib/mcq/types";
import { pickChallengeQuestions, topUpNote } from "@/lib/challenge-picker";

export type ChallengeTopic = {
  modules?: number[];
  lessons?: string[];
  categories?: string[];
  difficulty?: string;
  label?: string;
  /** Set by the picker, e.g. "Includes 2 questions from Module 8". */
  note?: string;
};

export const ASYNC_HOURS = 48;
export const LIVE_SECONDS = 30;
export const DISCONNECT_MS = 60_000;
export const XP_WIN = 20;
export const XP_FINISH = 10;
export const XP_PERFECT = 5;

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/** Same questions for both players, but each player's options are shuffled differently (and stably). */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const a = [...arr];
  let h = createHash("sha256").update(seed).digest();
  let k = 0;
  const next = () => {
    if (k + 4 > h.length) {
      h = createHash("sha256").update(h).digest();
      k = 0;
    }
    const v = h.readUInt32BE(k);
    k += 4;
    return v / 0x100000000;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function topicLabel(t: ChallengeTopic): string {
  if (t.label) return t.label;
  const parts: string[] = [];
  if (t.lessons?.length) parts.push(`Lesson ${t.lessons.map((l) => l.replace("-", ".")).join(", ")}`);
  else if (t.modules?.length) parts.push(`Module ${t.modules.join(", ")}`);
  else if (t.categories?.length) parts.push(t.categories.join(", "));
  else parts.push("Mixed");
  if (t.difficulty) parts.push(t.difficulty);
  if (t.note) parts.push(t.note);
  return parts.join(" · ");
}

const FRESH_DAYS = 30;

/**
 * Picks n questions for a challenge (F1.3): the topic's lessons first, topped up from the same module;
 * questions nobody in the challenge answered in the last 30 days first; about 3 easy / 5 medium / 2 hard.
 * `players` are the duel's two players; `clubMembers` (weekly) avoids what most of the club answered recently.
 */
export async function pickQuestions(
  topic: ChallengeTopic,
  n: number,
  opts: { weights?: Map<string, number>; players?: string[]; clubMembers?: string[] } = {},
): Promise<{ ids: string[]; note: string | null }> {
  const base: Prisma.QuestionWhereInput = { ...MCQ_WHERE };
  if (topic.categories?.length) base.category = { in: topic.categories };
  const select = { id: true, lessonId: true, difficulty: true } as const;
  const scope: Prisma.QuestionWhereInput = { ...base };
  if (topic.lessons?.length) scope.lessonId = { in: topic.lessons };
  else if (topic.modules?.length) scope.OR = topic.modules.map((m) => ({ lessonId: { startsWith: `${m}-` } }));
  const primary = await prisma.question.findMany({ where: scope, select });
  let topUp: typeof primary = [];
  if (topic.lessons?.length && primary.length < n) {
    const mods = [...new Set(topic.lessons.map((l) => l.split("-")[0]))];
    topUp = await prisma.question.findMany({
      where: { ...base, OR: mods.map((m) => ({ lessonId: { startsWith: `${m}-` } })), lessonId: { notIn: topic.lessons } },
      select,
    });
  }

  // Who has seen what in the last 30 days.
  const staleness = new Map<string, number>();
  const people = opts.players ?? opts.clubMembers ?? [];
  if (people.length) {
    const since = new Date(Date.now() - FRESH_DAYS * 86_400_000);
    const seen = await prisma.questionAttempt.findMany({
      where: { userId: { in: people }, createdAt: { gte: since }, questionId: { in: [...primary, ...topUp].map((q) => q.id) } },
      select: { userId: true, questionId: true },
      distinct: ["userId", "questionId"],
    });
    const by = new Map<string, number>();
    for (const a of seen) by.set(a.questionId, (by.get(a.questionId) ?? 0) + 1);
    for (const [qid, count] of by) {
      if (opts.players) staleness.set(qid, Math.min(2, count));
      else {
        const share = count / people.length;
        staleness.set(qid, share >= 0.5 ? 2 : share >= 0.2 ? 1 : 0);
      }
    }
  }

  const r = pickChallengeQuestions({ n, primary, topUp, staleness, lessonWeights: opts.weights, difficulty: topic.difficulty ?? null });
  return { ids: r.ids, note: topUpNote(r) };
}

export async function createChallenge(opts: {
  creatorId: string;
  opponentId: string;
  mode: "async" | "live";
  topic: ChallengeTopic;
  length: 5 | 10;
  conversationId?: string;
}): Promise<{ id: string } | { error: string }> {
  const { creatorId, opponentId } = opts;
  if (creatorId === opponentId) return { error: "Pick someone else to challenge." };
  const [a, b] = await Promise.all([peBroadMembership(creatorId), peBroadMembership(opponentId)]);
  if (!a || !b || a.clubId !== b.clubId) return { error: "Challenges are between PE@Broad members." };
  const picked = await pickQuestions(opts.topic, opts.length, { players: [creatorId, opponentId] });
  const questionIds = picked.ids;
  if (questionIds.length < opts.length) return { error: "Not enough questions for that topic. Try a broader one." };
  const topic: ChallengeTopic = picked.note ? { ...opts.topic, note: picked.note } : opts.topic;
  const challenge = await prisma.challenge.create({
    data: {
      clubId: a.clubId,
      mode: opts.mode,
      createdById: creatorId,
      topic: topic as Prisma.InputJsonValue,
      questionIds,
      secondsPerQ: LIVE_SECONDS,
      status: "pending",
      expiresAt: new Date(Date.now() + ASYNC_HOURS * 3_600_000),
      participants: { create: [{ userId: creatorId, ready: opts.mode === "live" }, { userId: opponentId }] },
    },
    select: { id: true },
  });
  // Post it as a challenge card in the DM thread.
  const conv = opts.conversationId ? { id: opts.conversationId } : await startConversation(creatorId, opponentId);
  if (!("error" in conv)) {
    await sendMessage(
      creatorId,
      conv.id,
      `${opts.mode === "live" ? "Live duel" : "Challenge"}: ${opts.length} questions · ${topicLabel(topic)}. You have ${ASYNC_HOURS} hours.`,
      { kind: "challenge", challengeId: challenge.id },
    );
  }
  return challenge;
}

export async function loadChallenge(id: string) {
  return prisma.challenge.findUnique({
    where: { id },
    include: {
      participants: { include: { user: { select: { id: true, name: true } } } },
      createdBy: { select: { id: true, name: true } },
    },
  });
}
export type LoadedChallenge = NonNullable<Awaited<ReturnType<typeof loadChallenge>>>;

/** Expire stale challenges on read. */
export async function expireIfDue(c: LoadedChallenge): Promise<LoadedChallenge> {
  if (["complete", "expired", "declined"].includes(c.status) || c.expiresAt > new Date()) return c;
  if (c.mode === "weekly") {
    await prisma.challenge.update({ where: { id: c.id }, data: { status: "complete" } });
    return { ...c, status: "complete" };
  }
  // An accepted async challenge where someone already finished counts as complete; otherwise it expires.
  const anyoneFinished = c.participants.some((p) => p.finishedAt);
  if (c.status === "accepted" && anyoneFinished) {
    await finishChallenge(c.id);
    return (await loadChallenge(c.id))!;
  }
  await prisma.challenge.update({ where: { id: c.id }, data: { status: "expired" } });
  return { ...c, status: "expired" };
}

export async function publicQuestion(challengeId: string, userId: string, questionId: string): Promise<PublicMcq | null> {
  const q = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, question: true, options: true, lessonId: true, category: true, difficulty: true },
  });
  if (!q) return null;
  return { ...q, options: seededShuffle(q.options, `${challengeId}:${userId}:${q.id}`) };
}

/** Grades one challenge answer on the server and updates the player's score. */
export async function recordAnswer(
  c: LoadedChallenge,
  userId: string,
  questionId: string,
  chosenText: string,
  ms: number,
  forceWrong = false,
): Promise<{ correct: boolean; duplicate: boolean }> {
  const q = await prisma.question.findUnique({ where: { id: questionId }, select: { options: true, correctIndex: true } });
  const correctText = q && q.correctIndex !== null ? q.options[q.correctIndex] : null;
  const correct = !forceWrong && Boolean(correctText) && norm(chosenText) === norm(correctText!);
  const msClamped = Math.max(0, Math.min(Math.round(ms) || 0, (c.secondsPerQ + 5) * 1000));
  try {
    await prisma.$transaction([
      prisma.challengeAnswer.create({ data: { challengeId: c.id, userId, questionId, correct, chosenText: chosenText.slice(0, 1000), ms: msClamped } }),
      prisma.challengeParticipant.update({
        where: { challengeId_userId: { challengeId: c.id, userId } },
        data: { score: { increment: correct ? 1 : 0 }, totalMs: { increment: msClamped }, lastSeenAt: new Date() },
      }),
    ]);
  } catch {
    return { correct: false, duplicate: true };
  }
  const answered = await prisma.challengeAnswer.count({ where: { challengeId: c.id, userId } });
  if (answered >= c.questionIds.length) {
    await prisma.challengeParticipant.update({ where: { challengeId_userId: { challengeId: c.id, userId } }, data: { finishedAt: new Date() } });
    if (c.mode === "weekly") await awardWeekly(c.id, userId);
    else {
      const others = await prisma.challengeParticipant.count({ where: { challengeId: c.id, finishedAt: null } });
      if (others === 0) await finishChallenge(c.id);
    }
  }
  return { correct, duplicate: false };
}

async function award(userId: string, xp: number) {
  if (xp <= 0 || !(await canEarnXp(userId))) return 0;
  await prisma.user.update({ where: { id: userId }, data: { xp: { increment: xp }, weeklyXP: { increment: xp } } });
  return xp;
}

async function awardWeekly(challengeId: string, userId: string) {
  const p = await prisma.challengeParticipant.findUnique({ where: { challengeId_userId: { challengeId, userId } } });
  const c = await prisma.challenge.findUnique({ where: { id: challengeId }, select: { questionIds: true } });
  if (!p || !c || p.xpAwarded) return;
  const xp = await award(userId, XP_FINISH + (p.score === c.questionIds.length ? XP_PERFECT : 0));
  await prisma.challengeParticipant.update({ where: { challengeId_userId: { challengeId, userId } }, data: { xpAwarded: xp } });
  await postClubActivity(userId, "challenge_result", { text: `scored ${p.score}/${c.questionIds.length} on the weekly club challenge` });
}

/** Both players done (or the clock ran out): award points, post the result to the feed and the DM. */
export async function finishChallenge(challengeId: string) {
  const c = await loadChallenge(challengeId);
  if (!c || c.status === "complete") return;
  const claimed = await prisma.challenge.updateMany({ where: { id: challengeId, status: { not: "complete" } }, data: { status: "complete" } });
  if (!claimed.count) return;
  const ps = [...c.participants].sort((a, b) => b.score - a.score || a.totalMs - b.totalMs);
  const [first, second] = ps;
  const tie = first && second && first.score === second.score && first.totalMs === second.totalMs;
  for (const p of ps) {
    if (!p.finishedAt) continue;
    const won = !tie && p.userId === first.userId && Boolean(second?.finishedAt || second);
    const xp = await award(p.userId, XP_FINISH + (won ? XP_WIN : 0) + (p.score === c.questionIds.length ? XP_PERFECT : 0));
    await prisma.challengeParticipant.update({ where: { challengeId_userId: { challengeId, userId: p.userId } }, data: { xpAwarded: xp } });
  }
  if (first && second) {
    const text = tie
      ? `tied ${first.user.name.split(" ")[0]} and ${second.user.name.split(" ")[0]} ${first.score}–${second.score} in a challenge (${topicLabel(c.topic as ChallengeTopic)})`
      : `beat ${second.user.name} ${first.score}–${second.score} in a challenge (${topicLabel(c.topic as ChallengeTopic)})`;
    await postClubActivity(first.userId, "challenge_result", { text, challengeId });
  }
}

/** Live duel: advance past the current question when both answered or its 30 seconds are up (server clock). */
export async function advanceLive(c: LoadedChallenge): Promise<LoadedChallenge> {
  if (c.mode !== "live" || c.status !== "live" || !c.questionStartedAt) return c;
  const now = Date.now();
  let changed = false;
  let idx = c.currentIndex;
  let startedAt = c.questionStartedAt.getTime();
  // Forfeit: a player who hasn't polled for 60s gets the rest marked wrong.
  for (const p of c.participants) {
    if (!p.finishedAt && p.lastSeenAt && now - p.lastSeenAt.getTime() > DISCONNECT_MS) {
      const done = new Set((await prisma.challengeAnswer.findMany({ where: { challengeId: c.id, userId: p.userId }, select: { questionId: true } })).map((a) => a.questionId));
      for (const qid of c.questionIds) if (!done.has(qid)) await recordAnswer(c, p.userId, qid, "", c.secondsPerQ * 1000, true);
      changed = true;
    }
  }
  while (idx < c.questionIds.length) {
    const qid = c.questionIds[idx];
    const answers = await prisma.challengeAnswer.count({ where: { challengeId: c.id, questionId: qid } });
    const deadline = startedAt + c.secondsPerQ * 1000;
    if (answers >= c.participants.length || now >= deadline) {
      // Time's up: anyone who didn't answer gets it wrong.
      if (answers < c.participants.length) {
        const answered = new Set((await prisma.challengeAnswer.findMany({ where: { challengeId: c.id, questionId: qid }, select: { userId: true } })).map((a) => a.userId));
        for (const p of c.participants) if (!answered.has(p.userId)) await recordAnswer(c, p.userId, qid, "", c.secondsPerQ * 1000, true);
      }
      idx++;
      startedAt = now; // the next question gets a fresh 30 seconds
      changed = true;
      continue;
    }
    break;
  }
  if (!changed) return c;
  await prisma.challenge.update({
    where: { id: c.id },
    data: { currentIndex: idx, questionStartedAt: new Date(startedAt) },
  });
  if (idx >= c.questionIds.length) await finishChallenge(c.id);
  return (await loadChallenge(c.id))!;
}

/** Questions in a challenge the user is still playing can't be opened in normal practice. */
export async function lockedQuestionIds(userId: string): Promise<string[]> {
  const rows = await prisma.challenge.findMany({
    where: { status: { in: ["pending", "accepted", "live"] }, participants: { some: { userId, finishedAt: null } } },
    select: { questionIds: true },
  });
  const weekly = await prisma.challenge.findMany({
    where: { mode: "weekly", status: { notIn: ["complete", "expired"] }, NOT: { participants: { some: { userId, finishedAt: { not: null } } } } },
    select: { questionIds: true },
  });
  return [...new Set([...rows, ...weekly].flatMap((r) => r.questionIds))];
}

/* ───────── weekly club challenge ───────── */

export function mondayStartET(d = new Date()): Date {
  // Monday 00:00 America/New_York, as a UTC Date.
  const et = new Date(d.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const offsetMs = d.getTime() - et.getTime();
  const day = (et.getDay() + 6) % 7;
  const monday = new Date(et.getFullYear(), et.getMonth(), et.getDate() - day, 0, 0, 0, 0);
  return new Date(monday.getTime() + offsetMs);
}

/** Creates this week's challenge for the club if it doesn't exist: 10 questions weighted toward last week's weakest lessons. */
export async function ensureWeeklyChallenge(clubId: string, override?: ChallengeTopic, createdById?: string) {
  const start = mondayStartET();
  const existing = await prisma.challenge.findFirst({ where: { clubId, mode: "weekly", createdAt: { gte: start } }, select: { id: true, participants: { select: { userId: true } } } });
  if (existing && !override) return existing;
  if (existing && override) {
    if (existing.participants.length) return { error: "Someone already started this week's challenge." } as const;
    await prisma.challenge.delete({ where: { id: existing.id } });
  }
  const members = await prisma.clubMember.findMany({ where: { clubId, active: true, user: SOCIAL_USER_WHERE }, select: { userId: true, role: true } });
  const weekAgo = new Date(start.getTime() - 7 * 86_400_000);
  const attempts = await prisma.questionAttempt.findMany({
    where: { userId: { in: members.map((m) => m.userId) }, createdAt: { gte: weekAgo, lt: start }, question: { mcqEligible: true } },
    select: { correct: true, question: { select: { lessonId: true } } },
  });
  const stats = new Map<string, { right: number; total: number }>();
  for (const a of attempts) {
    const l = a.question.lessonId ?? "";
    const s = stats.get(l) ?? { right: 0, total: 0 };
    s.total++;
    if (a.correct) s.right++;
    stats.set(l, s);
  }
  const weights = new Map([...stats.entries()].map(([l, s]) => [l, 1 + 3 * (1 - s.right / s.total)]));
  const baseTopic: ChallengeTopic = override ?? { label: "Weakest lessons from last week" };
  const picked = await pickQuestions(baseTopic, 10, { weights: override ? undefined : weights, clubMembers: members.map((m) => m.userId) });
  const questionIds = picked.ids;
  const topic: ChallengeTopic = picked.note ? { ...baseTopic, note: picked.note } : baseTopic;
  if (questionIds.length < 10) return { error: "Not enough questions for that topic." } as const;
  const creator = createdById ?? members.find((m) => m.role === "admin")?.userId ?? members[0]?.userId;
  if (!creator) return { error: "The club has no members yet." } as const;
  const c = await prisma.challenge.create({
    data: {
      clubId,
      mode: "weekly",
      createdById: creator,
      topic: topic as Prisma.InputJsonValue,
      questionIds,
      status: "accepted",
      expiresAt: new Date(start.getTime() + 7 * 86_400_000),
    },
    select: { id: true },
  });
  await prisma.clubActivity.create({ data: { clubId, userId: creator, kind: "weekly_challenge", data: { text: `posted this week's club challenge: ${topicLabel(topic)}`, challengeId: c.id } } });
  return { ...c, participants: [] };
}

/* ───────── what one player sees ───────── */

export type ChallengeView = {
  id: string;
  mode: string;
  status: string;
  topic: string;
  length: number;
  expiresAt: string;
  isCreator: boolean;
  serverNow: number;
  me: { score: number; answered: number; finished: boolean; ready: boolean; answeredCurrent?: boolean } | null;
  opponent: { id: string; name: string; score: number | null; answered: number; finished: boolean; ready: boolean; answeredCurrent: boolean } | null;
  question: PublicMcq | null;
  index: number;
  /** live: ms left on the current question, by the server clock */
  msLeft: number | null;
  results: {
    questionId: string;
    question: string;
    correctText: string;
    explanation: string | null;
    lessonId: string | null;
    mine: { chosen: string; correct: boolean; ms: number } | null;
    theirs: { chosen: string; correct: boolean; ms: number } | null;
  }[] | null;
  headToHead: { wins: number; losses: number; ties: number } | null;
  weeklyTable: { userId: string; name: string; score: number; totalMs: number }[] | null;
};

export async function challengeView(c: LoadedChallenge, userId: string): Promise<ChallengeView> {
  const meP = c.participants.find((p) => p.userId === userId) ?? null;
  const oppP = c.mode === "weekly" ? null : (c.participants.find((p) => p.userId !== userId) ?? null);
  const answers = await prisma.challengeAnswer.findMany({ where: { challengeId: c.id }, select: { userId: true, questionId: true, correct: true, chosenText: true, ms: true } });
  const mine = answers.filter((a) => a.userId === userId);
  const theirs = oppP ? answers.filter((a) => a.userId === oppP.userId) : [];
  const done = new Set(mine.map((a) => a.questionId));

  let question: PublicMcq | null = null;
  let index = mine.length;
  let msLeft: number | null = null;
  const currentQid = c.questionIds[c.currentIndex];
  const weeklyNewcomer = c.mode === "weekly" && !meP && c.status === "accepted";
  if (weeklyNewcomer) question = await publicQuestion(c.id, userId, c.questionIds[0]);
  if (meP && !meP.finishedAt) {
    if (c.mode === "live" && c.status === "live" && c.questionStartedAt) {
      index = c.currentIndex;
      const qid = c.questionIds[c.currentIndex];
      // Keep showing the current question after answering, so the player sees the timer and opponent status.
      if (qid) question = await publicQuestion(c.id, userId, qid);
      msLeft = Math.max(0, c.questionStartedAt.getTime() + c.secondsPerQ * 1000 - Date.now());
    } else if (c.mode !== "live") {
      const canPlay = c.status === "accepted" || (c.status === "pending" && c.createdById === userId);
      const qid = c.questionIds.find((q) => !done.has(q));
      if (canPlay && qid) question = await publicQuestion(c.id, userId, qid);
    }
  }

  const showResults = c.status === "complete" || (c.mode === "weekly" && Boolean(meP?.finishedAt));
  let results: ChallengeView["results"] = null;
  if (showResults) {
    const qs = await prisma.question.findMany({
      where: { id: { in: c.questionIds } },
      select: { id: true, question: true, options: true, correctIndex: true, explanation: true, lessonId: true },
    });
    results = c.questionIds.map((qid) => {
      const q = qs.find((x) => x.id === qid);
      const m = mine.find((a) => a.questionId === qid);
      const t = theirs.find((a) => a.questionId === qid);
      return {
        questionId: qid,
        question: q?.question ?? "",
        correctText: q && q.correctIndex !== null ? q.options[q.correctIndex] : "",
        explanation: q?.explanation ?? null,
        lessonId: q?.lessonId ?? null,
        mine: m ? { chosen: m.chosenText, correct: m.correct, ms: m.ms } : null,
        theirs: t ? { chosen: t.chosenText, correct: t.correct, ms: t.ms } : null,
      };
    });
  }

  let headToHead: ChallengeView["headToHead"] = null;
  if (oppP && showResults) {
    const past = await prisma.challenge.findMany({
      where: { mode: { in: ["async", "live"] }, status: "complete", AND: [{ participants: { some: { userId } } }, { participants: { some: { userId: oppP.userId } } }] },
      select: { participants: { select: { userId: true, score: true, totalMs: true } } },
    });
    headToHead = { wins: 0, losses: 0, ties: 0 };
    for (const p of past) {
      const a = p.participants.find((x) => x.userId === userId);
      const b = p.participants.find((x) => x.userId === oppP.userId);
      if (!a || !b) continue;
      if (a.score === b.score && a.totalMs === b.totalMs) headToHead.ties++;
      else if (a.score > b.score || (a.score === b.score && a.totalMs < b.totalMs)) headToHead.wins++;
      else headToHead.losses++;
    }
  }

  const weeklyTable =
    c.mode === "weekly" && meP?.finishedAt
      ? c.participants
          .filter((p) => p.finishedAt)
          .map((p) => ({ userId: p.userId, name: p.user.name, score: p.score, totalMs: p.totalMs }))
          .sort((a, b) => b.score - a.score || a.totalMs - b.totalMs)
      : null;

  return {
    id: c.id,
    mode: c.mode,
    status: c.status,
    topic: topicLabel(c.topic as ChallengeTopic),
    length: c.questionIds.length,
    expiresAt: c.expiresAt.toISOString(),
    isCreator: c.createdById === userId,
    serverNow: Date.now(),
    me: meP
      ? {
          score: meP.score,
          answered: mine.length,
          finished: Boolean(meP.finishedAt),
          ready: meP.ready,
          answeredCurrent: c.mode === "live" && Boolean(currentQid) && mine.some((a) => a.questionId === currentQid),
        }
      : weeklyNewcomer
        ? { score: 0, answered: 0, finished: false, ready: true }
        : null,
    opponent: oppP
      ? {
          id: oppP.userId,
          name: oppP.user.name,
          // Scores stay hidden until both are done (async), so nobody plays to a known target.
          score: c.status === "complete" || c.mode === "live" ? oppP.score : null,
          answered: theirs.length,
          finished: Boolean(oppP.finishedAt),
          ready: oppP.ready,
          answeredCurrent: c.mode === "live" && Boolean(currentQid) && theirs.some((a) => a.questionId === currentQid),
        }
      : null,
    question,
    index,
    msLeft,
    results,
    headToHead,
    weeklyTable,
  };
}
