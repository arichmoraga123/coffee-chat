"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

export function QuestionSubmitDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/questions/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        answer,
        category,
        difficulty,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Failed to submit");
      return;
    }
    setOpen(false);
    setQuestion("");
    setAnswer("");
    setCategory("");
    setDifficulty("Medium");
    setTags("");
    router.refresh();
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Submit a Question
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Submit a question">
        <div className="space-y-3 text-sm">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Question</label>
            <textarea
              className="min-h-[80px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-zinc-100"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Answer</label>
            <textarea
              className="min-h-[100px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-zinc-100"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Category</label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Difficulty</label>
              <select
                className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                {["Easy", "Medium", "Hard"].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Tags (comma-separated)</label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="LBO, credit" />
          </div>
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={busy}>
              {busy ? "Submitting…" : "Submit for review"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
