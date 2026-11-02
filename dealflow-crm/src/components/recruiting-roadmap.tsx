"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SectionTabs } from "@/components/ui/section-tabs";

type ClassYear = "freshman" | "sophomore" | "junior";

type Step = { id: string; text: string; href?: string; cta?: string };
type Phase = { id: string; when: string; title: string; why: string; steps: Step[] };

/**
 * Banks hire junior-summer interns ~18–20 months ahead. In the fall 2026 cycle, current
 * SOPHOMORES are recruiting for Summer 2028, so today's freshmen recruit starting fall 2027.
 */
const PLANS: Record<ClassYear, { headline: string; summary: string; phases: Phase[] }> = {
  freshman: {
    headline: "You recruit for your junior-summer internship starting next fall (Summer 2029 roles).",
    summary:
      "Investment banking hires ~20 months ahead: the Summer 2028 programs opening right now are for today's sophomores. That means your real recruiting window opens around August–September 2027. Use this year to build the GPA, resume, network and technicals that get you through those first rounds.",
    phases: [
      {
        id: "f1",
        when: "Now → December",
        title: "Foundations",
        why: "GPA and clubs are the two things you can't fix later. Recruiters screen on GPA first.",
        steps: [
          { id: "f1-gpa", text: "Protect your GPA — aim for 3.7+ (many banks screen around 3.5)." },
          { id: "f1-club", text: "Join your school's finance / investment club and show up consistently." },
          { id: "f1-resume", text: "Build a one-page, banking-format resume (education on top, quantified bullets).", href: "/resume", cta: "Get AI resume review" },
          { id: "f1-tracks", text: "Learn the paths: IB vs. PE vs. S&T vs. consulting. Pick 1–2 to focus on.", href: "/resources", cta: "Open resources" },
          { id: "f1-acct", text: "Learn accounting fundamentals: the 3 statements and how they link.", href: "/questions", cta: "Drill Accounting" },
        ],
      },
      {
        id: "f2",
        when: "January → March",
        title: "Early programs + start networking",
        why: "Early-insight and diversity programs for first- and second-years are the main way freshmen get a foot in the door — many have winter deadlines.",
        steps: [
          { id: "f2-early", text: "Apply to freshman/sophomore early-insight and diversity programs at banks you like (check each firm's careers page)." },
          { id: "f2-contacts", text: "Build a list of 50+ alumni at target firms (school alumni + LinkedIn).", href: "/contacts", cta: "Import contacts" },
          { id: "f2-chats", text: "Do 2–3 coffee chats a week. Log every one — follow up within 24 hours.", href: "/contacts?tab=queue", cta: "Outreach queue" },
          { id: "f2-ev", text: "Technicals: Equity Value vs. Enterprise Value, then valuation (comps, precedents).", href: "/questions", cta: "Drill EV & Valuation" },
          { id: "f2-deals", text: "Start following deals — pick 2 you can explain end-to-end.", href: "/deals", cta: "Open Deal Tracker" },
        ],
      },
      {
        id: "f3",
        when: "March → May",
        title: "Land a summer experience",
        why: "Any finance-relevant summer role (boutique bank, wealth management, small PE/VC fund, corporate finance, search fund) makes your sophomore-fall resume competitive.",
        steps: [
          { id: "f3-summer", text: "Secure a finance-relevant summer role — boutiques and smaller funds hire later in the spring." },
          { id: "f3-dcf", text: "Technicals: DCF and WACC.", href: "/questions", cta: "Drill DCF" },
          { id: "f3-mock", text: "Do your first mock interview — behavioral + 'walk me through your resume'.", href: "/mock-interview", cta: "Start mock interview" },
          { id: "f3-why", text: "Write your 'Why banking?' and 'Walk me through your resume' answers (~2 min each)." },
        ],
      },
      {
        id: "f4",
        when: "June → August",
        title: "Get interview-ready",
        why: "Elite boutiques open applications as early as September. You want to be fully prepared before school starts.",
        steps: [
          { id: "f4-lbo", text: "Technicals: LBOs and merger models (accretion/dilution).", href: "/questions", cta: "Drill LBO & M&A" },
          { id: "f4-hard", text: "Get through every Hard question in the bank, including firm-specific sets.", href: "/questions", cta: "Question bank" },
          { id: "f4-stories", text: "Prepare 5 STAR stories: leadership, teamwork, failure, conflict, a time you were wrong." },
          { id: "f4-pitch", text: "Prepare one stock pitch and one deal you can discuss for 2 minutes.", href: "/pitch-builder", cta: "Pitch builder" },
          { id: "f4-targets", text: "Pick 25–40 target firms and add them to your pipeline.", href: "/recruiting-calendar", cta: "Program tracker" },
        ],
      },
      {
        id: "f5",
        when: "Sophomore fall (Sept 2027 →)",
        title: "Recruiting season",
        why: "Based on this cycle: elite boutiques open Sept–Oct, middle-market banks Oct–Jan, bulge brackets Dec–Jan. Many review applications on a rolling basis.",
        steps: [
          { id: "f5-apply", text: "Apply within days of each program opening — rolling reviews fill spots early.", href: "/recruiting-calendar", cta: "Track programs" },
          { id: "f5-hirevue", text: "Practice HireVue-style recorded answers (most bulge brackets use them as the first round).", href: "/mock-interview", cta: "Timed mock" },
          { id: "f5-superday", text: "Before each Superday, re-drill that firm's question set and refresh your deals.", href: "/questions", cta: "Firm questions" },
        ],
      },
    ],
  },
  sophomore: {
    headline: "You're recruiting right now for Summer 2028.",
    summary:
      "Elite boutique and many middle-market applications are already open, and bulge-bracket programs typically open December–January. Prioritize applying early, networking with the firms that weigh it heavily, and getting technically sharp for first rounds.",
    phases: [
      {
        id: "s1",
        when: "This week",
        title: "Apply to what's open",
        why: "Open programs review on a rolling basis — a week late can mean the slots are gone.",
        steps: [
          { id: "s1-open", text: "Apply to every relevant open program, starting with the ones closing soonest.", href: "/recruiting-calendar", cta: "See open programs" },
          { id: "s1-resume", text: "Get your resume reviewed before you submit anywhere else.", href: "/resume", cta: "Resume review" },
          { id: "s1-pipeline", text: "Track every application in your pipeline.", href: "/pipeline", cta: "Pipeline" },
        ],
      },
      {
        id: "s2",
        when: "November → December",
        title: "First rounds + bulge-bracket prep",
        why: "First rounds at elite boutiques are often technical; bulge brackets usually start with a HireVue.",
        steps: [
          { id: "s2-tech", text: "Drill all technicals daily, with Hard questions and firm-specific sets.", href: "/questions", cta: "Question bank" },
          { id: "s2-deals", text: "Have 2 deals ready to discuss in 2 minutes each.", href: "/deals", cta: "Deal Tracker" },
          { id: "s2-network", text: "Network at firms where it matters most (e.g., Morgan Stanley) before applications open.", href: "/contacts", cta: "Contacts" },
          { id: "s2-mock", text: "Do 3+ timed mock interviews.", href: "/mock-interview", cta: "Mock interview" },
        ],
      },
      {
        id: "s3",
        when: "December → February",
        title: "Bulge brackets + middle market",
        why: "Based on last cycle, most bulge brackets opened between Dec 1 and Jan 15.",
        steps: [
          { id: "s3-bb", text: "Apply to bulge-bracket programs the week they open.", href: "/recruiting-calendar", cta: "Track programs" },
          { id: "s3-tests", text: "Prep the online tests named in the tracker (SHL, HireVue, Pymetrics, etc.)." },
          { id: "s3-debrief", text: "Debrief after every interview — log the questions you got.", href: "/debriefs", cta: "Debriefs" },
        ],
      },
    ],
  },
  junior: {
    headline: "Focus on converting your summer offer — or off-cycle / full-time recruiting.",
    summary:
      "If you have a junior-summer internship, the return offer is your main path. If not, target off-cycle internships, middle-market and regional banks that hire later, and full-time analyst recruiting.",
    phases: [
      {
        id: "j1",
        when: "Now",
        title: "Fill the gaps",
        why: "Smaller banks and buy-side shops hire throughout the year.",
        steps: [
          { id: "j1-mm", text: "Apply to middle-market and regional programs that are still open.", href: "/recruiting-calendar", cta: "Program tracker" },
          { id: "j1-network", text: "Network directly with smaller firms — many fill roles through referrals.", href: "/contacts", cta: "Contacts" },
          { id: "j1-tech", text: "Keep technicals sharp — expect harder questions than sophomore recruiting.", href: "/questions", cta: "Question bank" },
        ],
      },
    ],
  },
};

const STORAGE_KEY = "df-roadmap-v1";

type Saved = { year: ClassYear; done: Record<string, boolean> };

function readSaved(): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Saved | null;
    if (v && PLANS[v.year]) return v;
  } catch {
    /* storage unavailable */
  }
  return { year: "freshman", done: {} };
}

export function RecruitingRoadmap() {
  const [saved, setSaved] = useState<Saved>({ year: "freshman", done: {} });
  useEffect(() => setSaved(readSaved()), []);

  const update = (next: Saved) => {
    setSaved(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  };

  const plan = PLANS[saved.year];
  const allSteps = useMemo(() => plan.phases.flatMap((p) => p.steps), [plan]);
  const doneCount = allSteps.filter((s) => saved.done[s.id]).length;
  const pct = allSteps.length ? Math.round((doneCount / allSteps.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Recruiting roadmap</h1>
        <p className="mt-1 text-sm text-ink-2">What to do, and when, to land a junior-summer investment banking internship.</p>
      </div>
      <SectionTabs className="mt-5 mb-6" />

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Class year">
        {(
          [
            ["freshman", "Freshman"],
            ["sophomore", "Sophomore"],
            ["junior", "Junior"],
          ] as [ClassYear, string][]
        ).map(([y, label]) => (
          <button
            key={y}
            type="button"
            role="radio"
            aria-checked={saved.year === y}
            onClick={() => update({ ...saved, year: y })}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm",
              saved.year === y
                ? "border-accent bg-accent-tint text-accent"
                : "border-border-strong text-ink-2 hover:border-border-strong",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Card className="space-y-3 border-accent bg-accent-tint p-4">
        <p className="text-base font-semibold text-ink">{plan.headline}</p>
        <p className="text-sm leading-relaxed text-ink-2">{plan.summary}</p>
        <div>
          <div className="mb-1 flex justify-between text-xs text-ink-2">
            <span>Your progress</span>
            <span className="font-mono">
              {doneCount}/{allSteps.length} · {pct}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-success-bg transition-[width]" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </Card>

      <ol className="space-y-4">
        {plan.phases.map((phase, i) => {
          const phaseDone = phase.steps.every((s) => saved.done[s.id]);
          return (
            <li key={phase.id}>
              <Card className={cn("space-y-3 border-border bg-surface p-4", phaseDone && "opacity-70")}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-base font-semibold text-ink">
                    <span className="mr-2 font-mono text-sm text-ink-3">{i + 1}.</span>
                    {phase.title}
                  </h2>
                  <span className="rounded bg-surface-2 px-2 py-0.5 text-xs text-ink-2">{phase.when}</span>
                </div>
                <p className="text-sm text-ink-2">{phase.why}</p>
                <ul className="space-y-2">
                  {phase.steps.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-start gap-3 rounded-lg border border-border bg-surface p-2.5">
                      <input
                        type="checkbox"
                        aria-label={s.text}
                        className="mt-1 h-4 w-4 shrink-0 accent-emerald-500"
                        checked={Boolean(saved.done[s.id])}
                        onChange={(e) => update({ ...saved, done: { ...saved.done, [s.id]: e.target.checked } })}
                      />
                      <span className={cn("min-w-0 flex-1 text-sm text-ink", saved.done[s.id] && "text-ink-3 line-through")}>
                        {s.text}
                      </span>
                      {s.href ? (
                        <Link href={s.href} className="shrink-0 text-xs font-medium text-accent hover:underline">
                          {s.cta ?? "Open"} →
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
