import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { FitQuestions } from "@/components/fit/fit-questions";
import { getFitData, getGroupFinderData } from "@/lib/fit-content";
import { draftBasics, variantChoices } from "@/lib/fit-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fit questions" };

export default async function FitQuestionsPage({ searchParams }: { searchParams: Promise<{ q?: string; v?: string }> }) {
  const userId = await requireUserId();
  const sp = await searchParams;
  const [data, finder, answers, stories, choices, basics] = await Promise.all([
    getFitData(),
    getGroupFinderData(),
    prisma.fitAnswer.findMany({ where: { userId }, select: { questionId: true, variant: true, status: true } }),
    prisma.story.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    variantChoices(userId),
    draftBasics(userId),
  ]);
  const questionId = sp.q && data.questions.some((q) => q.id === sp.q) ? sp.q : null;
  return (
    <div className="space-y-6">
      <PageHeader title="Storybank" subtitle="Build, check, and practice your answers to the fit questions every interview asks." />
      <FitQuestions
        data={data}
        statuses={Object.fromEntries(answers.map((a) => [`${a.questionId}|${a.variant}`, a.status]))}
        choices={choices}
        stories={stories.map((s) => {
          const p = (s.polished ?? null) as { oneLiner?: string; situation?: string; task?: string; action?: string; result?: string } | null;
          return { id: s.id, slot: s.slot, title: s.title, oneLiner: p?.oneLiner ?? null, parts: p ? { situation: p.situation, task: p.task, action: p.action, result: p.result } : null };
        })}
        groups={finder.groups}
        basics={basics}
        initial={{ questionId, variant: (sp.v ?? "").slice(0, 200) }}
      />
    </div>
  );
}
