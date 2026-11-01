"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";

type Mod = { module: number; title: string; lessons: { id: string; title: string }[] };

export function NewChallengeForm({ members, modules, initialTo, conversationId }: { members: { id: string; name: string }[]; modules: Mod[]; initialTo: string; conversationId?: string }) {
  const router = useRouter();
  const [to, setTo] = useState(initialTo);
  const [mode, setMode] = useState<"async" | "live">("async");
  const [length, setLength] = useState<"5" | "10">("5");
  const [mod, setMod] = useState("mixed");
  const [lesson, setLesson] = useState("all");
  const [difficulty, setDifficulty] = useState<"any" | "Easy" | "Medium" | "Hard">("any");
  const [busy, setBusy] = useState(false);
  const lessons = useMemo(() => modules.find((m) => String(m.module) === mod)?.lessons ?? [], [modules, mod]);

  const submit = async () => {
    if (!to) return toast.error("Pick who to challenge.");
    setBusy(true);
    const topic: Record<string, unknown> = {};
    if (lesson !== "all") topic.lessons = [lesson];
    else if (mod !== "mixed") topic.modules = [Number(mod)];
    if (difficulty !== "any") topic.difficulty = difficulty;
    const res = await fetch("/api/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, mode, length: Number(length), topic, conversationId }),
    });
    const d = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
    setBusy(false);
    if (!res.ok || !d.id) return toast.error(d.error ?? "Couldn't create the challenge.");
    toast("Challenge sent");
    router.push(`/challenges/${d.id}`);
  };

  return (
    <Card className="space-y-5 p-6">
      <label className="block space-y-1">
        <span className="eyebrow block">Opponent</span>
        <Select value={to} onChange={(e) => setTo(e.target.value)} className="w-full">
          <option value="">Pick a member</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="eyebrow block">Topic</span>
          <Select
            value={mod}
            onChange={(e) => {
              setMod(e.target.value);
              setLesson("all");
            }}
            className="w-full"
          >
            <option value="mixed">Mixed (all modules)</option>
            {modules.map((m) => (
              <option key={m.module} value={m.module}>
                {m.module}. {m.title}
              </option>
            ))}
          </Select>
        </label>
        <label className="block space-y-1">
          <span className="eyebrow block">Lesson</span>
          <Select value={lesson} onChange={(e) => setLesson(e.target.value)} disabled={mod === "mixed"} className="w-full">
            <option value="all">Whole module</option>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.id.replace("-", ".")} {l.title}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <div className="flex flex-wrap gap-6">
        <div className="space-y-1">
          <span className="eyebrow block">Length</span>
          <SegmentedControl ariaLabel="Length" value={length} onChange={setLength} options={[{ value: "5", label: "5 questions" }, { value: "10", label: "10 questions" }]} />
        </div>
        <div className="space-y-1">
          <span className="eyebrow block">Difficulty</span>
          <SegmentedControl
            ariaLabel="Difficulty"
            value={difficulty}
            onChange={setDifficulty}
            options={[{ value: "any", label: "Any" }, { value: "Easy", label: "Easy" }, { value: "Medium", label: "Medium" }, { value: "Hard", label: "Hard" }]}
          />
        </div>
      </div>
      <div className="space-y-1">
        <span className="eyebrow block">Format</span>
        <SegmentedControl ariaLabel="Format" value={mode} onChange={setMode} options={[{ value: "async", label: "Play on your own time" }, { value: "live", label: "Live duel" }]} />
        <p className="pt-1 text-[13px] text-ink-3">
          {mode === "async"
            ? "You both answer the same questions within 48 hours. Most correct wins; ties go to the faster total time."
            : "You both press Ready, then answer together with 30 seconds per question."}
        </p>
      </div>
      <Button variant="primary" disabled={busy} onClick={() => void submit()}>
        {busy ? "Sending…" : "Send challenge"}
      </Button>
    </Card>
  );
}
