"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EMOJI = ["👏", "🔥", "💪", "🎯", "😂"] as const;

export function Reactions({ activityId, reactions, me }: { activityId: string; reactions: { userId: string; emoji: string }[]; me: string }) {
  const [list, setList] = useState(reactions);
  const mine = list.find((r) => r.userId === me)?.emoji ?? null;
  const counts = EMOJI.map((e) => ({ e, n: list.filter((r) => r.emoji === e).length }));
  const react = async (emoji: string) => {
    const next = mine === emoji ? null : emoji;
    const prev = list;
    setList([...list.filter((r) => r.userId !== me), ...(next ? [{ userId: me, emoji: next }] : [])]);
    const res = await fetch("/api/club/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activityId, emoji: next }),
    });
    if (!res.ok) {
      setList(prev);
      toast.error("Couldn't react.");
    }
  };
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {counts.map(({ e, n }) => (
        <button
          key={e}
          type="button"
          onClick={() => void react(e)}
          aria-pressed={mine === e}
          aria-label={`React ${e}`}
          className={cn(
            "inline-flex h-8 min-w-10 items-center justify-center gap-1 rounded-full border px-2 text-sm",
            mine === e ? "border-accent bg-accent-tint text-accent" : n ? "border-border-strong text-ink-2" : "border-border text-ink-3 opacity-70 hover:opacity-100",
          )}
        >
          {e}
          {n ? <span className="text-xs">{n}</span> : null}
        </button>
      ))}
    </div>
  );
}
