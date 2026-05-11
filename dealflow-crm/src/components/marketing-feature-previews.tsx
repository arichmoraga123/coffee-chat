/** Static HTML/CSS mockups for the marketing landing — matches in-app dark theme */

const RESUME_SCORE_RING_R = 15.5;
const RESUME_SCORE_RING_C = 2 * Math.PI * RESUME_SCORE_RING_R;

export function McqFeaturePreview() {
  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-zinc-900/95 to-zinc-950 p-3 shadow-inner ring-1 ring-white/5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-md border border-white/10 bg-zinc-950/80 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
            LBO Models
          </span>
          <span className="rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-200/90">
            Hard
          </span>
        </div>
        <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
          +10 XP
        </span>
      </div>
      <p className="mb-2 text-[11px] font-medium leading-snug text-zinc-100 sm:text-xs">
        In an LBO, why does the PE sponsor care more about equity value than enterprise value at exit?
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { t: "Because lenders own the equity at exit", ok: false },
          { t: "Returns are on equity invested; debt is repaid to lenders", ok: true },
          { t: "EV is not used in LBO models", ok: false },
          { t: "Only EBITDA multiples matter for exit", ok: false },
        ].map((c) => (
          <div
            key={c.t}
            className={
              c.ok
                ? "rounded-lg border border-emerald-500/60 bg-emerald-950/45 px-2 py-1.5 text-[9px] leading-tight text-emerald-50 ring-1 ring-emerald-500/20 sm:text-[10px]"
                : "rounded-lg border border-white/[0.08] bg-zinc-950/80 px-2 py-1.5 text-[9px] leading-tight text-zinc-400 sm:text-[10px]"
            }
          >
            {c.t}
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[9px] text-zinc-500">Question 3 of 10</p>
    </div>
  );
}

export function RolodexFeaturePreview() {
  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-zinc-900/95 to-zinc-950 p-3 shadow-inner ring-1 ring-white/5">
      <div className="rounded-lg border border-white/[0.06] bg-zinc-950/70 p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-zinc-100">Sarah Chen</p>
            <p className="text-[10px] text-zinc-400">Goldman Sachs · IB</p>
            <p className="mt-1 text-[9px] text-zinc-500">Last chat · Mar 4, 2026</p>
          </div>
          <span className="shrink-0 rounded-full border border-emerald-500/35 bg-emerald-500/12 px-2 py-0.5 text-[9px] font-medium text-emerald-300">
            Follow up sent
          </span>
        </div>
      </div>
      <div className="mt-2 rounded-lg border border-white/[0.06] bg-zinc-950/50 p-2">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-zinc-500">AI draft</p>
        <p className="mt-1 text-[10px] leading-relaxed text-zinc-300">
          Hi Sarah — thanks again for walking through the TMT group&apos;s staffing model. I loved your point on
          velocity vs. depth in live deals. Would you have 15 minutes next week to continue the conversation?
        </p>
      </div>
    </div>
  );
}

export function ResumeFeaturePreview() {
  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-zinc-900/95 to-zinc-950 p-3 shadow-inner ring-1 ring-white/5">
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="18" cy="18" r={RESUME_SCORE_RING_R} fill="none" className="stroke-zinc-800" strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r={RESUME_SCORE_RING_R}
              fill="none"
              className="stroke-[#4a6fa5]"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${0.82 * RESUME_SCORE_RING_C} ${RESUME_SCORE_RING_C}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold text-zinc-100">82</span>
            <span className="text-[8px] text-zinc-500">/100</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <span className="inline-block rounded-md border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-200">
            B+ Formatting
          </span>
          <span className="ml-1 inline-block rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
            A- Experience
          </span>
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-white/[0.06] bg-zinc-950/60 p-2">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-zinc-500">Rewrite</p>
        <p className="mt-1 text-[10px] leading-relaxed text-zinc-400">
          <span className="text-red-400/80 line-through">Helped club raise money.</span>
        </p>
        <p className="text-[10px] leading-relaxed text-emerald-200/90">
          Led fundraising for 120-member finance org; closed $18K in sponsor commitments in one semester.
        </p>
      </div>
    </div>
  );
}

export function SchoolNetworkFeaturePreview() {
  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-zinc-900/95 to-zinc-950 p-3 shadow-inner ring-1 ring-white/5">
      <div className="flex flex-wrap gap-1.5">
        {["MSU", "UMich", "BU", "Cornell"].map((s) => (
          <span
            key={s}
            className="rounded-full border border-zinc-600/50 bg-zinc-950/80 px-2.5 py-0.5 text-[10px] font-medium text-zinc-200"
          >
            {s}
          </span>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-white/[0.06] bg-zinc-950/60 px-2.5 py-2">
        <p className="text-[10px] leading-snug text-zinc-200">
          Goldman Sachs <span className="text-zinc-500">—</span> Apps open: August 2026
        </p>
      </div>
      <div className="mt-2 rounded-lg border border-[#3d5d8c]/30 bg-[#3d5d8c]/10 px-2.5 py-2">
        <p className="text-[10px] font-medium text-zinc-100">IB Summer Analyst</p>
        <p className="mt-0.5 text-[9px] text-[#8fb0d8]">$85K base · NYC</p>
      </div>
    </div>
  );
}

const previews = [McqFeaturePreview, RolodexFeaturePreview, ResumeFeaturePreview, SchoolNetworkFeaturePreview] as const;

export function LandingFeaturePreview({ index }: { index: number }) {
  const Cmp = previews[index % previews.length];
  return (
    <div className="min-h-[200px] w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 p-2 sm:min-h-[220px] sm:p-3">
      <Cmp />
    </div>
  );
}
