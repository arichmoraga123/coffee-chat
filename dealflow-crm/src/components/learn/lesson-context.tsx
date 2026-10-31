"use client";

import { createContext, useContext } from "react";
import type { BlockState, EventResult, LessonEvent } from "@/lib/learn/progress-server";

export type ResourceInfo = {
  student?: { id: string; title: string; description: string | null; fileName: string };
  answerKey?: { id: string; fileName: string };
};

export type LessonCtx = {
  lessonId: string;
  /** Per-user seed so shuffles are stable across visits. */
  seed: string;
  isAdmin: boolean;
  completed: boolean;
  resources: Record<string, ResourceInfo>;
  state: (blockId: string) => BlockState;
  send: (blockId: string, event: LessonEvent) => Promise<EventResult | null>;
};

export const LessonContext = createContext<LessonCtx | null>(null);

export function useLesson(): LessonCtx {
  const ctx = useContext(LessonContext);
  if (!ctx) throw new Error("useLesson must be used inside <LessonContext>");
  return ctx;
}
