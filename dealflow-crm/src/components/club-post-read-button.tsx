"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ClubPostReadButton({ id, read }: { id: string; read: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (read) return;
    setBusy(true);
    await fetch(`/api/club/posts/${id}/read`, { method: "POST" });
    setBusy(false);
    router.refresh();
  };

  return (
    <Button type="button" size="sm" variant="outline" disabled={busy || read} onClick={() => void onClick()}>
      {read ? "Complete" : "Mark complete"}
    </Button>
  );
}
