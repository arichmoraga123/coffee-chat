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

  const toggle = (t: string) => {
    setTracks((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
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
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">Controls filtering for questions, mock interviews, deals, timelines, and resources.</p>
      <div className="flex flex-wrap gap-2">
        {CAREER_TRACK_OPTIONS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => toggle(t)}
            className={
              tracks.includes(t)
                ? "rounded-full border border-[#3a3a3a] bg-white/[0.06] px-2.5 py-1 text-xs text-[#f5f5f5]"
                : "rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400 hover:border-zinc-500"
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
