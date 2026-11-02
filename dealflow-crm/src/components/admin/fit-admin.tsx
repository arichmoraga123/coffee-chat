"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Plus, Trash2, X } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchSelect } from "@/components/ui/search-select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { FitData, FitQuestion } from "@/lib/fit";
import { computeMaxScores, scoreGroupFinder, type FinderQuestion, type GroupFinderData, type GroupProfile } from "@/lib/groupFinder";
import { GROUP_FINDER_PERSONAS } from "@/lib/groupFinderPersonas";
import { cn } from "@/lib/utils";

type Tab = "questions" | "groups" | "weights";
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const commas = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

async function put(body: unknown): Promise<boolean> {
  const res = await fetch("/api/admin/fit", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) toast.error(d.error ?? "Couldn't save.");
  return res.ok;
}

export function FitAdmin({ fit, finder }: { fit: FitData; finder: GroupFinderData }) {
  const [tab, setTab] = useState<Tab>("questions");
  return (
    <div className="space-y-6">
      <Tabs
        items={[
          { value: "questions", label: "Fit questions", active: tab === "questions" },
          { value: "groups", label: "Group profiles", active: tab === "groups" },
          { value: "weights", label: "Questionnaire weights", active: tab === "weights" },
        ]}
        onSelect={(v) => setTab(v as Tab)}
      />
      {tab === "questions" ? <QuestionsEditor fit={fit} /> : tab === "groups" ? <GroupsEditor finder={finder} /> : <WeightsEditor finder={finder} />}
    </div>
  );
}

/* ───────── fit questions ───────── */

const blankQuestion = (category: string): FitQuestion => ({
  id: "",
  category,
  prompt: "",
  whatTheyreTesting: "",
  framework: [],
  mustInclude: [],
  avoid: [],
  builderFields: [{ key: "point1", label: "", hint: "" }],
  outlineTemplate: "",
  likelyFollowUps: [],
  suggestedStoryThemes: [],
  targetLengthSeconds: "60–90",
});

function QuestionsEditor({ fit }: { fit: FitData }) {
  const router = useRouter();
  const [id, setId] = useState(fit.questions[0]?.id ?? "");
  const [draft, setDraft] = useState<FitQuestion | null>(fit.questions[0] ?? null);
  const [isNew, setIsNew] = useState(false);
  const pick = (qid: string) => {
    setId(qid);
    setIsNew(false);
    setDraft(fit.questions.find((q) => q.id === qid) ?? null);
  };
  const save = async () => {
    if (!draft) return;
    if (await put({ kind: "question", data: { ...draft, builderFields: draft.builderFields.map((f) => ({ ...f, hint: f.hint || undefined })) } })) {
      toast.success("Saved");
      setIsNew(false);
      setId(draft.id);
      router.refresh();
    }
  };
  const archive = async () => {
    if (!draft || !window.confirm(`Archive "${draft.prompt}"? Students' saved answers are kept.`)) return;
    const res = await fetch(`/api/admin/fit?id=question:${draft.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Archived");
      router.refresh();
    }
  };
  const set = (p: Partial<FitQuestion>) => setDraft((d) => (d ? { ...d, ...p } : d));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full max-w-md">
          <SearchSelect
            ariaLabel="Question"
            value={isNew ? "" : id}
            onChange={pick}
            options={fit.questions.map((q) => ({ value: q.id, label: q.prompt, sublabel: q.category }))}
            placeholder="Choose a question"
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setIsNew(true);
            setDraft(blankQuestion(fit.categories[0]));
          }}
        >
          <Plus className="h-4 w-4" aria-hidden /> New question
        </Button>
      </div>
      {draft ? (
        <Card key={isNew ? "new" : id}>
          <div className="grid gap-4 p-5">
            <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)_140px]">
              <Field label="Id">
                <Input value={draft.id} disabled={!isNew} onChange={(e) => set({ id: e.target.value })} placeholder="why-ib" />
              </Field>
              <Field label="Category">
                <SearchSelect ariaLabel="Category" value={draft.category} onChange={(v) => set({ category: v })} options={fit.categories.map((c) => ({ value: c, label: c }))} />
              </Field>
              <Field label="Target seconds">
                <Input value={draft.targetLengthSeconds} onChange={(e) => set({ targetLengthSeconds: e.target.value })} placeholder="60–90" />
              </Field>
            </div>
            <Field label="Prompt" hint="Use [city], [group] or [firm] to make students pick one.">
              <Input value={draft.prompt} onChange={(e) => set({ prompt: e.target.value })} />
            </Field>
            <Field label="What they're testing">
              <Textarea value={draft.whatTheyreTesting} onChange={(e) => set({ whatTheyreTesting: e.target.value })} className="min-h-16" />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <ListField label="Framework steps" value={draft.framework} onChange={(v) => set({ framework: v })} />
              <ListField label="Must include" value={draft.mustInclude} onChange={(v) => set({ mustInclude: v })} />
              <ListField label="Avoid" value={draft.avoid} onChange={(v) => set({ avoid: v })} />
              <ListField label="Likely follow-ups" value={draft.likelyFollowUps} onChange={(v) => set({ likelyFollowUps: v })} />
            </div>
            <Field label="Builder fields">
              <div className="space-y-2">
                {draft.builderFields.map((f, i) => (
                  <div key={i} className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <Input aria-label="Key" value={f.key} onChange={(e) => set({ builderFields: draft.builderFields.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)) })} placeholder="key" />
                    <Input aria-label="Label" value={f.label} onChange={(e) => set({ builderFields: draft.builderFields.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} placeholder="Label" />
                    <Input aria-label="Hint" value={f.hint ?? ""} onChange={(e) => set({ builderFields: draft.builderFields.map((x, j) => (j === i ? { ...x, hint: e.target.value } : x)) })} placeholder="Hint (optional)" />
                    <Button variant="ghost" size="sm" aria-label="Remove field" onClick={() => set({ builderFields: draft.builderFields.filter((_, j) => j !== i) })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={() => set({ builderFields: [...draft.builderFields, { key: `point${draft.builderFields.length + 1}`, label: "", hint: "" }] })}>
                  <Plus className="h-4 w-4" aria-hidden /> Add field
                </Button>
              </div>
            </Field>
            <Field label="Outline template" hint="[key] fills from the builder field with that key; [year], [school], [hometown], [city], [group], [firm] fill from the profile and choice.">
              <Textarea value={draft.outlineTemplate} onChange={(e) => set({ outlineTemplate: e.target.value })} className="min-h-20" />
            </Field>
            <Field label="Suggested story themes" hint="Comma-separated, e.g. leadership, teamwork">
              <Input value={draft.suggestedStoryThemes.join(", ")} onChange={(e) => set({ suggestedStoryThemes: commas(e.target.value) })} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => void save()}>
                Save question
              </Button>
              {!isNew ? (
                <Button variant="ghost" onClick={() => void archive()}>
                  Archive
                </Button>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

/* ───────── group profiles ───────── */

function GroupsEditor({ finder }: { finder: GroupFinderData }) {
  const router = useRouter();
  const [id, setId] = useState(finder.groups[0]?.id ?? "");
  const [draft, setDraft] = useState<GroupProfile | null>(finder.groups[0] ?? null);
  const [isNew, setIsNew] = useState(false);
  const set = (p: Partial<GroupProfile>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const save = async () => {
    if (draft && (await put({ kind: "group", data: draft }))) {
      toast.success("Saved");
      setIsNew(false);
      setId(draft.id);
      router.refresh();
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full max-w-md">
          <SearchSelect
            ariaLabel="Group"
            value={isNew ? "" : id}
            onChange={(v) => {
              setId(v);
              setIsNew(false);
              setDraft(finder.groups.find((g) => g.id === v) ?? null);
            }}
            options={finder.groups.map((g) => ({ value: g.id, label: g.name }))}
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setIsNew(true);
            setDraft({ id: "", name: "", type: "coverage", oneLiner: "", whatYouDo: "", typicalDeals: [], skills: [], goodFitIf: [], tradeoffs: [], relatedLessons: [], hubs: [], whyAngles: [], questionsToAskBankers: [] });
          }}
        >
          <Plus className="h-4 w-4" aria-hidden /> New group
        </Button>
      </div>
      {draft ? (
        <Card key={isNew ? "new" : id}>
          <div className="grid gap-4 p-5">
            <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)_auto]">
              <Field label="Id">
                <Input value={draft.id} disabled={!isNew} onChange={(e) => set({ id: e.target.value })} placeholder="tmt" />
              </Field>
              <Field label="Name">
                <Input value={draft.name} onChange={(e) => set({ name: e.target.value })} />
              </Field>
              <Field label="Type">
                <SegmentedControl
                  ariaLabel="Type"
                  value={draft.type === "product" ? "product" : "coverage"}
                  onChange={(v) => set({ type: v })}
                  options={[
                    { value: "coverage", label: "Coverage" },
                    { value: "product", label: "Product" },
                  ]}
                />
              </Field>
            </div>
            <Field label="One-liner">
              <Input value={draft.oneLiner} onChange={(e) => set({ oneLiner: e.target.value })} />
            </Field>
            <Field label="What you'd do">
              <Textarea value={draft.whatYouDo} onChange={(e) => set({ whatYouDo: e.target.value })} className="min-h-16" />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <ListField label="Typical deals" value={draft.typicalDeals} onChange={(v) => set({ typicalDeals: v })} />
              <ListField label="Skills" value={draft.skills} onChange={(v) => set({ skills: v })} />
              <ListField label="Good fit if" value={draft.goodFitIf} onChange={(v) => set({ goodFitIf: v })} />
              <ListField label="Trade-offs" value={draft.tradeoffs} onChange={(v) => set({ tradeoffs: v })} />
              <ListField label={'"Why this group" angles'} value={draft.whyAngles} onChange={(v) => set({ whyAngles: v })} />
              <ListField label="Questions to ask bankers" value={draft.questionsToAskBankers} onChange={(v) => set({ questionsToAskBankers: v })} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Common hubs" hint="Comma-separated">
                <Input value={draft.hubs.join(", ")} onChange={(e) => set({ hubs: commas(e.target.value) })} />
              </Field>
              <Field label="Related lessons" hint="Comma-separated, e.g. 10.4, 3.2">
                <Input value={draft.relatedLessons.join(", ")} onChange={(e) => set({ relatedLessons: commas(e.target.value) })} />
              </Field>
            </div>
            <div>
              <Button variant="primary" onClick={() => void save()}>
                Save group
              </Button>
              {isNew ? <p className="mt-2 text-[12px] text-ink-3">New groups score 0 until you give them weights in the Questionnaire weights tab.</p> : null}
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

/* ───────── questionnaire weights ───────── */

function WeightsEditor({ finder }: { finder: GroupFinderData }) {
  const router = useRouter();
  const [questions, setQuestions] = useState<FinderQuestion[]>(() => structuredClone(finder.questions));
  const [results, setResults] = useState<{ name: string; expect: string; got: string; match: number; ok: boolean }[] | null>(null);
  const groups = finder.groups;
  const maxScores = useMemo(() => computeMaxScores(questions, groups.map((g) => g.id)), [questions, groups]);

  const setWeight = (qi: number, oi: number, g: string, v: number) =>
    setQuestions((qs) =>
      qs.map((q, i) =>
        i !== qi
          ? q
          : {
              ...q,
              options: q.options.map((o, j) => {
                if (j !== oi) return o;
                const w = { ...o.weights };
                if (v) w[g] = v;
                else delete w[g];
                return { ...o, weights: w };
              }),
            },
      ),
    );

  const runPersonas = () => {
    const data = { ...finder, questions, maxScores };
    setResults(
      GROUP_FINDER_PERSONAS.map((p) => {
        const top = scoreGroupFinder(p.answers, data)[0];
        return { name: p.name, expect: groups.find((g) => g.id === p.expect)?.name ?? p.expect, got: top.name, match: top.match, ok: top.id === p.expect };
      }),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          onClick={async () => {
            if (await put({ kind: "finder", data: { questions } })) {
              toast.success("Weights saved");
              router.refresh();
            }
          }}
        >
          Save weights
        </Button>
        <Button variant="secondary" onClick={runPersonas}>
          Run persona tests
        </Button>
        <span className="text-[12px] text-ink-3">Each cell is 0–3. Max scores update from the weights automatically.</span>
      </div>
      {results ? (
        <Card title="Persona tests">
          <ul className="space-y-1 text-sm">
            {results.map((r) => (
              <li key={r.name} className="flex items-center gap-2">
                {r.ok ? <Check className="h-4 w-4 text-success" aria-label="Pass" /> : <X className="h-4 w-4 text-danger" aria-label="Fail" />}
                <span className="text-ink">{r.name}</span>
                <span className="text-ink-3">
                  → {r.got} ({r.match}){r.ok ? "" : `, expected ${r.expect}`}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-surface">
        <table className="w-full min-w-[1100px] border-collapse text-left text-[13px]">
          <thead className="sticky top-0 bg-surface-2">
            <tr>
              <th className="px-3 py-2 text-xs font-semibold text-ink-3">Question · option</th>
              {groups.map((g) => (
                <th key={g.id} className="px-1 py-2 text-center text-[11px] font-semibold uppercase text-ink-3" title={g.name}>
                  {g.id}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {questions.map((q, qi) => (
              <QuestionRows key={q.id} q={q} qi={qi} groups={groups} setWeight={setWeight} />
            ))}
            <tr className="border-t-2 border-border bg-surface-2">
              <td className="px-3 py-2 text-xs font-semibold text-ink-3">Max score</td>
              {groups.map((g) => (
                <td key={g.id} className="px-1 py-2 text-center tabular-nums text-ink-2">
                  {maxScores[g.id]}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuestionRows({ q, qi, groups, setWeight }: { q: FinderQuestion; qi: number; groups: GroupProfile[]; setWeight: (qi: number, oi: number, g: string, v: number) => void }) {
  return (
    <>
      <tr className="border-t border-border">
        <td colSpan={groups.length + 1} className="px-3 pt-3 text-xs font-semibold text-ink">
          {q.id}. {q.prompt}
          {q.weight !== undefined && q.weight !== 1 ? <span className="font-normal text-ink-3"> (question weight {q.weight})</span> : null}
        </td>
      </tr>
      {q.options.map((o, oi) => (
        <tr key={oi} className="border-t border-divider">
          <td className="max-w-[320px] px-3 py-1 text-ink-2">{o.label}</td>
          {groups.map((g) => {
            const v = o.weights[g.id] ?? 0;
            return (
              <td key={g.id} className="px-0.5 py-0.5 text-center">
                <input
                  type="number"
                  min={0}
                  max={3}
                  step={1}
                  value={v}
                  aria-label={`${q.id} ${o.label} → ${g.name}`}
                  onChange={(e) => setWeight(qi, oi, g.id, Math.max(0, Math.min(3, Math.round(Number(e.target.value) || 0))))}
                  className={cn("h-7 w-11 rounded border border-border bg-surface text-center tabular-nums", v ? "font-semibold text-accent" : "text-ink-3")}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

/* ───────── small form pieces ───────── */

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0 space-y-1">
      <span className="text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {hint ? <span className="block text-[12px] text-ink-3">{hint}</span> : null}
    </label>
  );
}

function ListField({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(value.join("\n"));
  return (
    <Field label={label} hint="One per line">
      <Textarea value={text} onChange={(e) => setText(e.target.value)} onBlur={() => onChange(lines(text))} className="min-h-24" />
    </Field>
  );
}
