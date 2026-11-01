"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCareerTracks } from "@/components/career-track-provider";
import { CAREER_TRACK_OPTIONS } from "@/lib/career-tracks";

export function ProfileTracksForm({ initialTracks }: { initialTracks: string[] }) {
  const router = useRouter();
  const { refreshCareerTracks } = useCareerTracks();
  const [tracks, setTracks] = useState<string[]>(initialTracks);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const toggle = (t: string) => {
    setTracks((prev) => {
      if (prev.includes(t)) return prev.filter((x) => x !== t);
      if (prev.length >= 3) {
        setMsg("Select up to 3 tracks.");
        return prev;
      }
      return [...prev, t];
    });
  };

  const save = async () => {
    setBusy(true);
    await fetch("/api/user/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ careerTracks: tracks }),
    });
    setBusy(false);
    await refreshCareerTracks();
    router.refresh();
    setMsg(`Your app has been updated for ${tracks.join(", ")}`);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-3">Controls filtering for questions, mock interviews, deals, timelines, and resources.</p>
      {msg ? <p className="text-xs text-warn">{msg}</p> : null}
      <div className="flex flex-wrap gap-2">
        {CAREER_TRACK_OPTIONS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => toggle(t)}
            className={
              tracks.includes(t)
                ? "rounded-full border border-border-strong bg-surface-2 px-2.5 py-1 text-xs text-ink"
                : "rounded-full border border-border-strong bg-surface px-2.5 py-1 text-xs text-ink-2 hover:border-border-strong"
            }
          >
            {t}
          </button>
        ))}
      </div>
      <Button size="sm" type="button" disabled={busy || tracks.length === 0} onClick={() => void save()}>
        {busy ? "Saving…" : "Save career tracks"}
      </Button>
    </div>
  );
}
