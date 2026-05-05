"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TopImprovement = {
  section?: string;
  original?: string;
  rewritten?: string;
  reason?: string;
};

type FeedbackShape = {
  overallScore?: number;
  formatting?: { summary?: string; onePage?: boolean; issues?: string[] };
  experienceBullets?: { summary?: string; strengths?: string[]; weaknesses?: string[] };
  skillsEducation?: { summary?: string; suggestions?: string[] };
  financeSpecific?: { summary?: string; suggestions?: string[] };
  targetFirmFit?: {
    summary?: string;
    suggestedFirms?: string[];
    suggestedVerticals?: string[];
  };
  topImprovements?: TopImprovement[];
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
  if (!isRecord(f)) return {};
  return f as FeedbackShape;
}

function ScoreGauge({ score }: { score: number }) {
  const s = Math.min(100, Math.max(0, score));
  const hue = s >= 70 ? 160 : s >= 45 ? 45 : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-2">
        <p className="text-4xl font-bold tabular-nums text-zinc-100">{s}</p>
        <p className="text-xs text-zinc-500">/ 100</p>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${s}%`,
            background: `linear-gradient(90deg, hsl(${hue} 70% 35%), hsl(${hue} 80% 50%))`,
          }}
        />
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

export function ResumeReviewView() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reuploadRef = useRef<HTMLInputElement>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [active, setActive] = useState<ReviewRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const upload = async (file: File) => {
    setError("");
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/resume/review", { method: "POST", body: fd, credentials: "same-origin" });
      const data = (await res.json()) as { review?: ReviewRow; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      if (data.review) {
        setActive(data.review);
        await load();
      }
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Resume review</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Upload a PDF for structured IB/PE feedback. Reviews are stored (last five per account).
        </p>
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
            {active ? (
              <Button type="button" variant="outline" disabled={loading} onClick={() => setActive(null)}>
                Clear view
              </Button>
            ) : null}
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        {loading ? (
          <p className="mt-4 text-center text-sm text-zinc-400">Claude is reviewing your resume…</p>
        ) : null}
      </Card>

      {reviews.length > 0 ? (
        <Card className="p-4">
          <p className="section-label mb-2">Recent reviews</p>
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
                </span>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {active ? (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-100">{active.fileName}</p>
                <p className="text-xs text-zinc-500">{new Date(active.createdAt).toLocaleString()}</p>
              </div>
              <div className="w-full max-w-[220px]">
                <p className="section-label mb-2">Overall score</p>
                <ScoreGauge score={typeof fb.overallScore === "number" ? fb.overallScore : active.score} />
              </div>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <p className="section-label mb-2">Formatting & structure</p>
              {fb.formatting?.summary ? <p className="text-sm text-zinc-300">{fb.formatting.summary}</p> : null}
              <p className="mt-2 text-xs text-zinc-500">
                One page (finance convention):{" "}
                <span className="text-zinc-300">{fb.formatting?.onePage === true ? "Yes" : "No / unclear"}</span>
              </p>
              <BulletList title="Issues" items={fb.formatting?.issues} />
            </Card>

            <Card className="p-4">
              <p className="section-label mb-2">Experience bullets</p>
              {fb.experienceBullets?.summary ? (
                <p className="text-sm text-zinc-300">{fb.experienceBullets.summary}</p>
              ) : null}
              <BulletList title="Strengths" items={fb.experienceBullets?.strengths} />
              <BulletList title="Weaknesses" items={fb.experienceBullets?.weaknesses} />
            </Card>

            <Card className="p-4">
              <p className="section-label mb-2">Skills & education</p>
              {fb.skillsEducation?.summary ? (
                <p className="text-sm text-zinc-300">{fb.skillsEducation.summary}</p>
              ) : null}
              <BulletList title="Suggestions" items={fb.skillsEducation?.suggestions} />
            </Card>

            <Card className="p-4">
              <p className="section-label mb-2">Finance-specific</p>
              {fb.financeSpecific?.summary ? (
                <p className="text-sm text-zinc-300">{fb.financeSpecific.summary}</p>
              ) : null}
              <BulletList title="Suggestions" items={fb.financeSpecific?.suggestions} />
            </Card>
          </div>

          <Card className="p-4">
            <p className="section-label mb-2">Target firm fit</p>
            {fb.targetFirmFit?.summary ? <p className="text-sm text-zinc-300">{fb.targetFirmFit.summary}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {(fb.targetFirmFit?.suggestedFirms ?? []).map((x) => (
                <span key={x} className="rounded-full border border-[#2a2a2a] bg-[#161616] px-2 py-0.5 text-xs text-[#e8e8e8]">
                  {x}
                </span>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(fb.targetFirmFit?.suggestedVerticals ?? []).map((x) => (
                <span key={x} className="rounded-full border border-zinc-600 bg-zinc-800/80 px-2 py-0.5 text-xs text-zinc-300">
                  {x}
                </span>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <p className="section-label mb-3">Top improvements</p>
            <ul className="space-y-4">
              {(fb.topImprovements ?? []).slice(0, 5).map((t, i) => (
                <li key={i} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
                  {t.section ? (
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{t.section}</p>
                  ) : null}
                  {t.original ? (
                    <p className="mt-1 text-zinc-400">
                      <span className="text-zinc-600">Was:</span> {t.original}
                    </p>
                  ) : null}
                  {t.rewritten ? (
                    <p className="mt-2 font-medium text-emerald-200">
                      <span className="text-zinc-600">Rewrite:</span> {t.rewritten}
                    </p>
                  ) : null}
                  {t.reason ? <p className="mt-2 text-xs text-zinc-500">{t.reason}</p> : null}
                </li>
              ))}
            </ul>
          </Card>

          <div className="flex justify-center">
            <input
              ref={reuploadRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              disabled={loading}
              onChange={(e) => onFile(e.target.files)}
            />
            <Button type="button" variant="outline" disabled={loading} onClick={() => reuploadRef.current?.click()}>
              Re-upload
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
