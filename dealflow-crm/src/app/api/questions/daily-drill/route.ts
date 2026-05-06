import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { matchesCareerTracks } from "@/lib/career-tracks";
import { getRelevantCategories } from "@/lib/track-utils";

function utcDayString(d: Date) {
  return d.toISOString().slice(0, 10);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = utcDayString(new Date());

  const [existing, user] = await Promise.all([
    prisma.dailyDrillLog.findUnique({
      where: { userId_date: { userId, date: today } },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { drillStreak: true, lastDrillDay: true, xp: true, weeklyXP: true, careerTracks: true },
    }),
  ]);

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing) {
    return NextResponse.json({
      completed: true,
      drillStreak: user.drillStreak,
      xp: user.xp,
      weeklyXP: user.weeklyXP,
      log: existing,
    });
  }

  const rawQuestions = await prisma.question.findMany({
    where: { status: "active" },
    select: {
      id: true,
      question: true,
      answer: true,
      category: true,
      subcategory: true,
      difficulty: true,
      tags: true,
      keywords: true,
      careerTracks: true,
    },
  });

  const pt = user.careerTracks ?? [];
  const relevantCategories = getRelevantCategories(pt);
  const filtered = rawQuestions.filter((q) => matchesCareerTracks(q.careerTracks, pt, null));
  const questions = filtered.length > 0 ? filtered : rawQuestions;

  const progressRows = await prisma.userQuestionProgress.findMany({
    where: { userId },
    select: { questionId: true, status: true },
  });
  const progressMap = new Map(progressRows.map((p) => [p.questionId, p.status]));

  const byCat = new Map<string, { total: number; known: number }>();
  for (const q of questions) {
    const st = progressMap.get(q.id) ?? "unseen";
    const cur = byCat.get(q.category) ?? { total: 0, known: 0 };
    cur.total += 1;
    if (st === "known") cur.known += 1;
    byCat.set(q.category, cur);
  }

  const catOrder = Array.from(byCat.entries())
    .map(([cat, { total, known }]) => ({
      cat,
      rate: total ? known / total : 0,
    }))
    .sort((a, b) => a.rate - b.rate)
    .map((c) => c.cat);

  const weakFirst = (qs: typeof questions) => {
    const ordered: typeof questions = [];
    const seen = new Set<string>();
    for (const cat of catOrder) {
      for (const q of qs) {
        if (q.category !== cat || seen.has(q.id)) continue;
        seen.add(q.id);
        ordered.push(q);
      }
    }
    for (const q of qs) {
      if (!seen.has(q.id)) ordered.push(q);
    }
    return ordered;
  };

  const reviewOrUnseen = questions.filter((q) => {
    const st = progressMap.get(q.id) ?? "unseen";
    return st === "review" || st === "unseen";
  });

  const prioritized = weakFirst(reviewOrUnseen).sort((a, b) => {
    const aRel = relevantCategories.includes(a.category) ? 1 : 0;
    const bRel = relevantCategories.includes(b.category) ? 1 : 0;
    return bRel - aRel;
  });
  let selected = prioritized.slice(0, 5);
  if (selected.length < 5) {
    const rest = shuffle(questions.filter((q) => !selected.some((s) => s.id === q.id)));
    selected = [...selected, ...rest].slice(0, 5);
  }

  const mcqPool = questions.map((q) => ({ id: q.id, answer: q.answer, category: q.category }));

  return NextResponse.json({
    completed: false,
    questions: selected,
    mcqPool,
    drillStreak: user.drillStreak,
    xp: user.xp,
    weeklyXP: user.weeklyXP,
  });
}
