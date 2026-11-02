import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getFitData } from "@/lib/fit-content";
import { draftBasics } from "@/lib/fit-server";
import { promptFor, type FitQuestion } from "@/lib/fit";
import type { FitSources } from "@/lib/fit-ai";

export type FitAnswerDTO = {
  id: string;
  questionId: string;
  variant: string;
  builder: Record<string, string>;
  linkedStoryIds: string[];
  includedInteractionIds: string[];
  draft: string;
  feedback: unknown;
  status: string;
  selfRating: string | null;
  practicedAt: string | null;
  updatedAt: string;
  versions: { id: string; draft: string; createdAt: string }[];
};

export async function loadAnswer(userId: string, questionId: string, variant: string): Promise<FitAnswerDTO | null> {
  const a = await prisma.fitAnswer.findUnique({
    where: { userId_questionId_variant: { userId, questionId, variant } },
    include: { versions: { orderBy: { createdAt: "desc" }, take: 30, select: { id: true, draft: true, createdAt: true } } },
  });
  if (!a) return null;
  return {
    id: a.id,
    questionId: a.questionId,
    variant: a.variant,
    builder: (a.builder ?? {}) as Record<string, string>,
    linkedStoryIds: a.linkedStoryIds,
    includedInteractionIds: a.includedInteractionIds,
    draft: a.draft,
    feedback: a.feedback,
    status: a.status,
    selfRating: a.selfRating,
    practicedAt: a.practicedAt?.toISOString() ?? null,
    updatedAt: a.updatedAt.toISOString(),
    versions: a.versions.map((v) => ({ id: v.id, draft: v.draft, createdAt: v.createdAt.toISOString() })),
  };
}

export async function findQuestion(questionId: string): Promise<FitQuestion | null> {
  return (await getFitData()).questions.find((q) => q.id === questionId) ?? null;
}

/** Everything the AI may use: builder answers, linked stories, included interactions. Nothing else. */
export async function aiSources(
  userId: string,
  q: FitQuestion,
  input: { variant: string; builder: Record<string, string>; linkedStoryIds: string[]; includedInteractionIds: string[]; draft?: string },
): Promise<FitSources> {
  const [basics, stories, interactions] = await Promise.all([
    draftBasics(userId),
    input.linkedStoryIds.length ? prisma.story.findMany({ where: { userId, id: { in: input.linkedStoryIds } } }) : [],
    input.includedInteractionIds.length
      ? prisma.interaction.findMany({
          where: { userId, id: { in: input.includedInteractionIds }, deletedAt: null },
          select: { date: true, notes: true, adviceGiven: true, contact: { select: { fullName: true, firm: { select: { name: true } } } } },
        })
      : [],
  ]);
  return {
    question: q,
    prompt: promptFor(q, input.variant),
    level: basics.level,
    builder: input.builder,
    stories: stories.map((s) => {
      const p = (s.polished ?? null) as { twoMinute?: string; situation?: string; action?: string; result?: string } | null;
      return { title: s.title || s.slot, text: p?.twoMinute || [p?.situation, p?.action, p?.result].filter(Boolean).join(" ") || s.rawText };
    }),
    interactions: interactions.map((i) => ({ date: i.date.toISOString().slice(0, 10), contact: i.contact.fullName, firm: i.contact.firm.name, firstLine: (i.notes || i.adviceGiven || "").split("\n")[0].slice(0, 300) })),
    draft: input.draft,
  };
}

export const builderJson = (b: Record<string, string>) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k.slice(0, 60), String(v ?? "").slice(0, 4000)])) as Prisma.InputJsonValue;
