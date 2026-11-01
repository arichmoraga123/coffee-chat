"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ClubAnnouncementComposer({ clubId }: { clubId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    const res = await fetch("/api/club/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubId, title, body }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(d.error ?? "Could not post");
      return;
    }
    setTitle("");
    setBody("");
    router.refresh();
  };

  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface p-4">
      <p className="text-sm font-medium text-ink">New announcement (officers)</p>
      <input
        className="w-full rounded border border-border-strong bg-surface px-3 py-2 text-sm text-ink"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="min-h-[100px] w-full rounded border border-border-strong bg-surface px-3 py-2 text-sm text-ink"
        placeholder="Body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {err ? <p className="text-xs text-danger">{err}</p> : null}
      <Button type="button" size="sm" disabled={busy || !title.trim() || !body.trim()} onClick={() => void submit()}>
        {busy ? "Posting…" : "Post"}
      </Button>
    </div>
  );
}
