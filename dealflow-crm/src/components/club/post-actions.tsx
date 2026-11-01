"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Logs a view once, and lets members mark the post done. */
export function PostMemberActions({ postId, allowDone, done }: { postId: string; allowDone: boolean; done: boolean }) {
  const router = useRouter();
  const [isDone, setDone] = useState(done);
  useEffect(() => {
    void fetch(`/api/club/posts/${postId}/progress`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "view" }) });
  }, [postId]);
  if (!allowDone) return null;
  return (
    <Button
      variant={isDone ? "secondary" : "primary"}
      onClick={async () => {
        const res = await fetch(`/api/club/posts/${postId}/progress`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: isDone ? "undone" : "done" }) });
        if (!res.ok) return toast.error("Couldn't save.");
        setDone(!isDone);
        toast(isDone ? "Marked not done" : "Marked done");
        router.refresh();
      }}
    >
      {isDone ? "Done · Undo" : "Mark done"}
    </Button>
  );
}

export function RemindButton({ postId, who, count, label }: { postId: string; who: "unopened" | "notdone"; count: number; label: string }) {
  const [busy, setBusy] = useState(false);
  if (!count) return null;
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await fetch(`/api/club/posts/${postId}/remind`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ who }) });
        setBusy(false);
        const d = (await res.json().catch(() => ({}))) as { count?: number };
        if (!res.ok) return toast.error("Couldn't send reminders.");
        toast(`Reminded ${d.count} member${d.count === 1 ? "" : "s"}`);
      }}
    >
      {label}
    </Button>
  );
}
