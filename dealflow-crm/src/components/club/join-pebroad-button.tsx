"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function JoinPeBroadButton({ initialStatus }: { initialStatus: "none" | "pending" | "denied" }) {
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);

  if (status === "pending") {
    return <p className="text-sm text-warn">Request sent — a PE@Broad admin will review it.</p>;
  }
  return (
    <Button
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await fetch("/api/club/join-request", { method: "POST" });
        setBusy(false);
        const d = (await res.json().catch(() => ({}))) as { status?: string; error?: string };
        if (!res.ok) return toast.error(d.error ?? "Couldn't send the request");
        if (d.status === "member") window.location.reload();
        else setStatus("pending");
      }}
    >
      {status === "denied" ? "Ask again to join PE@Broad" : "Request to join PE@Broad"}
    </Button>
  );
}
