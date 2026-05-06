"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ClubRsvpButton({ eventId, going }: { eventId: string; going: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    await fetch(`/api/club/events/${eventId}/rsvp`, { method: "POST" });
    setBusy(false);
    router.refresh();
  };

  return (
    <Button type="button" size="sm" variant={going ? "default" : "outline"} disabled={busy} onClick={() => void toggle()}>
      {going ? "RSVP’d" : "RSVP"}
    </Button>
  );
}
