"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { gradeAnswerByKeywords, type KeywordGradeResult } from "@/lib/answer-grader";

export type PracticeQuestion = {
  id: string;
  question: string;
  answer: string | null;
  category: string;
  difficulty: string;
  sourceLabel?: string | null;
  keywords?: string[];
  statusLabel?: string;
};

type Props = {
  open: boolean;
  title?: string;
  questions: PracticeQuestion[];
  index: number;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
  onMarkKnown?: (questionId: string) => Promise<void> | void;
  onMarkReview?: (questionId: string) => Promise<void> | void;
};

type SelfGrade = "strong" | "partial" | "weak";

function clampIndex(index: number, max: number) {
  if (max <= 0) return 0;
  if (index < 0) return 0;
  if (index >= max) return max - 1;
  return index;
}

export function PracticeModal({
  open,
  title = "Practice Question",
  questions,
  index,
  onClose,
  onNavigate,
  onMarkKnown,
  onMarkReview,
}: Props) {
  const safeIndex = clampIndex(index, questions.length);
  const current = questions[safeIndex] ?? null;
  const [typedAnswer, setTypedAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  const [gradeResult, setGradeResult] = useState<KeywordGradeResult | null>(null);
  const [selfGrade, setSelfGrade] = useState<SelfGrade | null>(null);

  useEffect(() => {
    setTypedAnswer("");
    setSubmitted(false);
    setShowModelAnswer(false);
    setGradeResult(null);
    setSelfGrade(null);
  }, [safeIndex, open]);

  const hasKeywordScoring = useMemo(() => (current?.keywords?.length ?? 0) > 0, [current?.keywords]);

  const canSubmit = typedAnswer.trim().length > 0 && !submitted;

  const submit = () => {
    if (!current || !canSubmit) return;
    setSubmitted(true);
    if (hasKeywordScoring) {
      setGradeResult(
        gradeAnswerByKeywords({
          userAnswer: typedAnswer,
          modelAnswer: current.answer ?? "",
          keywords: current.keywords ?? [],
        }),
      );
    }
  };

  const next = () => {
    if (safeIndex + 1 >= questions.length) return;
    onNavigate(safeIndex + 1);
  };
  const prev = () => {
    if (safeIndex <= 0) return;
    onNavigate(safeIndex - 1);
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
        return;
      }
      if ((e.key === "Enter" && e.ctrlKey) || e.key === "Enter") {
        const activeTag = (document.activeElement?.tagName ?? "").toLowerCase();
        const onTextarea = activeTag === "textarea";
        if (e.key === "Enter" && !e.ctrlKey && onTextarea) return;
        e.preventDefault();
        submit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, safeIndex, questions.length, typedAnswer, submitted, hasKeywordScoring]);

  if (!current) return null;

  const renderedGrade =
    hasKeywordScoring && gradeResult
      ? gradeResult.grade === "correct"
        ? "Strong"
        : gradeResult.grade === "partial"
          ? "Partial"
          : "Needs Work"
      : selfGrade === "strong"
        ? "Strong"
        : selfGrade === "partial"
          ? "Partial"
          : selfGrade === "weak"
            ? "Needs Work"
            : null;

  const xpEarned =
    hasKeywordScoring && gradeResult
      ? gradeResult.xpEarned
      : selfGrade === "strong"
        ? 10
        : selfGrade === "partial"
          ? 5
          : selfGrade === "weak"
            ? 0
            : null;

  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-3xl">
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          {current.sourceLabel ? (
            <span className="rounded border border-zinc-700 px-2 py-0.5">{current.sourceLabel}</span>
          ) : null}
          <span className="rounded bg-zinc-800 px-2 py-0.5">{current.category}</span>
          <span className="rounded border border-zinc-700 px-2 py-0.5">{current.difficulty}</span>
          {current.statusLabel ? (
            <span className="rounded border border-zinc-700 px-2 py-0.5 capitalize">{current.statusLabel}</span>
          ) : null}
          <span className="ml-auto text-zinc-500">
            {safeIndex + 1} of {questions.length}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <Button size="sm" variant="outline" disabled={safeIndex <= 0} onClick={prev}>
            ← Previous
          </Button>
          <Button size="sm" variant="outline" disabled={safeIndex + 1 >= questions.length} onClick={next}>
            Next →
          </Button>
        </div>

        <p className="text-base font-medium text-zinc-100">{current.question}</p>

        <textarea
          className="min-h-[120px] w-full resize-y rounded border border-zinc-700 bg-zinc-950 p-2 text-zinc-100"
          placeholder="Type your answer here..."
          value={typedAnswer}
          onChange={(e) => setTypedAnswer(e.target.value)}
          rows={4}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />

        <div className="flex flex-wrap gap-2">
          <Button onClick={submit} disabled={!canSubmit}>
            {hasKeywordScoring ? "Grade My Answer" : "Self Grade"}
          </Button>
          <Button variant="outline" onClick={() => setShowModelAnswer((s) => !s)} disabled={!submitted}>
            {showModelAnswer ? "Hide Full Answer" : "Show Full Answer"}
          </Button>
        </div>

        {submitted && !hasKeywordScoring ? (
          <div className="space-y-2 rounded border border-zinc-700 bg-zinc-950/50 p-3">
            <p className="text-xs text-zinc-400">No keyword model for this question. Self-grade your response:</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setSelfGrade("strong")}>
                Strong
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelfGrade("partial")}>
                Partial
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelfGrade("weak")}>
                Weak
              </Button>
            </div>
          </div>
        ) : null}

        {submitted && (gradeResult || selfGrade) ? (
          <div className="space-y-2 rounded border border-zinc-700 bg-zinc-950/50 p-3">
            <p className="font-medium text-zinc-100">
              {renderedGrade} {xpEarned != null ? `· XP +${xpEarned}` : ""}
            </p>
            {gradeResult ? (
              <>
                <p className="text-xs text-emerald-300">
                  ✓ mentioned: {gradeResult.foundKeywords.length ? gradeResult.foundKeywords.join(", ") : "none"}
                </p>
                <p className="text-xs text-red-300">
                  ✗ missed: {gradeResult.missedKeywords.length ? gradeResult.missedKeywords.join(", ") : "none"}
                </p>
              </>
            ) : null}
          </div>
        ) : null}

        {showModelAnswer && current.answer ? (
          <div className="rounded border border-zinc-700 bg-zinc-950/70 p-3 text-zinc-200">
            <p className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Model answer</p>
            <p className="whitespace-pre-wrap">{current.answer}</p>
          </div>
        ) : null}

        {submitted ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                void onMarkKnown?.(current.id);
              }}
            >
              Mark Known
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void onMarkReview?.(current.id);
              }}
            >
              Mark for Review
            </Button>
            <Button onClick={next} disabled={safeIndex + 1 >= questions.length}>
              Next Question →
            </Button>
          </div>
        ) : null}

        <p className="text-xs text-zinc-500">Ctrl+Enter or Enter = Submit · ←/→ = Navigate · Esc = Close</p>
      </div>
    </Modal>
  );
}
