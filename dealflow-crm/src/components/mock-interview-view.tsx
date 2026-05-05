"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MOCK_INTERVIEW_BANKS } from "@/lib/mock-interview-constants";
import { cn } from "@/lib/utils";

type Q = {
  id: string;
  question: string;
  category: string;
  bankSource: string;
  year: number | null;
  difficulty: string;
  modelAnswer: string | null;
  tips: string | null;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function MockInterviewView() {
  const [bankCounts, setBankCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [sessionMode, setSessionMode] = useState<"practice" | "timed" | "bank-specific" | null>(null);
  const [bankFilter, setBankFilter] = useState<string | null>(null);
  const [pool, setPool] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState<Record<string, "good" | "ok" | "bad">>({});
  const [draft, setDraft] = useState("");
  const [showModel, setShowModel] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(90);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [ended, setEnded] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [resultScores, setResultScores] = useState<Record<string, "good" | "ok" | "bad">>({});
  const [sessionDurationSec, setSessionDurationSec] = useState(0);
  const [submitQ, setSubmitQ] = useState({
    question: "",
    bankSource: "Goldman Sachs",
    category: "Behavioral",
    difficulty: "Medium",
    year: "2026",
    modelAnswer: "",
  });

  const refreshCounts = useCallback(async () => {
    const res = await fetch("/api/mock-interview/questions");
    if (!res.ok) return;
    const data = (await res.json()) as { bankCounts?: Record<string, number> };
    setBankCounts(data.bankCounts ?? {});
  }, []);

  useEffect(() => {
    void refreshCounts().finally(() => setLoading(false));
  }, [refreshCounts]);

  const current = pool[idx] ?? null;

  useEffect(() => {
    if (!sessionMode || sessionMode !== "timed" || ended || !current) return;
    setSecondsLeft(90);
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [sessionMode, ended, current?.id]);

  const start = async (mode: "practice" | "timed" | "bank-specific", bank: string | null) => {
    setLoading(true);
    const url =
      mode === "bank-specific" && bank
        ? `/api/mock-interview/questions?bank=${encodeURIComponent(bank)}`
        : "/api/mock-interview/questions";
    const res = await fetch(url);
    setLoading(false);
    if (!res.ok) return;
    const data = (await res.json()) as { questions: Q[] };
    let list = data.questions;
    if (mode === "timed") {
      list = shuffle(list).slice(0, 20);
    } else if (mode === "practice") {
      list = shuffle(list).slice(0, 40);
    }
    if (list.length === 0) {
      alert("No questions for this filter.");
      return;
    }
    setPool(list);
    setIdx(0);
    setScores({});
    setDraft("");
    setShowModel(false);
    setAiNote(null);
    setSummary(null);
    setEnded(false);
    setStartedAt(Date.now());
    setSessionMode(mode);
    setBankFilter(mode === "bank-specific" ? bank : null);
    setSecondsLeft(90);
  };

  const grade = (g: "good" | "ok" | "bad") => {
    if (!current) return;
    setScores((s) => ({ ...s, [current.id]: g }));
    setShowModel(false);
    setDraft("");
    setAiNote(null);
    if (idx + 1 >= pool.length) void finishSession({ ...scores, [current.id]: g });
    else {
      setIdx((i) => i + 1);
      if (sessionMode === "timed") setSecondsLeft(90);
    }
  };

  const finishSession = async (finalScores: Record<string, "good" | "ok" | "bad">) => {
    const duration = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0;
    const byCat: Record<string, { good: number; ok: number; bad: number }> = {};
    const weak: string[] = [];
    pool.forEach((q) => {
      const sc = finalScores[q.id];
      if (!sc) return;
      byCat[q.category] = byCat[q.category] ?? { good: 0, ok: 0, bad: 0 };
      byCat[q.category][sc]++;
      if (sc === "bad") weak.push(q.category);
    });
    const breakdown = Object.entries(byCat)
      .map(([c, v]) => `${c}: strong ${v.good}, ok ${v.ok}, weak ${v.bad}`)
      .join("\n");
    const weakCats = [...new Set(weak)].join(", ");
    let aiSummaryText: string | null = null;
    try {
      const res = await fetch("/api/mock-interview/session-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ breakdown, weakCategories: weakCats }),
      });
      if (res.ok) {
        const d = (await res.json()) as { summary?: string };
        aiSummaryText = d.summary ?? null;
      }
    } catch {
      aiSummaryText = null;
    }
    await fetch("/api/mock-interview/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: sessionMode,
        bankFilter,
        questions: pool.map((q) => q.id),
        scores: finalScores,
        duration,
        aiSummary: aiSummaryText,
      }),
    });
    setSessionDurationSec(duration);
    setResultScores(finalScores);
    setSummary(aiSummaryText);
    setEnded(true);
  };

  const aiFeedback = async () => {
    if (!current) return;
    setAiBusy(true);
    try {
      const res = await fetch("/api/mock-interview/ai-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: current.question, draftAnswer: draft }),
      });
      const d = await res.json();
      setAiNote((d as { feedback?: string }).feedback ?? (d as { error?: string }).error ?? "No response");
    } finally {
      setAiBusy(false);
    }
  };

  const submitQuestion = async () => {
    const res = await fetch("/api/mock-interview/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...submitQ,
        year: submitQ.year ? Number(submitQ.year) : null,
      }),
    });
    if (!res.ok) {
      alert("Could not submit");
      return;
    }
    alert("Submitted for admin review.");
    setSubmitQ((s) => ({ ...s, question: "", modelAnswer: "" }));
    void refreshCounts();
  };

  const breakdownText = useMemo(() => {
    const byCat: Record<string, { good: number; ok: number; bad: number }> = {};
    pool.forEach((q) => {
      const sc = resultScores[q.id];
      if (!sc) return;
      byCat[q.category] = byCat[q.category] ?? { good: 0, ok: 0, bad: 0 };
      byCat[q.category][sc]++;
    });
    return Object.entries(byCat)
      .map(([c, v]) => `${c}: Strong ${v.good} · Ok ${v.ok} · Weak ${v.bad}`)
      .join("\n");
  }, [pool, resultScores]);

  if (ended) {
    const duration = sessionDurationSec;
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-xl font-semibold">Session complete</h1>
        <Card className="space-y-2 border-zinc-800 bg-zinc-900/60 p-4 text-sm">
          <p className="text-zinc-400">Time: {Math.floor(duration / 60)}m {duration % 60}s</p>
          <pre className="whitespace-pre-wrap text-zinc-200">{breakdownText || "No scores recorded."}</pre>
          {summary ? <p className="text-zinc-300">{summary}</p> : null}
        </Card>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" asChild variant="outline">
            <Link href="/debriefs">Save debrief / log interview</Link>
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
            New session
          </Button>
        </div>
      </div>
    );
  }

  if (sessionMode && current) {
    const bar = sessionMode === "timed" ? Math.min(100, (secondsLeft / 90) * 100) : 0;
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-4 lg:flex-row">
        <Card className="flex-1 space-y-3 border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
            <span className="rounded border border-zinc-700 px-2 py-0.5">{current.bankSource}</span>
            {current.year ? <span>{current.year}</span> : null}
            <span className="rounded bg-zinc-800 px-2 py-0.5">{current.category}</span>
            <span>{current.difficulty}</span>
          </div>
          {sessionMode === "timed" ? (
            <div>
              <div className="mb-1 flex justify-between text-xs text-zinc-500">
                <span>Question timer</span>
                <span>{secondsLeft}s</span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-zinc-800">
                <div className="h-full bg-[#4a6fa5] transition-all" style={{ width: `${bar}%` }} />
              </div>
            </div>
          ) : null}
          <p className="text-lg text-zinc-100">{current.question}</p>
          <p className="text-xs text-zinc-500">
            Question {idx + 1} of {pool.length}
          </p>
          <textarea
            className="min-h-[100px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm"
            placeholder="Optional: type your answer draft…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" type="button" onClick={() => setShowModel((s) => !s)}>
              {showModel ? "Hide" : "Show"} model answer
            </Button>
            <Button size="sm" variant="outline" type="button" disabled={aiBusy} onClick={() => void aiFeedback()}>
              {aiBusy ? "…" : "AI feedback"}
            </Button>
          </div>
          {aiNote ? <p className="text-sm text-[#e8e8e8]/90">{aiNote}</p> : null}
          {showModel && (current.modelAnswer || current.tips) ? (
            <div className="rounded border border-zinc-700 bg-zinc-950/80 p-3 text-sm text-zinc-300">
              {current.modelAnswer ? <p className="mb-2">{current.modelAnswer}</p> : null}
              {current.tips ? <p className="text-xs text-amber-200/90">Tip: {current.tips}</p> : null}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button className="bg-emerald-700 hover:bg-emerald-600" type="button" onClick={() => grade("good")}>
              Strong
            </Button>
            <Button className="bg-amber-700 hover:bg-amber-600" type="button" onClick={() => grade("ok")}>
              Ok
            </Button>
            <Button className="bg-red-800 hover:bg-red-700" type="button" onClick={() => grade("bad")}>
              Weak
            </Button>
            <Button size="sm" variant="ghost" type="button" onClick={() => void finishSession(scores)}>
              End early
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Mock Interview</h1>
        <p className="mt-1 text-sm text-[#888888]">
          <span className="text-[#f0f0f0]">SHARED</span> question bank ·{" "}
          <span className="text-[#c9a84c]">PRIVATE</span> sessions &amp; grades
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <Card className="h-fit space-y-2 border-zinc-800 bg-zinc-900/50 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Banks</p>
          {MOCK_INTERVIEW_BANKS.map((b) => (
            <button
              key={b}
              type="button"
              className={cn(
                "flex w-full items-center justify-between rounded px-2 py-1.5 text-left hover:bg-zinc-800",
                bankFilter === b && "bg-zinc-800",
              )}
              onClick={() => setBankFilter(b)}
            >
              <span className="truncate">{b}</span>
              <span className="text-xs text-zinc-500">{bankCounts[b] ?? 0}</span>
            </button>
          ))}
        </Card>
        <div className="space-y-4">
          <Card className="space-y-3 border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-sm font-medium text-zinc-200">Start</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={loading} onClick={() => void start("practice", null)}>
                Practice (untimed)
              </Button>
              <Button size="sm" disabled={loading} onClick={() => void start("timed", null)}>
                Timed (~20×90s)
              </Button>
              <Button
                size="sm"
                disabled={loading || !bankFilter}
                onClick={() => bankFilter && void start("bank-specific", bankFilter)}
              >
                Bank mode
              </Button>
            </div>
            <p className="text-xs text-zinc-500">Pick a bank on the left for Bank mode. Timed uses a mixed bank set.</p>
          </Card>
          <Card className="space-y-2 border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-sm font-medium text-zinc-200">Submit a question</p>
            <Input
              placeholder="Question"
              value={submitQ.question}
              onChange={(e) => setSubmitQ((s) => ({ ...s, question: e.target.value }))}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                className="rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
                value={submitQ.bankSource}
                onChange={(e) => setSubmitQ((s) => ({ ...s, bankSource: e.target.value }))}
              >
                {MOCK_INTERVIEW_BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <select
                className="rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
                value={submitQ.category}
                onChange={(e) => setSubmitQ((s) => ({ ...s, category: e.target.value }))}
              >
                {["Behavioral", "Technical", "Deal Discussion"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                className="rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
                value={submitQ.difficulty}
                onChange={(e) => setSubmitQ((s) => ({ ...s, difficulty: e.target.value }))}
              >
                {["Easy", "Medium", "Hard"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Year"
                value={submitQ.year}
                onChange={(e) => setSubmitQ((s) => ({ ...s, year: e.target.value }))}
              />
            </div>
            <textarea
              className="min-h-[80px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm"
              placeholder="Model answer (optional)"
              value={submitQ.modelAnswer}
              onChange={(e) => setSubmitQ((s) => ({ ...s, modelAnswer: e.target.value }))}
            />
            <Button size="sm" onClick={() => void submitQuestion()}>
              Submit for review
            </Button>
          </Card>
          <p className="text-xs text-zinc-500">
            <Link className="text-[#f0f0f0] underline-offset-4 hover:underline" href="/debriefs">
              Interview debriefs (private)
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
