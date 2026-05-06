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

export function ConsultingCasePractice() {
  const { careerTracks, narrowTrack } = useCareerTracks();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [showFramework, setShowFramework] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
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
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    setIdx(0);
    setSeconds(0);
    setRunning(false);
    setGrades({});
    setShowFramework(false);
  }, [filtered.length, narrowTrack, careerTracks.join("|")]);

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
        <h2 className="text-sm font-semibold text-zinc-200">Case interview practice (consulting)</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Full case prompts, optional framework hints, timer, and self-grade across four dimensions.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
        <span className="rounded border border-zinc-700 px-2 py-0.5">{current?.type}</span>
        <span>{current?.difficulty}</span>
        {current?.firmSource ? <span className="text-zinc-500">{current.firmSource}</span> : null}
        <span className="ml-auto font-mono text-zinc-300">
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </span>
        <Button size="sm" variant={running ? "outline" : "default"} type="button" onClick={() => setRunning((r) => !r)}>
          {running ? "Pause" : "Start timer"}
        </Button>
        <Button size="sm" variant="ghost" type="button" onClick={() => setSeconds(0)}>
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
            setSeconds(0);
            setRunning(false);
            setGrades({});
            setShowFramework(false);
          }}
        >
          Next case
        </Button>
      </div>
      {current ? (
        <>
          <h3 className="text-base font-medium text-zinc-100">{current.title}</h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{current.prompt}</p>
          {showFramework && current.framework ? (
            <div className="rounded border border-amber-900/40 bg-amber-950/20 p-3 text-sm text-amber-100/90">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-400/90">Framework</p>
              <p className="mt-1 whitespace-pre-wrap">{current.framework}</p>
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
                      className={cn(
                        "h-8 w-8 rounded text-xs font-medium",
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
            Case {idx + 1} of {filtered.length} · Sample walkthrough available in{" "}
            <a href="/cases" className="text-zinc-300 underline-offset-2 hover:underline">
              Cases → Consulting library
            </a>
            .
          </p>
        </>
      ) : null}
    </Card>
  );
}
