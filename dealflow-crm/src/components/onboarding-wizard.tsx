"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const TARGETS = ["IB", "PE", "VC", "Consulting", "Other"] as const;

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [targets, setTargets] = useState<string[]>([]);
  const [firmsText, setFirmsText] = useState("");
  const [dailyGoal, setDailyGoal] = useState<5 | 10 | 20>(5);
  const [busy, setBusy] = useState(false);

  const toggleTarget = (t: string) => {
    setTargets((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const finish = async () => {
    setBusy(true);
    const targetFirms = firmsText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    await fetch("/api/user/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recruitingTarget: targets,
        targetFirms,
        dailyGoal,
        onboardingDone: true,
      }),
    });
    setBusy(false);
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur">
      <Card className="w-full max-w-lg border-zinc-700 bg-zinc-950 p-6 shadow-2xl">
        {step === 1 ? (
          <>
            <h2 className="text-lg font-semibold text-zinc-100">Welcome — what are you recruiting for?</h2>
            <p className="mt-2 text-sm text-zinc-400">Pick all that apply.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {TARGETS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTarget(t)}
                  className={
                    targets.includes(t)
                      ? "rounded-full border border-[#3a3a3a] bg-white/[0.06] px-3 py-1 text-sm text-[#f5f5f5]"
                      : "rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-300 hover:border-zinc-500"
                  }
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button onClick={() => setStep(2)} disabled={targets.length === 0}>
                Next
              </Button>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h2 className="text-lg font-semibold text-zinc-100">Which firms are you targeting?</h2>
            <p className="mt-2 text-sm text-zinc-400">Comma or newline separated.</p>
            <textarea
              className="mt-4 min-h-[120px] w-full rounded border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-100"
              value={firmsText}
              onChange={(e) => setFirmsText(e.target.value)}
              placeholder="e.g. Goldman Sachs, Evercore, KKR"
            />
            <div className="mt-6 flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>Next</Button>
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <h2 className="text-lg font-semibold text-zinc-100">Set your daily goal</h2>
            <p className="mt-2 text-sm text-zinc-400">Questions per day (outside the fixed daily drill).</p>
            <div className="mt-4 flex gap-2">
              {([5, 10, 20] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDailyGoal(n)}
                  className={
                    dailyGoal === n
                      ? "flex-1 rounded border border-[#c9a84c]/40 bg-[#161616] py-3 text-sm font-medium text-[#f5f5f5]"
                      : "flex-1 rounded border border-zinc-700 bg-zinc-900 py-3 text-sm text-zinc-300 hover:border-zinc-500"
                  }
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={() => void finish()} disabled={busy}>
                {busy ? "Saving…" : "Finish"}
              </Button>
            </div>
          </>
        ) : null}
      </Card>
    </div>
  );
}
