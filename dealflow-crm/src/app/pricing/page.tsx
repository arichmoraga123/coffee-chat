"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Status = { subscriptionStatus: string | null; clubId: string | null };

const TIERS = [
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
    priceEnv: "STRIPE_CLUB_PRICE_ID",
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
    priceEnv: "STRIPE_CHAPTER_PRICE_ID",
  },
];

export default function PricingPage() {
  const [status, setStatus] = useState<Status>({ subscriptionStatus: null, clubId: null });
  const [busy, setBusy] = useState<"club" | "chapter" | null>(null);

  useEffect(() => {
    fetch("/api/stripe/subscription-status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setStatus({ subscriptionStatus: d.subscriptionStatus, clubId: d.clubId });
      })
      .catch(() => {});
  }, []);

  const startCheckout = async (plan: "club" | "chapter") => {
    if (!status.clubId) return;
    setBusy(plan);
    const res = await fetch("/api/stripe/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, clubId: status.clubId }),
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    setBusy(null);
    if (data.url) window.location.href = data.url;
    else alert(data.error ?? "Could not create checkout session");
  };

  const openPortal = async () => {
    const res = await fetch("/api/stripe/create-portal", { method: "POST", headers: { "Content-Type": "application/json" } });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (data.url) window.location.href = data.url;
    else alert(data.error ?? "Could not open billing portal");
  };

  const active = ["active", "trialing"].includes(status.subscriptionStatus ?? "");

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-8">
      <h1 className="text-3xl font-semibold">Pricing</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {TIERS.map((tier) => (
          <div key={tier.name} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">{tier.name}</p>
            <p className="mt-1 text-2xl font-semibold">{tier.price}</p>
            <p className="mt-1 text-sm text-zinc-400">{tier.subtitle}</p>
            <ul className="mt-3 space-y-1 text-sm text-zinc-300">
              {tier.features.map((f) => <li key={f}>- {f}</li>)}
            </ul>
            <div className="mt-4">
              {tier.href ? (
                <Button asChild className="w-full"><Link href={tier.href}>{tier.cta}</Link></Button>
              ) : (
                <Button
                  className="w-full"
                  disabled={busy === (tier.priceEnv === "STRIPE_CLUB_PRICE_ID" ? "club" : "chapter")}
                  onClick={() => void startCheckout(tier.priceEnv === "STRIPE_CLUB_PRICE_ID" ? "club" : "chapter")}
                >
                  {busy === (tier.priceEnv === "STRIPE_CLUB_PRICE_ID" ? "club" : "chapter") ? "Redirecting..." : active ? "Upgrade" : tier.cta}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      {active ? (
        <Button variant="outline" onClick={() => void openPortal()}>
          Manage Subscription
        </Button>
      ) : null}
    </div>
  );
}
