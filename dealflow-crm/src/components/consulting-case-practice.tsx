"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCareerTracks } from "@/components/career-track-provider";
import { matchesCareerTracks } from "@/lib/career-tracks";

type CaseRow = {
  id: string;
  title: string;
  type: string;
  difficulty: string;
  prompt: string;
  framework: string | null;
  sampleAnswer: string | null;
  firmSource: string | null;
  careerTracks: string[];
};

const GRADES = [1, 2, 3, 4, 5] as const;
type Dim = "structure" | "analysis" | "communication" | "recommendation";
const CASE_TIME_LIMIT_SEC = 20 * 60;

export function ConsultingCasePractice() {
  const { careerTracks, narrowTrack } = useCareerTracks();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [showFramework, setShowFramework] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(CASE_TIME_LIMIT_SEC);
  const [running, setRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [clarifyingNotes, setClarifyingNotes] = useState("");
  const [structureNotes, setStructureNotes] = useState("");
  const [analysisNotes, setAnalysisNotes] = useState("");
  const [recommendationNotes, setRecommendationNotes] = useState("");
  const [grades, setGrades] = useState<Partial<Record<Dim, number>>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/consulting-cases");
    if (res.ok) {
      const d = (await res.json()) as { cases: CaseRow[] };
      setCases(d.cases ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => cases.filter((c) => matchesCareerTracks(c.careerTracks, careerTracks, narrowTrack)),
    [cases, careerTracks, narrowTrack],
  );

  const current = filtered[idx] ?? null;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(
      () =>
        setSecondsLeft((s) => {
          if (s <= 1) {
            setRunning(false);
            return 0;
          }
          return s - 1;
        }),
      1000,
    );
    return () => clearInterval(t);
  }, [running]);

  const resetCurrentCase = useCallback(() => {
    setShowFramework(false);
    setSecondsLeft(CASE_TIME_LIMIT_SEC);
    setRunning(false);
    setIsComplete(false);
    setClarifyingNotes("");
    setStructureNotes("");
    setAnalysisNotes("");
    setRecommendationNotes("");
    setGrades({});
  }, []);

  useEffect(() => {
    setIdx(0);
    resetCurrentCase();
  }, [filtered.length, narrowTrack, careerTracks.join("|"), resetCurrentCase]);

  if (loading) return <p className="text-sm text-zinc-500">Loading consulting cases…</p>;
  if (!filtered.length) {
    return (
      <p className="text-sm text-zinc-500">
        No consulting cases match your career track filters — add &quot;Consulting&quot; in onboarding or profile.
      </p>
    );
  }

  return (
    <Card className="space-y-4 border-zinc-800 bg-zinc-900/50 p-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-200">Case Practice</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Step through full consulting cases with a 20-minute timer, framework hints, model walkthrough, and self-grading.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
        <span className="rounded border border-zinc-700 px-2 py-0.5">{current?.type}</span>
        <span>{current?.difficulty}</span>
        {current?.firmSource ? <span className="text-zinc-500">{current.firmSource}</span> : null}
        <span className="ml-auto font-mono text-zinc-300">
          {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
        </span>
        <Button
          size="sm"
          variant={running ? "outline" : "default"}
          type="button"
          onClick={() => setRunning((r) => !r)}
          disabled={isComplete}
        >
          {running ? "Pause" : "Start timer"}
        </Button>
        <Button size="sm" variant="ghost" type="button" onClick={() => setSecondsLeft(CASE_TIME_LIMIT_SEC)}>
          Reset
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" type="button" onClick={() => setShowFramework((s) => !s)}>
          {showFramework ? "Hide" : "Show"} framework hints
        </Button>
        <Button
          size="sm"
          variant="outline"
          type="button"
          onClick={() => {
            setIdx((i) => (i + 1 >= filtered.length ? 0 : i + 1));
            resetCurrentCase();
          }}
        >
          Next case
        </Button>
        <Button
          size="sm"
          variant="outline"
          type="button"
          onClick={() => {
            setIsComplete(true);
            setRunning(false);
          }}
        >
          Complete case
        </Button>
      </div>
      {current ? (
        <>
          <h3 className="text-base font-medium text-zinc-100">{current.title}</h3>
          <div className="space-y-3 rounded border border-zinc-800 bg-zinc-950/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Step 1 - Read case prompt</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{current.prompt}</p>
          </div>
          <div className="space-y-2 rounded border border-zinc-800 bg-zinc-950/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Step 2 - Clarifying questions
            </p>
            <textarea
              className="min-h-[88px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm text-zinc-200"
              placeholder="Write the clarifying questions you'd ask the interviewer..."
              value={clarifyingNotes}
              onChange={(e) => setClarifyingNotes(e.target.value)}
              disabled={isComplete}
            />
          </div>
          <div className="space-y-2 rounded border border-zinc-800 bg-zinc-950/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Step 3 - Structure your approach
            </p>
            <textarea
              className="min-h-[96px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm text-zinc-200"
              placeholder="Lay out your framework and key branches..."
              value={structureNotes}
              onChange={(e) => setStructureNotes(e.target.value)}
              disabled={isComplete}
            />
          </div>
          {showFramework && current.framework ? (
            <div className="rounded border border-amber-900/40 bg-amber-950/20 p-3 text-sm text-amber-100/90">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-400/90">Framework hint</p>
              <p className="mt-1 whitespace-pre-wrap">{current.framework}</p>
            </div>
          ) : null}
          <div className="space-y-2 rounded border border-zinc-800 bg-zinc-950/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Step 4 - Analyze (include data and calculations)
            </p>
            <textarea
              className="min-h-[120px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm text-zinc-200"
              placeholder="Work through the core analysis, sizing math, and key insights..."
              value={analysisNotes}
              onChange={(e) => setAnalysisNotes(e.target.value)}
              disabled={isComplete}
            />
          </div>
          <div className="space-y-2 rounded border border-zinc-800 bg-zinc-950/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Step 5 - Recommendation
            </p>
            <textarea
              className="min-h-[96px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm text-zinc-200"
              placeholder="Give a clear recommendation and why..."
              value={recommendationNotes}
              onChange={(e) => setRecommendationNotes(e.target.value)}
              disabled={isComplete}
            />
          </div>
          {isComplete && current.sampleAnswer ? (
            <div className="rounded border border-emerald-900/40 bg-emerald-950/20 p-3 text-sm text-emerald-100/90">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400/90">
                Model answer walkthrough
              </p>
              <p className="mt-1 whitespace-pre-wrap">{current.sampleAnswer}</p>
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["structure", "Structure"],
                ["analysis", "Analysis"],
                ["communication", "Communication"],
                ["recommendation", "Recommendation"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <p className="text-xs text-zinc-500">{label} (1–5)</p>
                <div className="flex flex-wrap gap-1">
                  {GRADES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrades((prev) => ({ ...prev, [key]: g }))}
                      disabled={!isComplete}
                      className={cn(
                        "h-8 w-8 rounded text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50",
                        grades[key] === g
                          ? "bg-[#4a6fa5] text-white"
                          : "border border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-zinc-500",
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-600">
            Case {idx + 1} of {filtered.length}
          </p>
        </>
      ) : null}
    </Card>
  );
}
