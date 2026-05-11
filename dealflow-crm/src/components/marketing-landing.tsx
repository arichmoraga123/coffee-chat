"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LandingFeaturePreview } from "@/components/marketing-feature-previews";

export function MarketingLanding({ inviteName }: { inviteName?: string | null }) {
  const pricingTiers: Array<{
    name: string;
    price: string;
    subtitle: string;
    features: string[];
    cta: string;
    href: string;
  }> = [
    {
      name: "FREE",
      price: "$0/month",
      subtitle: "For individual students",
      features: [
        "Full question bank and drill mode",
        "Personal rolodex and pipeline tracker",
        "Resume reviewer (3 per month)",
        "Read-only comp data and timelines",
        "Global leaderboard",
      ],
      cta: "Get Started Free",
      href: "/signup",
    },
    {
      name: "CLUB",
      price: "$49/month",
      subtitle: "For finance clubs",
      features: [
        "Everything in Free",
        "Full club hub (announcements, projects, events)",
        "Officer tools and content distribution",
        "Club leaderboard",
        "Up to 50 members",
        "14-day free trial",
      ],
      cta: "Start Free Trial",
      href: "/pricing",
    },
    {
      name: "CHAPTER",
      price: "$99/month",
      subtitle: "For school chapters",
      features: [
        "Everything in Club",
        "Multiple clubs under one chapter",
        "School alumni directory",
        "School-specific recruiting timelines",
        "Unlimited members",
        "Priority support",
        "14-day free trial",
      ],
      cta: "Start Free Trial",
      href: "/pricing",
    },
  ];
  return (
    <div className="mx-auto max-w-6xl space-y-16 pb-16">
      <header className="flex items-center justify-between pt-4">
        <p className="text-lg font-semibold">Prospect</p>
        <nav className="flex items-center gap-4 text-sm text-zinc-400">
          <a href="#features" className="hover:text-zinc-200">Features</a>
          <Link href="/pricing" className="hover:text-zinc-200">Pricing</Link>
          <Link href="/login" className="hover:text-zinc-200">Login</Link>
          <Link href="/signup" className="hover:text-zinc-200">Sign Up</Link>
        </nav>
      </header>

      <section className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-10">
        {inviteName ? (
          <p className="mb-4 inline-block rounded-full border border-amber-600/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
            You have been invited by {inviteName}
          </p>
        ) : null}
        <h1 className="max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
          Everything you need to land your dream role.
        </h1>
        <p className="mt-4 max-w-3xl text-zinc-400">
          Prospect combines interview prep, networking, recruiting timelines, and club management into the platform
          IBvine, Drillcore, and LinkedIn cannot be individually.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild className="bg-white text-zinc-900 hover:bg-zinc-200">
            <Link href="/signup">Get Started Free</Link>
          </Button>
          <Button asChild variant="outline">
            <a href="#features">See How It Works</a>
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-sm text-zinc-400">Used by students at Michigan State, Boston University, and growing</p>
        <div className="flex flex-wrap gap-2">
          {["Michigan State", "Boston University", "Cornell", "Indiana", "Notre Dame"].map((s) => (
            <span key={s} className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">{s}</span>
          ))}
        </div>
        <p className="text-sm text-zinc-500">400+ interview questions. 20+ target firms tracked. Built by students, for students.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Recruiting prep is broken.</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["Too fragmented", "IBvine for questions. Drillcore for MCQ. LinkedIn for contacts. Your school GroupMe for timelines. Four tools when you need one."],
            ["Not built for you", "Generic platforms do not know what MSU students face recruiting against targets. Prospect is built specifically for business school recruiting."],
            ["No network effect", "When a Cornell student submits a Goldman question, every student benefits. Crowdsourced intel from real students at real schools."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="font-medium">{title}</p>
              <p className="mt-2 text-sm text-zinc-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="space-y-8">
        {[
          ["Practice like the real thing.", "400+ questions from Goldman, KKR, McKinsey and more. Flashcard and MCQ modes. Daily streaks, XP, and a leaderboard that keeps you accountable."],
          ["Your rolodex, supercharged.", "Log every coffee chat with detailed notes. One click generates a personalized follow-up email referencing exactly what you discussed. Pre-call briefs before every conversation."],
          ["Get feedback like a Goldman recruiter.", "Upload your resume and get specific, actionable feedback tailored to your target track — IB, PE, consulting, S&T, and more. Bullet point rewrites included."],
          ["Your school's recruiting intel, in one place.", "Crowdsourced firm timelines, comp data from real students, and alumni at target firms — all verified by .edu email."],
        ].map(([title, body], idx) => (
          <div key={title} className="grid items-center gap-4 md:grid-cols-2">
            <div className={idx % 2 ? "md:order-2" : ""}>
              <p className="text-2xl font-semibold">{title}</p>
              <p className="mt-2 text-zinc-400">{body}</p>
            </div>
            <LandingFeaturePreview index={idx} />
          </div>
        ))}
      </section>

      <section id="pricing" className="space-y-4">
        <h2 className="text-2xl font-semibold">Pricing</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {pricingTiers.map((tier) => (
            <div key={tier.name} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">{tier.name}</p>
              <p className="mt-1 text-2xl font-semibold">{tier.price}</p>
              <p className="mt-1 text-sm text-zinc-400">{tier.subtitle}</p>
              <ul className="mt-3 space-y-1 text-sm text-zinc-300">
                {tier.features.map((f) => <li key={f}>- {f}</li>)}
              </ul>
              <Button asChild className="mt-4 w-full"><Link href={tier.href}>{tier.cta}</Link></Button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
        <h3 className="text-2xl font-semibold">Ready to get recruited?</h3>
        <p className="mt-2 text-zinc-400">
          Join students at MSU, BU, and beyond who are using Prospect to land their dream roles.
        </p>
        <Button asChild className="mt-4 bg-white text-zinc-900 hover:bg-zinc-200">
          <Link href="/signup">Get Started Free</Link>
        </Button>
      </section>

      <footer className="border-t border-zinc-800 pt-6 text-sm text-zinc-500">
        <p className="font-medium text-zinc-300">Prospect — The recruiting network for business school students</p>
        <div className="mt-2 flex gap-4">
          <a href="#features" className="hover:text-zinc-300">Features</a>
          <a href="#pricing" className="hover:text-zinc-300">Pricing</a>
          <Link href="/login" className="hover:text-zinc-300">Login</Link>
          <Link href="/signup" className="hover:text-zinc-300">Sign Up</Link>
        </div>
        <p className="mt-2">© 2026 Prospect. Built by students.</p>
      </footer>
    </div>
  );
}
