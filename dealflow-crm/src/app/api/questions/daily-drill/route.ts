import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

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
      select: { drillStreak: true, lastDrillDay: true, xp: true, weeklyXP: true },
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

  const questions = await prisma.question.findMany({
    where: { status: "active" },
    select: {
      id: true,
      question: true,
      answer: true,
      category: true,
      subcategory: true,
      difficulty: true,
      tags: true,
    },
  });

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

  let selected = weakFirst(reviewOrUnseen).slice(0, 5);
  if (selected.length < 5) {
    const rest = shuffle(questions.filter((q) => !selected.some((s) => s.id === q.id)));
    selected = [...selected, ...rest].slice(0, 5);
  }

  return NextResponse.json({
    completed: false,
    questions: selected,
    drillStreak: user.drillStreak,
    xp: user.xp,
    weeklyXP: user.weeklyXP,
  });
}
