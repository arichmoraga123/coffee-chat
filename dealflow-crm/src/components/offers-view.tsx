"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type OfferRow = {
  firmName: string;
  firmType: string;
  role: string;
  baseSalary: string;
  signingBonus: string;
  yearEndBonus: string;
  location: string;
  startDate: string;
  notes: string;
};

export function OffersView() {
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [form, setForm] = useState<OfferRow>({
    firmName: "",
    firmType: "IB",
    role: "",
    baseSalary: "",
    signingBonus: "",
    yearEndBonus: "",
    location: "",
    startDate: "",
    notes: "",
  });

  const load = async () => {
    const res = await fetch("/api/offers");
    if (!res.ok) return;
    const d = (await res.json()) as { comparisons: { id: string; offers: OfferRow[] }[] };
    const latest = d.comparisons[0];
    if (latest?.offers && Array.isArray(latest.offers)) setOffers(latest.offers as OfferRow[]);
    else setOffers([]);
  };

  useEffect(() => {
    void load();
  }, []);

  const addOffer = () => {
    if (!form.firmName.trim()) return;
    setOffers((o) => [...o, { ...form }]);
    setForm({
      firmName: "",
      firmType: "IB",
      role: "",
      baseSalary: "",
      signingBonus: "",
      yearEndBonus: "",
      location: "",
      startDate: "",
      notes: "",
    });
  };

  const save = async () => {
    await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offers }),
    });
    void load();
  };

  const runAi = async () => {
    const res = await fetch("/api/offers/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offers }),
    });
    const d = await res.json();
    setAnalysis((d as { analysis?: string }).analysis ?? null);
    if ((d as { analysis?: string }).analysis) {
      await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offers, aiAnalysis: (d as { analysis: string }).analysis }),
      });
      void load();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Offer comparison</h1>
        <p className="mt-1 text-sm text-zinc-400">
          <span className="text-[#c9a84c]">PRIVATE</span> to your account
        </p>
      </div>
      <Card className="space-y-2 border-zinc-800 bg-zinc-900/50 p-4">
        <p className="font-medium text-zinc-200">Add offer</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Firm" value={form.firmName} onChange={(e) => setForm((f) => ({ ...f, firmName: e.target.value }))} />
          <Input placeholder="Firm type" value={form.firmType} onChange={(e) => setForm((f) => ({ ...f, firmType: e.target.value }))} />
          <Input placeholder="Role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} />
          <Input placeholder="Base" value={form.baseSalary} onChange={(e) => setForm((f) => ({ ...f, baseSalary: e.target.value }))} />
          <Input placeholder="Signing" value={form.signingBonus} onChange={(e) => setForm((f) => ({ ...f, signingBonus: e.target.value }))} />
          <Input placeholder="Y/E bonus" value={form.yearEndBonus} onChange={(e) => setForm((f) => ({ ...f, yearEndBonus: e.target.value }))} />
          <Input placeholder="Location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          <Input placeholder="Start" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
          <Input className="sm:col-span-2" placeholder="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
        <Button size="sm" variant="outline" onClick={addOffer}>
          Add to table
        </Button>
      </Card>
      {offers.length ? (
        <Card className="overflow-x-auto border-zinc-800 bg-zinc-900/50 p-2">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="text-zinc-500">
              <tr>
                <th className="p-2">Firm</th>
                <th className="p-2">Type</th>
                <th className="p-2">Role</th>
                <th className="p-2">Base</th>
                <th className="p-2">Sign</th>
                <th className="p-2">Bonus</th>
                <th className="p-2">Loc</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o, i) => (
                <tr key={`${o.firmName}-${i}`} className="border-t border-zinc-800">
                  <td className="p-2">{o.firmName}</td>
                  <td className="p-2">{o.firmType}</td>
                  <td className="p-2">{o.role}</td>
                  <td className="p-2">{o.baseSalary}</td>
                  <td className="p-2">{o.signingBonus}</td>
                  <td className="p-2">{o.yearEndBonus}</td>
                  <td className="p-2">{o.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => void save()}>
          Save comparison
        </Button>
        <Button size="sm" variant="outline" disabled={!offers.length} onClick={() => void runAi()}>
          Generate AI analysis
        </Button>
      </div>
      {analysis ? <Card className="whitespace-pre-wrap border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-300">{analysis}</Card> : null}
    </div>
  );
}
