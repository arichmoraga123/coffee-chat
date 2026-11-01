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
  const [selectedType, setSelectedType] = useState("all");
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);

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

  const typeFiltered = useMemo(() => {
    if (selectedType === "all") return filtered;
    return filtered.filter((c) => c.type === selectedType);
  }, [filtered, selectedType]);

  const current = typeFiltered[idx] ?? null;
  const caseTypes = useMemo(() => ["all", ...Array.from(new Set(filtered.map((c) => c.type))).sort()], [filtered]);

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

  useEffect(() => {
    setIdx(0);
    resetCurrentCase();
    setActiveCaseId(null);
  }, [selectedType, resetCurrentCase]);

  if (loading) return <p className="text-sm text-ink-3">Loading consulting cases…</p>;
  if (!filtered.length) {
    return (
      <p className="text-sm text-ink-3">
        No consulting cases match your career track filters — add &quot;Consulting&quot; in onboarding or profile.
      </p>
    );
  }

  return (
    <Card className="space-y-4 border-border bg-surface p-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">Case Practice</h2>
        <p className="mt-1 text-xs text-ink-3">
          Step through full consulting cases with a 20-minute timer, framework hints, model walkthrough, and self-grading.
        </p>
      </div>
      {!activeCaseId ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant={selectedType === "all" ? "default" : "outline"} onClick={() => setSelectedType("all")}>
              Browse All Cases
            </Button>
            {caseTypes
              .filter((t) => t !== "all")
              .map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={selectedType === t ? "default" : "outline"}
                  onClick={() => setSelectedType(t)}
                >
                  {t}
                </Button>
              ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {typeFiltered.map((c) => (
              <button
                key={c.id}
                type="button"
                className="rounded border border-border bg-surface p-3 text-left hover:border-border-strong"
                onClick={() => {
                  const nextIdx = typeFiltered.findIndex((x) => x.id === c.id);
                  setIdx(nextIdx >= 0 ? nextIdx : 0);
                  setActiveCaseId(c.id);
                  resetCurrentCase();
                }}
              >
                <p className="font-medium text-ink">{c.title}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink-2">
                  <span className="rounded bg-surface-2 px-2 py-0.5">{c.type}</span>
                  <span className="rounded border border-border-strong px-2 py-0.5">{c.difficulty}</span>
                  {c.firmSource ? <span>{c.firmSource}</span> : null}
                </div>
              </button>
            ))}
          </div>
        </>
      ) : null}
      {activeCaseId ? (
        <>
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-2">
        <span className="rounded border border-border-strong px-2 py-0.5">{current?.type}</span>
        <span>{current?.difficulty}</span>
        {current?.firmSource ? <span className="text-ink-3">{current.firmSource}</span> : null}
        <span className="ml-auto font-mono text-ink-2">
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
            setIdx((i) => (i + 1 >= typeFiltered.length ? 0 : i + 1));
            resetCurrentCase();
          }}
        >
          Next case
        </Button>
        <Button size="sm" variant="ghost" type="button" onClick={() => setActiveCaseId(null)}>
          Back to case list
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
          <h3 className="text-base font-medium text-ink">{current.title}</h3>
          <div className="space-y-3 rounded border border-border bg-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">Step 1 - Read case prompt</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{current.prompt}</p>
          </div>
          <div className="space-y-2 rounded border border-border bg-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">
              Step 2 - Clarifying questions
            </p>
            <textarea
              className="min-h-[88px] w-full rounded border border-border-strong bg-surface p-2 text-sm text-ink"
              placeholder="Write the clarifying questions you'd ask the interviewer..."
              value={clarifyingNotes}
              onChange={(e) => setClarifyingNotes(e.target.value)}
              disabled={isComplete}
            />
          </div>
          <div className="space-y-2 rounded border border-border bg-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">
              Step 3 - Structure your approach
            </p>
            <textarea
              className="min-h-[96px] w-full rounded border border-border-strong bg-surface p-2 text-sm text-ink"
              placeholder="Lay out your framework and key branches..."
              value={structureNotes}
              onChange={(e) => setStructureNotes(e.target.value)}
              disabled={isComplete}
            />
          </div>
          {showFramework && current.framework ? (
            <div className="rounded border border-warn/40 bg-warn-bg p-3 text-sm text-warn">
              <p className="text-xs font-semibold uppercase tracking-wide text-warn">Framework hint</p>
              <p className="mt-1 whitespace-pre-wrap">{current.framework}</p>
            </div>
          ) : null}
          <div className="space-y-2 rounded border border-border bg-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">
              Step 4 - Analyze (include data and calculations)
            </p>
            <textarea
              className="min-h-[120px] w-full rounded border border-border-strong bg-surface p-2 text-sm text-ink"
              placeholder="Work through the core analysis, sizing math, and key insights..."
              value={analysisNotes}
              onChange={(e) => setAnalysisNotes(e.target.value)}
              disabled={isComplete}
            />
          </div>
          <div className="space-y-2 rounded border border-border bg-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">
              Step 5 - Recommendation
            </p>
            <textarea
              className="min-h-[96px] w-full rounded border border-border-strong bg-surface p-2 text-sm text-ink"
              placeholder="Give a clear recommendation and why..."
              value={recommendationNotes}
              onChange={(e) => setRecommendationNotes(e.target.value)}
              disabled={isComplete}
            />
          </div>
          {isComplete && current.sampleAnswer ? (
            <div className="rounded border border-success/40 bg-success-bg p-3 text-sm text-success">
              <p className="text-xs font-semibold uppercase tracking-wide text-success">
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
                <p className="text-xs text-ink-3">{label} (1–5)</p>
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
                          ? "bg-accent text-on-accent"
                          : "border border-border-strong bg-surface text-ink-2 hover:border-border-strong",
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-3">
            Case {idx + 1} of {typeFiltered.length}
          </p>
        </>
      ) : null}
      </>
      ) : null}
    </Card>
  );
}
