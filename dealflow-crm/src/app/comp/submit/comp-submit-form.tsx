"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function CompSubmitForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    firmName: "",
    role: "",
    vertical: "",
    year: String(new Date().getFullYear()),
    baseComp: "",
    signingBonus: "",
    yearEndBonus: "",
    totalComp: "",
    officeLocation: "",
  });

  const submit = async () => {
    setErr(null);
    setBusy(true);
    const res = await fetch("/api/comp-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firmName: form.firmName,
        role: form.role,
        vertical: form.vertical,
        year: Number(form.year),
        baseComp: form.baseComp ? Number(form.baseComp) : null,
        signingBonus: form.signingBonus ? Number(form.signingBonus) : null,
        yearEndBonus: form.yearEndBonus ? Number(form.yearEndBonus) : null,
        totalComp: form.totalComp ? Number(form.totalComp) : null,
        officeLocation: form.officeLocation || null,
        anonymous: true,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(d.error ?? "Could not submit");
      return;
    }
    router.push("/comp");
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href="/comp" className="text-xs text-amber-200/90 hover:underline">
        ← Comp data
      </Link>
      <Card className="border-zinc-800 bg-zinc-900/50 p-6">
        <h1 className="text-xl font-semibold text-zinc-50">Submit comp (anonymous)</h1>
        <div className="mt-4 space-y-3">
          {(["firmName", "role", "vertical", "officeLocation"] as const).map((k) => (
            <input
              key={k}
              className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              placeholder={k}
              value={form[k]}
              onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
            />
          ))}
          <input
            className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            placeholder="Year"
            value={form.year}
            onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
          />
          {(["baseComp", "signingBonus", "yearEndBonus", "totalComp"] as const).map((k) => (
            <input
              key={k}
              type="number"
              className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              placeholder={k}
              value={form[k]}
              onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
            />
          ))}
        </div>
        {err ? <p className="mt-2 text-sm text-red-400">{err}</p> : null}
        <Button type="button" className="mt-4" disabled={busy} onClick={() => void submit()}>
          {busy ? "Submitting…" : "Submit"}
        </Button>
      </Card>
    </div>
  );
}
