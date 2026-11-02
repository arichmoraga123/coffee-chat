import { requireAdminUserId } from "@/lib/auth";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminQuestionsPanel } from "@/components/admin-questions-panel";
import { MCQ_WHERE } from "@/lib/mcq/server";
import { allLessons } from "@/lib/learn/lessons";

export const dynamic = "force-dynamic";

export default async function AdminQuestionsPage() {
  await requireAdminUserId();
  // Underfilled lessons: fewer than 9 practice questions, so gaps are visible as the bank grows.
  const counts = await prisma.question.groupBy({ by: ["lessonId"], where: MCQ_WHERE, _count: { _all: true } });
  const byLesson = new Map(counts.map((c) => [c.lessonId ?? "", c._count._all]));
  const underfilled = allLessons()
    .map((l) => ({ id: l.id, title: l.title, count: byLesson.get(l.id) ?? 0 }))
    .filter((l) => l.count < 9);
  return (
    <div className="space-y-3">
      <h1 className="page-title">Admin · Questions</h1>
      <details className="rounded-[var(--radius-lg)] border border-border bg-surface p-4" open={underfilled.length > 0}>
        <summary className="cursor-pointer text-sm font-semibold text-ink">
          Underfilled lessons ({underfilled.length}) <span className="font-normal text-ink-3">· fewer than 9 practice questions</span>
        </summary>
        {underfilled.length ? (
          <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {underfilled.map((l) => (
              <li key={l.id}>
                <Link href={`/learn/${l.id}`} className="hover:underline">
                  <span className="tabular-nums text-ink-3">{l.id.replace("-", ".")}</span> {l.title}
                </Link>{" "}
                <span className={l.count ? "text-warn" : "text-danger"}>· {l.count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-3">Every lesson has at least 9 questions.</p>
        )}
      </details>
      <AdminQuestionsPanel />
    </div>
  );
}
