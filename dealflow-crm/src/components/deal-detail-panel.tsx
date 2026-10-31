"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStreamedText } from "@/lib/use-streamed-text";

export type DealDetail = {
  id: string;
  title: string;
  acquirer: string | null;
  target: string | null;
  dealValue: string | null;
  dealType: string;
  vertical: string | null;
  sector: string | null;
  summary: string;
  keyThesis: string | null;
  risks: string | null;
  sourceUrl: string | null;
  announcedAt: string;
};

type Tab = "overview" | "pitch" | "practice" | "stock";

/** Instant, no-AI "tell me about a deal" outline built from the deal card. */
function templatePitch(d: DealDetail): string {
  const date = new Date(d.announcedAt).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const buyer = d.acquirer ?? "[buyer]";
  const target = d.target ?? "[target]";
  return [
    `1. The deal (1 sentence)\n"In ${date}, ${buyer} agreed to ${d.dealType === "Take-Private" ? "take" : "acquire"} ${target}${
      d.dealType === "Take-Private" ? " private" : ""
    }${d.dealValue ? ` for ${d.dealValue}` : ""}."`,
    `2. The companies\nWho is ${buyer}? Who is ${target}? (1 line each — what they sell, how big they are.)`,
    `3. Terms & valuation\n${d.dealValue ?? "[value]"} · ${d.dealType}. Know: price per share and premium, EV vs. equity value, the implied multiple (EV/EBITDA or EV/Revenue), and how it's financed (cash, stock, debt).`,
    `4. Why do it (rationale)\n${d.keyThesis ?? "[2–3 strategic reasons: scale, new products/markets, synergies, financial returns]"}`,
    `5. Risks\n${d.risks ?? "[regulatory, overpaying, integration, leverage]"}`,
    `6. My view\n"If I were on ${buyer}'s board, I would / wouldn't do this deal because…" — take a side and defend it with one number.`,
  ].join("\n\n");
}

export function DealDetailPanel({ deal, onClose }: { deal: DealDetail; onClose: () => void }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const pitch = useStreamedText();
  const practice = useStreamedText();
  const [stockCompany, setStockCompany] = useState(deal.acquirer ?? deal.target ?? "");
  const [stockBusy, setStockBusy] = useState(false);
  const template = useMemo(() => templatePitch(deal), [deal]);
  const companies = [deal.acquirer, deal.target].filter((c): c is string => Boolean(c));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const draftStockPitch = async () => {
    if (!stockCompany.trim()) return;
    setStockBusy(true);
    try {
      const res = await fetch(`/api/deals/${deal.id}/stock-pitch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ company: stockCompany.trim() }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error ?? "Could not draft pitch");
      toast.success("Draft saved to Pitch Builder");
      router.push(`/pitch-builder?view=${data.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not draft pitch");
    } finally {
      setStockBusy(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={deal.title}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-zinc-700 bg-zinc-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 p-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-zinc-100 sm:text-lg">{deal.title}</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              {deal.dealType}
              {deal.sector ? ` · ${deal.sector}` : ""} · {new Date(deal.announcedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {deal.dealValue ? (
              <span className="rounded border border-amber-700/50 bg-amber-950/40 px-2 py-0.5 text-xs text-amber-200">
                {deal.dealValue}
              </span>
            ) : null}
            <button onClick={onClose} className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800">
              Close
            </button>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-zinc-800 px-3 py-2">
          {(
            [
              ["overview", "Overview"],
              ["pitch", "Tell me about this deal"],
              ["practice", "Practice questions"],
              ["stock", "Stock pitch"],
            ] as [Tab, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium",
                tab === k ? "bg-[#4a6fa5]/25 text-[#dbe6f7]" : "text-zinc-400 hover:bg-zinc-800",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
          {tab === "overview" ? (
            <>
              <p className="text-zinc-300">
                <span className="text-zinc-500">Buyer:</span> {deal.acquirer ?? "—"} ·{" "}
                <span className="text-zinc-500">Target:</span> {deal.target ?? "—"}
              </p>
              <p className="leading-relaxed text-zinc-200">{deal.summary}</p>
              {deal.keyThesis ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Why this deal</p>
                  <p className="leading-relaxed text-zinc-300">{deal.keyThesis}</p>
                </div>
              ) : null}
              {deal.risks ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Risks</p>
                  <p className="leading-relaxed text-red-200/90">{deal.risks}</p>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" onClick={() => setTab("pitch")}>
                  Prep this for an interview →
                </Button>
                {deal.sourceUrl ? (
                  <Button asChild size="sm" variant="outline">
                    <a href={deal.sourceUrl} target="_blank" rel="noopener noreferrer">
                      Read source
                    </a>
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}

          {tab === "pitch" ? (
            <>
              <p className="text-xs text-zinc-400">
                Interviewers ask &ldquo;Tell me about a deal you&apos;ve followed&rdquo; in almost every first round. Use the
                outline below, or generate a full 2-minute script with follow-up questions.
              </p>
              {!pitch.text && !pitch.loading ? (
                <pre className="whitespace-pre-wrap rounded-lg border border-white/10 bg-zinc-950 p-3 font-sans text-zinc-200">
                  {template}
                </pre>
              ) : (
                <pre className="whitespace-pre-wrap rounded-lg border border-white/10 bg-zinc-950 p-3 font-sans leading-relaxed text-zinc-200">
                  {pitch.text}
                  {pitch.loading ? <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-zinc-400 align-middle" /> : null}
                </pre>
              )}
              {pitch.error ? <p className="text-xs text-red-300">{pitch.error}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={pitch.loading} onClick={() => void pitch.run(`/api/deals/${deal.id}/pitch`)}>
                  {pitch.loading ? "Writing…" : pitch.text ? "Regenerate" : "Generate 2-minute script (AI)"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => void copy(pitch.text || template)}>
                  Copy
                </Button>
              </div>
            </>
          ) : null}

          {tab === "practice" ? (
            <>
              <p className="text-xs text-zinc-400">5 technical questions an interviewer could ask about this deal, with model answers.</p>
              {practice.text || practice.loading ? (
                <pre className="whitespace-pre-wrap rounded-lg border border-white/10 bg-zinc-950 p-3 font-sans leading-relaxed text-zinc-200">
                  {practice.text}
                  {practice.loading ? <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-zinc-400 align-middle" /> : null}
                </pre>
              ) : null}
              {practice.error ? <p className="text-xs text-red-300">{practice.error}</p> : null}
              <Button
                size="sm"
                disabled={practice.loading}
                onClick={() => void practice.run(`/api/deals/${deal.id}/practice`)}
              >
                {practice.loading ? "Writing…" : practice.text ? "New set" : "Generate practice questions"}
              </Button>
            </>
          ) : null}

          {tab === "stock" ? (
            <>
              <p className="text-xs text-zinc-400">
                Turn this deal into a stock pitch: is the company a buy, hold or sell because of it? A draft (overview,
                thesis, catalysts, risks) is saved to your Pitch Builder for you to edit — add the current price and your
                target there.
              </p>
              <label className="block text-xs text-zinc-500">
                Company to pitch
                {companies.length ? (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {companies.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setStockCompany(c)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs",
                          stockCompany === c
                            ? "border-[#4a6fa5]/60 bg-[#4a6fa5]/20 text-[#e8eef8]"
                            : "border-zinc-700 text-zinc-300 hover:border-zinc-500",
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                ) : null}
                <input
                  className="mt-2 h-9 w-full rounded border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100"
                  value={stockCompany}
                  onChange={(e) => setStockCompany(e.target.value)}
                  placeholder="Public company name"
                />
              </label>
              <Button size="sm" disabled={stockBusy || !stockCompany.trim()} onClick={() => void draftStockPitch()}>
                {stockBusy ? "Drafting… (~10s)" : "Draft stock pitch in Pitch Builder"}
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
