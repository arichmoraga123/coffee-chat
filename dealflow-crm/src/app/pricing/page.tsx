"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
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
    plan: "club" as const,
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
    plan: "chapter" as const,
  },
];

export default function PricingPage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const [status, setStatus] = useState<Status>({ subscriptionStatus: null, clubId: null });
  const [busy, setBusy] = useState<"club" | "chapter" | null>(null);
  const [checkoutError, setCheckoutError] = useState("");

  useEffect(() => {
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (process.env.NODE_ENV === "development") {
      console.log("[pricing] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", pk ? `${pk.slice(0, 12)}…` : "(unset)");
    }
  }, []);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    void fetch("/api/stripe/subscription-status", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setStatus({ subscriptionStatus: d.subscriptionStatus, clubId: d.clubId });
      })
      .catch(() => {});
  }, [sessionStatus]);

  const startCheckout = async (plan: "club" | "chapter") => {
    console.log("[pricing] startCheckout click", { plan, clubId: status.clubId, sessionStatus });
    setCheckoutError("");

    if (sessionStatus === "unauthenticated") {
      router.push("/signup?redirect=/pricing");
      return;
    }
    if (sessionStatus === "loading") {
      setCheckoutError("Still loading your session — try again in a moment.");
      return;
    }

    setBusy(plan);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          plan,
          clubId: status.clubId ?? undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok) {
        setCheckoutError(data.error ?? `Request failed (${res.status})`);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setCheckoutError(data.error ?? "Stripe did not return a checkout URL.");
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(null);
    }
  };

  const openPortal = async () => {
    setCheckoutError("");
    const res = await fetch("/api/stripe/create-portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ clubId: status.clubId ?? undefined }),
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (data.url) window.location.href = data.url;
    else setCheckoutError(data.error ?? "Could not open billing portal");
  };

  const active = ["active", "trialing"].includes(status.subscriptionStatus ?? "");

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-8">
      <h1 className="text-3xl font-semibold">Pricing</h1>
      {checkoutError ? (
        <div className="rounded-lg border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">{checkoutError}</div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        {TIERS.map((tier) => (
          <div key={tier.name} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">{tier.name}</p>
            <p className="mt-1 text-2xl font-semibold">{tier.price}</p>
            <p className="mt-1 text-sm text-zinc-400">{tier.subtitle}</p>
            <ul className="mt-3 space-y-1 text-sm text-zinc-300">
              {tier.features.map((f) => (
                <li key={f}>- {f}</li>
              ))}
            </ul>
            <div className="mt-4">
              {"href" in tier && tier.href ? (
                <Button asChild className="w-full">
                  <Link href={tier.href}>{tier.cta}</Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  className="w-full"
                  disabled={"plan" in tier && busy === tier.plan}
                  onClick={() => {
                    const plan = "plan" in tier ? tier.plan : undefined;
                    if (!plan) return;
                    console.log("[pricing] CTA button onClick", tier.name, plan);
                    void startCheckout(plan);
                  }}
                >
                  {"plan" in tier && busy === tier.plan ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Redirecting…
                    </span>
                  ) : active ? (
                    "Upgrade"
                  ) : (
                    tier.cta
                  )}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      {active ? (
        <Button type="button" variant="outline" onClick={() => void openPortal()}>
          Manage Subscription
        </Button>
      ) : null}
    </div>
  );
}
