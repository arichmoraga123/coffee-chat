/** Static HTML/CSS mockups for the marketing landing — matches in-app dark theme */

const RESUME_SCORE_RING_R = 15.5;
const RESUME_SCORE_RING_C = 2 * Math.PI * RESUME_SCORE_RING_R;

export function McqFeaturePreview() {
  return (
    <div className="rounded-xl border border-border p-3 ring-1 ring-border">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-md border border-border bg-surface px-2 py-0.5 text-[10px] font-medium text-ink-2">
            LBO Models
          </span>
          <span className="rounded-md border border-warn/40 bg-warn-bg px-2 py-0.5 text-[10px] font-medium text-warn">
            Hard
          </span>
        </div>
        <span className="rounded-md border border-success/40 bg-success-bg px-2 py-0.5 text-[10px] font-semibold text-success">
          +10 XP
        </span>
      </div>
      <p className="mb-2 text-[11px] font-medium leading-snug text-ink sm:text-xs">
        In an LBO, why does the PE sponsor care more about equity value than enterprise value at exit?
      </p>
      <div className="grid auto-rows-auto grid-cols-1 gap-1.5 sm:grid-cols-2">
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
                ? "h-auto min-h-[60px] overflow-visible whitespace-normal break-words rounded-lg border border-success/40 bg-success-bg px-4 py-3 text-left text-[9px] leading-relaxed text-success ring-1 ring-success/40 sm:text-[10px]"
                : "h-auto min-h-[60px] overflow-visible whitespace-normal break-words rounded-lg border border-border bg-surface px-4 py-3 text-left text-[9px] leading-relaxed text-ink-2 sm:text-[10px]"
            }
          >
            {c.t}
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[9px] text-ink-3">Question 3 of 10</p>
    </div>
  );
}

export function RolodexFeaturePreview() {
  return (
    <div className="rounded-xl border border-border p-3 ring-1 ring-border">
      <div className="rounded-lg border border-border bg-surface p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-ink">Sarah Chen</p>
            <p className="text-[10px] text-ink-2">Goldman Sachs · IB</p>
            <p className="mt-1 text-[9px] text-ink-3">Last chat · Mar 4, 2026</p>
          </div>
          <span className="shrink-0 rounded-full border border-success/40 bg-success-bg px-2 py-0.5 text-[9px] font-medium text-success">
            Follow up sent
          </span>
        </div>
      </div>
      <div className="mt-2 rounded-lg border border-border bg-surface p-2">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-ink-3">AI draft</p>
        <p className="mt-1 text-[10px] leading-relaxed text-ink-2">
          Hi Sarah — thanks again for walking through the TMT group&apos;s staffing model. I loved your point on
          velocity vs. depth in live deals. Would you have 15 minutes next week to continue the conversation?
        </p>
      </div>
    </div>
  );
}

export function ResumeFeaturePreview() {
  return (
    <div className="rounded-xl border border-border p-3 ring-1 ring-border">
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="18" cy="18" r={RESUME_SCORE_RING_R} fill="none" className="stroke-on-accent" strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r={RESUME_SCORE_RING_R}
              fill="none"
              className="stroke-accent"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${0.82 * RESUME_SCORE_RING_C} ${RESUME_SCORE_RING_C}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold text-ink">82</span>
            <span className="text-[8px] text-ink-3">/100</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <span className="inline-block rounded-md border border-info/40 bg-info-bg px-2 py-0.5 text-[10px] font-medium text-info">
            B+ Formatting
          </span>
          <span className="ml-1 inline-block rounded-md border border-success/40 bg-success-bg px-2 py-0.5 text-[10px] font-medium text-success">
            A- Experience
          </span>
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-border bg-surface p-2">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-ink-3">Rewrite</p>
        <p className="mt-1 text-[10px] leading-relaxed text-ink-2">
          <span className="text-danger line-through">Helped club raise money.</span>
        </p>
        <p className="text-[10px] leading-relaxed text-success">
          Led fundraising for 120-member finance org; closed $18K in sponsor commitments in one semester.
        </p>
      </div>
    </div>
  );
}

export function SchoolNetworkFeaturePreview() {
  return (
    <div className="rounded-xl border border-border p-3 ring-1 ring-border">
      <div className="flex flex-wrap gap-1.5">
        {["MSU", "UMich", "BU", "Cornell"].map((s) => (
          <span
            key={s}
            className="rounded-full border border-border-strong bg-surface px-2.5 py-0.5 text-[10px] font-medium text-ink"
          >
            {s}
          </span>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-border bg-surface px-2.5 py-2">
        <p className="text-[10px] leading-snug text-ink">
          Goldman Sachs <span className="text-ink-3">—</span> Apps open: August 2026
        </p>
      </div>
      <div className="mt-2 rounded-lg border border-accent-hover bg-accent-hover px-2.5 py-2">
        <p className="text-[10px] font-medium text-ink">IB Summer Analyst</p>
        <p className="mt-0.5 text-[9px] text-accent">$85K base · NYC</p>
      </div>
    </div>
  );
}

const previews = [McqFeaturePreview, RolodexFeaturePreview, ResumeFeaturePreview, SchoolNetworkFeaturePreview] as const;

export function LandingFeaturePreview({ index }: { index: number }) {
  const Cmp = previews[index % previews.length];
  return (
    <div className="min-h-[200px] w-full overflow-hidden rounded-xl border border-border bg-surface p-2 sm:min-h-[220px] sm:p-3">
      <Cmp />
    </div>
  );
}
