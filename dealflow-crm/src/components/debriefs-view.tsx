"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type D = {
  id: string;
  firmName: string;
  round: string;
  date: string;
  questionsAsked: string[];
  outcome: string | null;
  whatWentWell: string | null;
  improvements: string | null;
};

export function DebriefsView() {
  const [rows, setRows] = useState<D[]>([]);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [qText, setQText] = useState("");
  const [form, setForm] = useState({
    firmName: "",
    round: "First Round",
    date: new Date().toISOString().slice(0, 10),
    myAnswers: "",
    whatWentWell: "",
    improvements: "",
    outcome: "",
  });

  const load = async () => {
    const res = await fetch("/api/debriefs");
    if (!res.ok) return;
    const d = (await res.json()) as { debriefs: D[] };
    setRows(d.debriefs.map((r) => ({ ...r, date: r.date.slice(0, 10) })));
  };

  useEffect(() => {
    void load();
  }, []);

  const [questions, setQuestions] = useState<string[]>([]);

  const addQuestion = () => {
    const t = qText.trim();
    if (!t) return;
    setQuestions((qs) => [...qs, t]);
    setQText("");
  };

  const save = async () => {
    const res = await fetch("/api/debriefs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, questionsAsked: questions }),
    });
    if (!res.ok) return;
    setQuestions([]);
    void load();
  };

  const analyze = async () => {
    const res = await fetch("/api/debriefs/analyze", { method: "POST" });
    const d = await res.json();
    setAnalysis((d as { analysis?: string }).analysis ?? (d as { error?: string }).error ?? null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Interview debriefs</h1>
        <p className="mt-1 text-sm text-zinc-400">
          <span className="text-cyan-400/90">PRIVATE</span> to your account
        </p>
      </div>
      <Card className="space-y-2 border-zinc-800 bg-zinc-900/50 p-4">
        <p className="font-medium text-zinc-200">Log interview</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Firm" value={form.firmName} onChange={(e) => setForm((f) => ({ ...f, firmName: e.target.value }))} />
          <Input placeholder="Round" value={form.round} onChange={(e) => setForm((f) => ({ ...f, round: e.target.value }))} />
          <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          <Input placeholder="Outcome" value={form.outcome} onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))} />
        </div>
        <div className="flex gap-2">
          <Input placeholder="Question asked" value={qText} onChange={(e) => setQText(e.target.value)} />
          <Button type="button" size="sm" variant="outline" onClick={addQuestion}>
            Add Q
          </Button>
        </div>
        {questions.length ? (
          <ul className="list-inside list-disc text-sm text-zinc-400">
            {questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        ) : null}
        <textarea className="min-h-[60px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm" placeholder="Your answers" value={form.myAnswers} onChange={(e) => setForm((f) => ({ ...f, myAnswers: e.target.value }))} />
        <textarea className="min-h-[50px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm" placeholder="What went well" value={form.whatWentWell} onChange={(e) => setForm((f) => ({ ...f, whatWentWell: e.target.value }))} />
        <textarea className="min-h-[50px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm" placeholder="Improvements" value={form.improvements} onChange={(e) => setForm((f) => ({ ...f, improvements: e.target.value }))} />
        <Button size="sm" onClick={() => void save()}>
          Save debrief
        </Button>
      </Card>
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => void analyze()}>
          AI pattern analysis
        </Button>
      </div>
      {analysis ? <Card className="border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-300">{analysis}</Card> : null}
      <div className="space-y-2">
        {rows.map((r) => (
          <Card key={r.id} className="border-zinc-800 bg-zinc-900/40 p-3 text-sm">
            <p className="font-medium text-cyan-300">
              {r.firmName} · {r.round}
            </p>
            <p className="text-xs text-zinc-500">{r.date}</p>
            <p className="text-xs text-zinc-500">Outcome: {r.outcome ?? "—"}</p>
            <ul className="mt-1 list-inside list-disc text-zinc-400">
              {r.questionsAsked.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
