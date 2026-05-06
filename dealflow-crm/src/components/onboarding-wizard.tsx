"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CAREER_TRACK_OPTIONS } from "@/lib/career-tracks";

const TRACK_CHOICES = CAREER_TRACK_OPTIONS.filter((t) => t !== "Actuarial");

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [eduEmail, setEduEmail] = useState("");
  const [eduMsg, setEduMsg] = useState<string | null>(null);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [eduBusy, setEduBusy] = useState(false);
  const [tracks, setTracks] = useState<string[]>([]);
  const [firmsText, setFirmsText] = useState("");
  const [dailyGoal, setDailyGoal] = useState<5 | 10 | 20>(5);
  const [busy, setBusy] = useState(false);

  const toggleTrack = (t: string) => {
    setTracks((prev) => {
      if (prev.includes(t)) return prev.filter((x) => x !== t);
      if (prev.length >= 3) return prev;
      return [...prev, t];
    });
  };

  const submitEdu = async () => {
    setEduBusy(true);
    setEduMsg(null);
    setVerifyUrl(null);
    const res = await fetch("/api/user/edu-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eduEmail: eduEmail.trim() }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      schoolFound?: boolean;
      schoolName?: string | null;
      verifyUrl?: string;
      error?: string;
    };
    setEduBusy(false);
    if (!res.ok) {
      setEduMsg(data.error ?? "Could not save school email.");
      return;
    }
    if (data.schoolFound && data.schoolName) {
      setEduMsg(`We found ${data.schoolName}! You'll be connected to the ${data.schoolName} community.`);
    } else {
      setEduMsg("We don't have your school yet — you'll be our founding member there!");
    }
    if (data.verifyUrl) setVerifyUrl(data.verifyUrl);
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
        careerTracks: tracks,
        recruitingTarget: [],
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
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto border-zinc-700 bg-zinc-950 p-6 shadow-2xl">
        {step === 0 ? (
          <>
            <h2 className="text-lg font-semibold text-zinc-100">What&apos;s your school email address?</h2>
            <p className="mt-2 text-sm text-zinc-400">
              We use it to place you in the right campus community. You&apos;ll verify it from your inbox (or the link below in
              development).
            </p>
            <input
              type="email"
              className="mt-4 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              placeholder="you@school.edu"
              value={eduEmail}
              onChange={(e) => setEduEmail(e.target.value)}
            />
            {eduMsg ? <p className="mt-3 text-sm text-zinc-300">{eduMsg}</p> : null}
            {verifyUrl ? (
              <div className="mt-3 rounded border border-zinc-700 bg-zinc-900/80 p-3 text-xs text-zinc-400">
                <p className="font-medium text-zinc-200">Verification link (copy if email did not send)</p>
                <p className="mt-1 break-all text-zinc-500">{verifyUrl}</p>
              </div>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Skip for now
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => void submitEdu()} disabled={eduBusy || !eduEmail.trim()}>
                  {eduBusy ? "Saving…" : "Submit"}
                </Button>
                <Button type="button" onClick={() => setStep(1)} disabled={eduBusy}>
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <h2 className="text-lg font-semibold text-zinc-100">Which career tracks are you recruiting for?</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Pick up to 3. We&apos;ll personalize your question bank, mock interviews, resume review, and news feed based on your recruiting goals.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {TRACK_CHOICES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTrack(t)}
                  className={
                    tracks.includes(t)
                      ? "rounded-full border border-[#3a3a3a] bg-white/[0.06] px-3 py-1 text-xs text-[#f5f5f5]"
                      : "rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300 hover:border-zinc-500"
                  }
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button onClick={() => setStep(2)} disabled={tracks.length === 0}>
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
              placeholder="e.g. Goldman Sachs, McKinsey, PwC"
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
