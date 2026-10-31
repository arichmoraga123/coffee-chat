"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

type QRow = {
  id: string;
  question: string;
  answer: string;
  category: string;
  subcategory: string | null;
  difficulty: string;
  tags: string[];
  source: string | null;
  status: string;
  submittedById: string | null;
  options: string[];
  correctIndex: number | null;
  explanation: string | null;
  lessonId: string | null;
  mcqEligible: boolean;
};

const padOptions = (o: string[]) => [0, 1, 2, 3].map((i) => o[i] ?? "");

export function AdminQuestionsPanel() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [status, setStatus] = useState("all");
  const [rows, setRows] = useState<QRow[]>([]);
  const [pending, setPending] = useState<QRow[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [edit, setEdit] = useState<QRow | null>(null);
  const [editErrors, setEditErrors] = useState<string[]>([]);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category !== "all") params.set("category", category);
    if (difficulty !== "all") params.set("difficulty", difficulty);
    if (status !== "all") params.set("status", status);
    const res = await fetch(`/api/admin/questions?${params.toString()}`);
    if (!res.ok) return;
    const data = (await res.json()) as { questions: QRow[] };
    setRows(data.questions);
  }, [q, category, difficulty, status]);

  const loadPending = useCallback(async () => {
    const res = await fetch("/api/admin/questions?status=pending");
    if (!res.ok) return;
    const data = (await res.json()) as { questions: QRow[] };
    setPending(data.questions);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  const approve = async (id: string) => {
    await fetch(`/api/admin/questions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });
    void load();
    void loadPending();
  };

  const reject = async (id: string) => {
    await fetch(`/api/admin/questions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    void loadPending();
    void load();
  };

  const openEdit = (r: QRow) => {
    setEditErrors([]);
    setEdit({ ...r, options: padOptions(r.options ?? []) });
  };

  const saveEdit = async () => {
    if (!edit) return;
    const res = await fetch(`/api/admin/questions/${edit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: edit.question,
        answer: edit.answer,
        category: edit.category,
        subcategory: edit.subcategory,
        difficulty: edit.difficulty,
        tags: edit.tags,
        source: edit.source,
        status: edit.status,
        mcqEligible: edit.mcqEligible,
        ...(edit.mcqEligible || edit.options.some((o) => o.trim())
          ? { options: edit.options, correctIndex: edit.correctIndex, explanation: edit.explanation ?? "" }
          : {}),
        lessonId: edit.lessonId ?? null,
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { errors?: string[]; error?: string };
      setEditErrors(data.errors ?? [data.error ?? "Save failed"]);
      return;
    }
    setEdit(null);
    void load();
    void loadPending();
  };

  const bulkImport = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(bulkText);
    } catch {
      alert("Invalid JSON");
      return;
    }
    const res = await fetch("/api/admin/questions/bulk-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions: parsed }),
    });
    if (!res.ok) {
      alert("Import failed");
      return;
    }
    const data = (await res.json()) as { inserted: number };
    alert(`Inserted ${data.inserted} (duplicates skipped)`);
    setBulkOpen(false);
    setBulkText("");
    void load();
  };

  const categories = Array.from(new Set(rows.map((r) => r.category))).sort();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
          Bulk import JSON
        </Button>
      </div>

      <Card className="border-amber-900/40 bg-amber-950/10 p-3">
        <p className="text-sm font-semibold text-amber-200">Pending submissions</p>
        <div className="mt-2 space-y-2 text-xs">
          {pending.length === 0 ? (
            <p className="text-zinc-500">None.</p>
          ) : (
            pending.map((p) => (
              <div key={p.id} className="flex flex-wrap items-start justify-between gap-2 rounded border border-zinc-800 p-2">
                <div className="min-w-0">
                  <p className="font-medium text-zinc-100">{p.question}</p>
                  <p className="mt-1 line-clamp-2 text-zinc-400">{p.answer}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => void approve(p.id)}>
                    Approve
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-400" onClick={() => void reject(p.id)}>
                    Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/40 p-3">
        <div className="mb-3 flex flex-wrap gap-2">
          <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <select
            className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            {["all", "Easy", "Medium", "Hard"].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {["all", "active", "pending", "rejected"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Apply
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-[11px]">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] uppercase text-zinc-500">
                <th className="py-2 pr-2">Question</th>
                <th className="py-2 pr-2">Cat</th>
                <th className="py-2 pr-2">Diff</th>
                <th className="py-2 pr-2">MCQ</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-zinc-800/80">
                  <td className="max-w-xs py-2 pr-2 align-top text-zinc-200">
                    <span className="line-clamp-2">{r.question}</span>
                  </td>
                  <td className="py-2 pr-2 align-top text-zinc-400">{r.category}</td>
                  <td className="py-2 pr-2 align-top text-zinc-400">{r.difficulty}</td>
                  <td className="py-2 pr-2 align-top text-zinc-400">
                    {r.mcqEligible ? `✓ ${r.lessonId ? r.lessonId.replace("-", ".") : ""}` : "—"}
                  </td>
                  <td className="py-2 pr-2 align-top text-zinc-400">{r.status}</td>
                  <td className="py-2 align-top">
                    <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400"
                      onClick={() =>
                        void (async () => {
                          if (!confirm("Permanently delete this question?")) return;
                          await fetch(`/api/admin/questions/${r.id}`, { method: "DELETE" });
                          await load();
                        })()
                      }
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="Bulk import questions (JSON array)">
        <textarea
          className="min-h-[200px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-xs text-zinc-100"
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder='[{"question":"...","answer":"...","category":"...","difficulty":"Medium","tags":["a"]}]'
        />
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setBulkOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => void bulkImport()}>Import</Button>
        </div>
      </Modal>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit question">
        {edit ? (
          <div className="space-y-2 text-xs">
            <textarea
              className="min-h-[80px] w-full rounded border border-zinc-700 bg-zinc-950 p-2"
              value={edit.question}
              onChange={(e) => setEdit({ ...edit, question: e.target.value })}
            />
            {edit.mcqEligible ? null : (
              <textarea
                className="min-h-[120px] w-full rounded border border-zinc-700 bg-zinc-950 p-2"
                value={edit.answer}
                placeholder="Flashcard answer"
                onChange={(e) => setEdit({ ...edit, answer: e.target.value })}
              />
            )}
            <label className="flex items-center gap-2 text-zinc-300">
              <input
                type="checkbox"
                checked={edit.mcqEligible}
                onChange={(e) => setEdit({ ...edit, mcqEligible: e.target.checked })}
              />
              Multiple choice (shows in Practice and the daily drill)
            </label>
            {edit.mcqEligible ? (
              <div className="space-y-1.5 rounded border border-zinc-800 p-2">
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">Options — select the correct one</p>
                {edit.options.map((o, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="correct"
                      className="mt-2"
                      checked={edit.correctIndex === i}
                      onChange={() => setEdit({ ...edit, correctIndex: i })}
                      aria-label={`Option ${"ABCD"[i]} is correct`}
                    />
                    <span className="mt-1.5 w-3 text-zinc-500">{"ABCD"[i]}</span>
                    <textarea
                      className="min-h-[38px] flex-1 rounded border border-zinc-700 bg-zinc-950 p-1.5"
                      value={o}
                      onChange={(e) => {
                        const options = [...edit.options];
                        options[i] = e.target.value;
                        setEdit({ ...edit, options });
                      }}
                    />
                  </div>
                ))}
                <textarea
                  className="min-h-[70px] w-full rounded border border-zinc-700 bg-zinc-950 p-2"
                  placeholder="Explanation (shown after answering)"
                  value={edit.explanation ?? ""}
                  onChange={(e) => setEdit({ ...edit, explanation: e.target.value })}
                />
              </div>
            ) : null}
            <div className="grid grid-cols-3 gap-2">
              <Input
                value={edit.category}
                placeholder="Category"
                onChange={(e) => setEdit({ ...edit, category: e.target.value })}
              />
              <select
                className="rounded border border-zinc-700 bg-zinc-950 px-2"
                value={edit.difficulty}
                onChange={(e) => setEdit({ ...edit, difficulty: e.target.value })}
              >
                {["Easy", "Medium", "Hard"].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
              <Input
                value={edit.lessonId ? edit.lessonId.replace("-", ".") : ""}
                placeholder="Lesson, e.g. 2.2"
                onChange={(e) => setEdit({ ...edit, lessonId: e.target.value || null })}
              />
            </div>
            <Input
              value={edit.tags.join(", ")}
              onChange={(e) =>
                setEdit({
                  ...edit,
                  tags: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
            />
            <select
              className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-2"
              value={edit.status}
              onChange={(e) => setEdit({ ...edit, status: e.target.value })}
            >
              {["active", "pending", "rejected"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {editErrors.length ? (
              <ul className="list-disc rounded border border-red-900 bg-red-950/40 p-2 pl-5 text-red-200">
                {editErrors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEdit(null)}>
                Cancel
              </Button>
              <Button onClick={() => void saveEdit()}>Save</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
