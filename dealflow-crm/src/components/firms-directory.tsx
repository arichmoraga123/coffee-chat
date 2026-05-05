"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { FIRM_TYPE_ORDER, FIRM_TYPE_LABELS, FirmTypeBadge } from "@/lib/firm-type";
import type { FirmType } from "@prisma/client";

export type FirmRow = {
  id: string;
  name: string;
  type: FirmType | null;
  location: string;
  contacts: number;
  opportunities: number;
};

export function FirmsDirectory({ initialFirms }: { initialFirms: FirmRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<FirmType | "">("");
  const [location, setLocation] = useState("");
  const [focus, setFocus] = useState("Generalist");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createFirm = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/firms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        type: type || undefined,
        location: location.trim() || "Unknown",
        focus: focus.trim() || "Generalist",
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setError(d.error ?? "Could not create firm");
      return;
    }
    setOpen(false);
    setName("");
    setType("");
    setLocation("");
    setFocus("Generalist");
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Firms</h1>
        <Button
          size="sm"
          onClick={() => {
            setType("");
            setOpen(true);
          }}
        >
          Add firm
        </Button>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[280px] text-sm md:min-w-[640px]">
            <thead className="bg-zinc-900 text-left text-zinc-400">
              <tr>
                <th className="px-3 py-2">Firm</th>
                <th className="min-w-0 px-3 py-2">Type</th>
                <th className="hidden px-3 py-2 md:table-cell">Location</th>
                <th className="hidden px-3 py-2 md:table-cell">Contacts</th>
                <th className="hidden px-3 py-2 md:table-cell">Opportunities</th>
                <th className="hidden md:table-cell" />
              </tr>
            </thead>
            <tbody>
              {initialFirms.map((f) => (
                <tr key={f.id} className="border-t border-zinc-800">
                  <td className="max-w-[48%] min-w-0 px-3 py-2 align-top md:max-w-none">
                    <Link href={`/firms/${f.id}`} className="break-words text-cyan-400 hover:underline">
                      {f.name}
                    </Link>
                  </td>
                  <td className="min-w-0 max-w-[44%] px-3 py-2 align-top md:max-w-none">
                    <FirmTypeBadge
                      type={f.type}
                      className="inline-flex max-w-full whitespace-normal break-words text-[9px] leading-snug md:text-[10px]"
                    />
                  </td>
                  <td className="hidden px-3 py-2 align-top md:table-cell">{f.location}</td>
                  <td className="hidden px-3 py-2 align-top md:table-cell">{f.contacts}</td>
                  <td className="hidden px-3 py-2 align-top md:table-cell">{f.opportunities}</td>
                  <td className="hidden px-3 py-2 text-right align-top md:table-cell">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/firms/${f.id}`}>Edit</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New firm" className="max-w-md">
        <div className="space-y-2 text-sm">
          <Input placeholder="Firm name" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="mb-1 block text-xs text-zinc-500">Firm type</label>
          <select
            className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
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
          <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
          <Input placeholder="Focus" value={focus} onChange={(e) => setFocus(e.target.value)} />
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" disabled={busy || !name.trim() || !type} onClick={() => void createFirm()}>
            {busy ? "Saving…" : "Create"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
