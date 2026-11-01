"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function RsvpButtons({ eventId, initial, going, declined, full }: { eventId: string; initial: "going" | "declined" | "none"; going: number; declined: number; full: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [counts, setCounts] = useState({ going, declined });
  const set = async (next: "going" | "declined") => {
    const target = status === next ? "none" : next;
    const res = await fetch(`/api/club/events/${eventId}/rsvp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: target }) });
    const d = (await res.json().catch(() => ({}))) as { going?: number; declined?: number; error?: string };
    if (!res.ok) return toast.error(d.error ?? "Couldn't save your RSVP.");
    setStatus(target);
    setCounts({ going: d.going ?? counts.going, declined: d.declined ?? counts.declined });
    router.refresh();
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant={status === "going" ? "primary" : "secondary"} aria-pressed={status === "going"} disabled={full && status !== "going"} onClick={() => void set("going")}>
        Going · {counts.going}
      </Button>
      <Button size="sm" variant={status === "declined" ? "primary" : "secondary"} aria-pressed={status === "declined"} onClick={() => void set("declined")}>
        Can&apos;t make it · {counts.declined}
      </Button>
    </div>
  );
}
