"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SchoolJoinButton({ schoolId, schoolShortName }: { schoolId: string; schoolShortName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const join = async () => {
    setErr("");
    setBusy(true);
    const res = await fetch("/api/user/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolId }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(d.error ?? "Could not update school.");
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-2">
      <Button type="button" disabled={busy} onClick={() => void join()}>
        {busy ? "Saving…" : `Join ${schoolShortName}`}
      </Button>
      {err ? <p className="text-xs text-red-400">{err}</p> : null}
      <p className="text-xs text-zinc-500">
        Sets your campus on Prospect. Use profile if you need to clear or change school later.
      </p>
    </div>
  );
}
