"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPrimaryTrack, getResumeTrackSectionLabel } from "@/lib/track-utils";

type Severity = "critical" | "moderate" | "minor";
type WeakBullet = {
  original: string;
  problem: string;
  rewritten: string;
};

type FeedbackShape = {
  overallScore: number;
  targetTrack?: string;
  oneLiner?: string;
  recruitingReadiness?: string;
  visualAnalysis?: {
    score: number;
    grade: string;
    feedback: string;
    issues: Array<{ issue: string; severity: Severity; fix: string }>;
  };
  visualAnalysisUnavailable?: boolean;
  visualAnalysisNote?: string | null;
  sections?: {
    formatting?: { score: number; grade: string; feedback: string; issues: string[]; fixes: string[] };
    experience?: { score: number; grade: string; feedback: string; weakBullets: WeakBullet[] };
    education?: { score: number; grade: string; feedback: string; issues: string[] };
    skills?: { score: number; grade: string; feedback: string; missing: string[]; suggestions: string[] };
    financeSpecific?: {
      score: number;
      grade: string;
      feedback: string;
      dealExperience: string;
      technicalSkills: string;
      quantification: string;
    };
    trackSpecific?: {
      score: number;
      grade: string;
      feedback: string;
      strengths?: string[];
      gaps?: string[];
    };
  };
  topFirmsMatch?: Array<{ firm: string; fitScore: number; reason: string }>;
  top5Improvements?: string[];
};

type ReviewRow = {
  id: string;
  fileName: string;
  score: number;
  feedback: unknown;
  createdAt: string;
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function asFeedback(f: unknown): FeedbackShape {
  if (!isRecord(f)) return { overallScore: 0 };
  return f as FeedbackShape;
}

function ScoreGauge({ score }: { score: number }) {
  const s = Math.min(100, Math.max(0, score));
  const color = s >= 80 ? "#22c55e" : s >= 60 ? "#eab308" : "#ef4444";
  return (
    <div className="flex items-center justify-center">
      <div
        className="relative flex h-32 w-32 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(${color} ${s * 3.6}deg, #27272a 0deg)`,
        }}
      >
        <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-[#0f0f10] ring-1 ring-white/10">
          <p className="text-3xl font-bold text-zinc-100">{s}</p>
          <p className="text-[10px] text-zinc-500">/100</p>
        </div>
      </div>
    </div>
  );
}

function BulletList({ title, items }: { title: string; items: string[] | undefined }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</p>
      <ul className="mt-1.5 list-inside list-disc space-y-1 text-sm text-zinc-300">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

const LOADING_MESSAGES = [
  "Reading your resume...",
  "Analyzing your experience...",
  "Checking formatting and structure...",
  "Generating improvement suggestions...",
  "Almost done...",
];

export function ResumeReviewView({ careerTracks }: { careerTracks: string[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reuploadRef = useRef<HTMLInputElement>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [active, setActive] = useState<ReviewRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetTrack, setTargetTrack] = useState<string>(() => getPrimaryTrack(careerTracks));
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    formatting: true,
    experience: true,
    education: false,
    skills: false,
    finance: false,
  });

  const load = useCallback(async () => {
    const res = await fetch("/api/resume/review", { credentials: "same-origin" });
    if (!res.ok) return;
    const d = (await res.json()) as { reviews: ReviewRow[] };
    setReviews(d.reviews ?? []);
    setActive((cur) => {
      if (cur && d.reviews?.some((r) => r.id === cur.id)) return cur;
      return d.reviews?.[0] ?? null;
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!careerTracks.length) return;
    setTargetTrack((t) => (careerTracks.includes(t) ? t : getPrimaryTrack(careerTracks)));
  }, [careerTracks]);

  useEffect(() => {
    if (!loading) {
      setLoadingMessageIndex(0);
      return;
    }
    const timer = window.setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [loading]);

  const upload = async (file: File) => {
    setError("");
    setLoading(true);
    setSelectedFile(file);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("targetTrack", targetTrack);
    try {
      const res = await fetch("/api/resume/review", { method: "POST", body: fd, credentials: "same-origin" });
      let data: { review?: ReviewRow; error?: string } = {};
      try {
        data = (await res.json()) as { review?: ReviewRow; error?: string };
      } catch {
        data = { error: "Server returned an unreadable response." };
      }
      if (!res.ok) {
        setError(`Review failed: ${data.error ?? "Upload failed"}`);
        return;
      }
      if (data.review) {
        setActive(data.review);
        await load();
      }
    } catch (e) {
      setError(`Review failed: ${e instanceof Error ? e.message : "Network error"}`);
    } finally {
      setLoading(false);
    }
  };

  const onFile = (files: FileList | null) => {
    const f = files?.[0];
    if (f) void upload(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onFile(e.dataTransfer.files);
  };

  const fb = asFeedback(active?.feedback);
  const currentScore = typeof fb.overallScore === "number" ? fb.overallScore : active?.score ?? 0;
  const reviewedTrack = (fb.targetTrack as string | undefined) ?? targetTrack;
  const trackMismatch = Boolean(active && reviewedTrack !== targetTrack);
  const previous = active ? reviews.find((r) => r.id !== active.id) : null;
  const scoreDelta = previous ? currentScore - previous.score : 0;
  const readiness = fb.recruitingReadiness ?? "Developing";
  const readinessClass =
    readiness === "Strong"
      ? "bg-emerald-900/40 text-emerald-300"
      : readiness === "Ready"
        ? "bg-lime-900/40 text-lime-300"
        : readiness === "Not Ready"
          ? "bg-red-900/40 text-red-300"
          : "bg-amber-900/40 text-amber-300";
  const visualIssues = [...(fb.visualAnalysis?.issues ?? [])].sort((a, b) => {
    const rank: Record<Severity, number> = { critical: 0, moderate: 1, minor: 2 };
    return rank[a.severity] - rank[b.severity];
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Resume review</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Upload a PDF for visual + content review. Reviews are stored (last three per account).
        </p>
        <div className="mt-4 rounded-xl border border-white/10 bg-zinc-950/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Reviewing for</p>
          {careerTracks.length > 1 ? (
            <div
              className="mt-3 flex flex-wrap gap-2"
              role="radiogroup"
              aria-label="Career track for resume grading"
            >
              {careerTracks.map((t) => {
                const primary = t === getPrimaryTrack(careerTracks);
                const active = t === targetTrack;
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTargetTrack(t)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-left text-xs font-medium transition-colors sm:text-sm",
                      active
                        ? "border-[#4a6fa5]/60 bg-[#4a6fa5]/20 text-[#e8eef8] ring-1 ring-[#4a6fa5]/25"
                        : "border-zinc-700 bg-zinc-900/80 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100",
                    )}
                  >
                    {t}
                    {primary ? <span className="ml-1 text-[10px] font-normal text-zinc-500">(primary)</span> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-sm font-medium text-zinc-100">
              {careerTracks.length === 1 ? careerTracks[0] : "General"}
              {careerTracks.length === 1 ? (
                <span className="ml-2 text-xs font-normal text-zinc-500">Primary track</span>
              ) : null}
            </p>
          )}
          {careerTracks.length > 1 ? (
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">
              Switch tracks to see how your resume scores for different recruiting paths. Each track is graded on its
              own criteria — scores are not blended or averaged across tracks.
            </p>
          ) : null}
          {careerTracks.length === 0 ? (
            <p className="mt-2 text-xs text-amber-300/90">
              Add career tracks in your profile to unlock track-specific grading. Until then, reviews use a general
              rubric.
            </p>
          ) : null}
        </div>
      </div>

      <Card
        className={cn(
          "border-dashed border-white/20 p-6 transition-colors",
          loading && "opacity-60",
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <div className="flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="text-sm font-medium text-zinc-200">Upload resume (PDF)</p>
            <p className="text-xs text-zinc-500">Drag and drop or choose a file.</p>
            {selectedFile ? <p className="mt-1 text-xs text-zinc-400">Selected: {selectedFile.name}</p> : null}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              disabled={loading}
              onChange={(e) => onFile(e.target.files)}
            />
            <Button
              type="button"
              disabled={loading}
              onClick={() => fileInputRef.current?.click()}
            >
              {loading ? "Analyzing…" : "Upload resume"}
            </Button>
            {selectedFile ? (
              <Button type="button" variant="outline" disabled={loading} onClick={() => void upload(selectedFile)}>
                Re-run with selected file
              </Button>
            ) : null}
            {active ? (
              <Button type="button" variant="outline" disabled={loading} onClick={() => setActive(null)}>
                Clear view
              </Button>
            ) : null}
          </div>
        </div>
        {error ? (
          <div className="mt-3 rounded border border-red-700/60 bg-red-950/30 p-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}
        {loading ? (
          <p className="mt-4 text-center text-sm text-zinc-400">{LOADING_MESSAGES[loadingMessageIndex]}</p>
        ) : null}
      </Card>

      {!loading && trackMismatch ? (
        <Card className="border-amber-500/35 bg-amber-950/15 p-4">
          <p className="text-sm text-amber-100/95">
            These results were graded for <span className="font-semibold text-amber-50">{reviewedTrack}</span>, but
            your selector is set to <span className="font-semibold text-amber-50">{targetTrack}</span>. Each track uses
            different criteria (for example, IB vs PE).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedFile ? (
              <Button type="button" disabled={loading} onClick={() => void upload(selectedFile)}>
                Re-analyze for {targetTrack}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload resume to grade for {targetTrack}
              </Button>
            )}
          </div>
        </Card>
      ) : null}

      {loading ? (
        <Card className="space-y-3 p-4">
          <div className="h-4 w-40 animate-pulse rounded bg-zinc-800" />
          <div className="h-24 animate-pulse rounded bg-zinc-900" />
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="h-16 animate-pulse rounded bg-zinc-900" />
            <div className="h-16 animate-pulse rounded bg-zinc-900" />
            <div className="h-16 animate-pulse rounded bg-zinc-900" />
          </div>
        </Card>
      ) : null}

      {reviews.length > 0 ? (
        <Card className="p-4">
          <p className="section-label mb-2">History (last 3)</p>
          <div className="flex flex-wrap gap-2">
            {reviews.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setActive(r)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-left text-xs transition-colors",
                  active?.id === r.id
                    ? "border-[#4a6fa5]/50 bg-[#4a6fa5]/10 text-[#f0f0f0]"
                    : "border-white/10 bg-black/20 text-zinc-400 hover:border-white/20 hover:text-zinc-200",
                )}
              >
                <span className="block font-medium text-zinc-200">{r.fileName}</span>
                <span className="text-[10px] text-zinc-500">
                  {new Date(r.createdAt).toLocaleString()} · Score {r.score}
                  {(() => {
                    const t = asFeedback(r.feedback).targetTrack;
                    return t ? ` · ${t}` : "";
                  })()}
                </span>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {active ? (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="grid gap-4 md:grid-cols-[160px_1fr]">
              <ScoreGauge score={currentScore} />
              <div>
                <p className="text-sm font-semibold text-zinc-100">{active.fileName}</p>
                <p className="text-xs text-zinc-500">{new Date(active.createdAt).toLocaleString()}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-full px-2 py-1 text-xs font-medium", readinessClass)}>{readiness}</span>
                  <span className="text-xs text-zinc-500">
                    {scoreDelta === 0 ? "No change" : scoreDelta > 0 ? `+${scoreDelta} vs prior` : `${scoreDelta} vs prior`}
                  </span>
                </div>
                {fb.oneLiner ? <p className="mt-2 text-sm text-zinc-300">{fb.oneLiner}</p> : null}
                <p className="mt-2 text-xs text-zinc-500">
                  Graded for: <span className="font-medium text-zinc-300">{reviewedTrack}</span> (single-track rubric)
                </p>
                {fb.visualAnalysisUnavailable ? (
                  <p className="mt-2 text-xs text-amber-300">
                    {fb.visualAnalysisNote ?? "Visual analysis unavailable — content only"}
                  </p>
                ) : null}
              </div>
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {[
              ["Visual Layout", fb.visualAnalysis?.score ?? 0, fb.visualAnalysis?.grade ?? "-"],
              ["Formatting", fb.sections?.formatting?.score ?? 0, fb.sections?.formatting?.grade ?? "-"],
              ["Experience", fb.sections?.experience?.score ?? 0, fb.sections?.experience?.grade ?? "-"],
              ["Education", fb.sections?.education?.score ?? 0, fb.sections?.education?.grade ?? "-"],
              ["Skills", fb.sections?.skills?.score ?? 0, fb.sections?.skills?.grade ?? "-"],
              [
                getResumeTrackSectionLabel(reviewedTrack),
                fb.sections?.trackSpecific?.score ?? fb.sections?.financeSpecific?.score ?? 0,
                fb.sections?.trackSpecific?.grade ?? fb.sections?.financeSpecific?.grade ?? "-",
              ],
            ].map(([label, score, grade]) => (
              <Card key={label as string} className="p-3">
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label as string}</p>
                <p className="mt-1 text-lg font-semibold text-zinc-100">{String(grade)}</p>
                <p className="text-xs text-zinc-400">{score as number}/100</p>
              </Card>
            ))}
          </div>

          <Card className="p-4">
            <p className="section-label mb-2">Visual issues</p>
            <div className="space-y-2">
              {visualIssues.map((v, i) => (
                <div key={i} className="rounded border border-zinc-800 bg-zinc-950/50 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-[10px] uppercase",
                        v.severity === "critical"
                          ? "bg-red-900/50 text-red-300"
                          : v.severity === "moderate"
                            ? "bg-amber-900/50 text-amber-300"
                            : "bg-zinc-800 text-zinc-300",
                      )}
                    >
                      {v.severity}
                    </span>
                    <p className="text-sm text-zinc-100">{v.issue}</p>
                  </div>
                  <p className="text-xs text-zinc-400">Fix: {v.fix}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <p className="section-label mb-3">Detailed sections</p>
            {[
              ["formatting", "Formatting", fb.sections?.formatting?.feedback, fb.sections?.formatting?.issues, fb.sections?.formatting?.fixes],
              ["experience", "Experience", fb.sections?.experience?.feedback, [], []],
              ["education", "Education", fb.sections?.education?.feedback, fb.sections?.education?.issues, []],
              ["skills", "Skills", fb.sections?.skills?.feedback, fb.sections?.skills?.missing, fb.sections?.skills?.suggestions],
              [
                "finance",
                getResumeTrackSectionLabel(reviewedTrack),
                fb.sections?.trackSpecific?.feedback ?? fb.sections?.financeSpecific?.feedback,
                (
                  fb.sections?.trackSpecific
                    ? [...(fb.sections.trackSpecific.strengths ?? []), ...(fb.sections.trackSpecific.gaps ?? [])]
                    : [fb.sections?.financeSpecific?.dealExperience, fb.sections?.financeSpecific?.technicalSkills, fb.sections?.financeSpecific?.quantification]
                ).filter(Boolean) as string[],
                [],
              ],
            ].map(([key, label, feedback, issues, fixes]) => (
              <div key={key as string} className="mb-3 rounded border border-zinc-800 bg-zinc-950/50">
                <button
                  type="button"
                  className="flex w-full items-center justify-between p-3 text-left"
                  onClick={() => setOpenSections((prev) => ({ ...prev, [key as string]: !prev[key as string] }))}
                >
                  <span className="text-sm text-zinc-200">{label as string}</span>
                  <span className="text-zinc-500">{openSections[key as string] ? "▾" : "▸"}</span>
                </button>
                {openSections[key as string] ? (
                  <div className="border-t border-zinc-800 p-3">
                    {feedback ? <p className="text-sm text-zinc-300">{feedback as string}</p> : null}
                    <BulletList title="Issues" items={issues as string[]} />
                    <BulletList title="Fixes" items={fixes as string[]} />
                  </div>
                ) : null}
              </div>
            ))}
          </Card>

          <Card className="p-4">
            <p className="section-label mb-3">Bullet point rewrites</p>
            <div className="space-y-3">
              {(fb.sections?.experience?.weakBullets ?? []).map((b, i) => (
                <div key={i} className="rounded border border-zinc-800 p-3">
                  <p className="rounded bg-red-950/20 p-2 text-sm text-red-200/90">{b.original}</p>
                  <p className="my-1 text-center text-zinc-500">↓</p>
                  <p className="rounded bg-emerald-950/20 p-2 text-sm text-emerald-200">{b.rewritten}</p>
                  <p className="mt-2 text-xs text-zinc-500">{b.problem}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <p className="section-label mb-2">Top firm matches</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {(fb.topFirmsMatch ?? []).slice(0, 3).map((m) => (
                <div key={m.firm} className="rounded border border-zinc-800 bg-zinc-950/50 p-3">
                  <p className="text-sm font-medium text-zinc-100">{m.firm}</p>
                  <p className="text-xs text-zinc-400">Fit {m.fitScore}/100</p>
                  <p className="mt-1 text-xs text-zinc-500">{m.reason}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <p className="section-label mb-2">Top 5 improvements</p>
            <ol className="list-inside list-decimal space-y-1 text-sm text-zinc-300">
              {(fb.top5Improvements ?? []).slice(0, 5).map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ol>
          </Card>

          <div className="flex justify-center gap-2">
            <input
              ref={reuploadRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              disabled={loading}
              onChange={(e) => onFile(e.target.files)}
            />
            <Button type="button" variant="outline" disabled={loading} onClick={() => reuploadRef.current?.click()}>
              {selectedFile ? `Re-analyze for ${targetTrack}` : "Re-analyze (choose PDF)"}
            </Button>
          </div>
        </div>
      ) : (
        !loading && (
          <p className="text-center text-sm text-zinc-500">Upload a PDF to see your first review.</p>
        )
      )}
    </div>
  );
}
