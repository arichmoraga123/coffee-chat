"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FIRM_TYPE_ORDER,
  FIRM_TYPE_LABELS,
  FirmTypeBadge,
  parseFirmType,
} from "@/lib/firm-type";
import type { FirmType } from "@prisma/client";

type FirmData = {
  id: string;
  name: string;
  type: FirmType | null;
  location: string;
  focus: string;
  aum: string | null;
  recruitingNotes: string;
};

export function FirmDetailEditor({ firm }: { firm: FirmData }) {
  const router = useRouter();
  const [name, setName] = useState(firm.name);
  const [type, setType] = useState<FirmType | "">((firm.type ?? "") as FirmType | "");
  const [location, setLocation] = useState(firm.location);
  const [focus, setFocus] = useState(firm.focus);
  const [aum, setAum] = useState(firm.aum ?? "");
  const [recruitingNotes, setRecruitingNotes] = useState(firm.recruitingNotes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    const parsedType = parseFirmType(type);
    if (!parsedType) {
      setError("Select a firm type.");
      setBusy(false);
      return;
    }
    const res = await fetch(`/api/firms/${firm.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        type: parsedType,
        location: location.trim(),
        focus: focus.trim(),
        aum: aum.trim() || null,
        recruitingNotes: recruitingNotes.trim(),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setError(d.error ?? "Save failed");
      return;
    }
    router.refresh();
  };

  return (
    <Card className="space-y-3 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-zinc-500">Firm type badge</p>
        <FirmTypeBadge type={type || null} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-zinc-500">Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-zinc-500">Type</label>
        <select
          className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-2"
          value={type}
          onChange={(e) => setType((e.target.value || "") as FirmType | "")}
        >
          <option value="">Select firm type…</option>
          {FIRM_TYPE_ORDER.map((t) => (
            <option key={t} value={t}>
              {FIRM_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-zinc-500">Location</label>
        <Input value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-zinc-500">Focus</label>
        <Input value={focus} onChange={(e) => setFocus(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-zinc-500">AUM (optional)</label>
        <Input value={aum} onChange={(e) => setAum(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-zinc-500">Recruiting notes</label>
        <textarea
          className="min-h-[100px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-zinc-100"
          value={recruitingNotes}
          onChange={(e) => setRecruitingNotes(e.target.value)}
        />
      </div>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      <Button size="sm" disabled={busy} onClick={() => void save()}>
        {busy ? "Saving…" : "Save changes"}
      </Button>
    </Card>
  );
}
