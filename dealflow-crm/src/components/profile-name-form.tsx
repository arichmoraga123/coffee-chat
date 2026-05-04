"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProfileNameForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    await fetch("/api/user/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    router.refresh();
  };

  return (
    <div className="mt-4 flex flex-wrap items-end gap-2">
      <div className="min-w-[200px] flex-1">
        <label className="mb-1 block text-xs text-zinc-500">Display name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <Button size="sm" onClick={() => void save()} disabled={busy || !name.trim()}>
        {busy ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
