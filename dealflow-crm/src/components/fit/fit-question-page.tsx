"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Compass, Mic, Play, Sparkles, Square, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SearchSelect } from "@/components/ui/search-select";
import { assembleDraft, promptFor, speakingSeconds, storyMatchesThemes, targetSeconds, variantKind, wordCount, type FitQuestion } from "@/lib/fit";
import type { GroupProfile } from "@/lib/groupFinder";
import { wordDiff } from "@/lib/word-diff";
import { cn } from "@/lib/utils";

export type StoryLite = { id: string; slot: string; title: string; oneLiner: string | null; parts: { situation?: string; task?: string; action?: string; result?: string } | null };
type Interaction = { id: string; date: string; contact: string; firm: string; firstLine: string };
type Context = {
  interactions: Interaction[];
  hometown?: string | null;
  cityContacts?: { id: string; name: string; firm: string; location: string }[];
  groupFinder?: { date: string; top: { id: string; name: string; match: number }[] } | null;
};
type Answer = {
  builder: Record<string, string>;
  linkedStoryIds: string[];
  includedInteractionIds: string[];
  draft: string;
  feedback: Feedback | null;
  status: string;
  selfRating: string | null;
  versions: { id: string; draft: string; createdAt: string }[];
};
type Score = { score: number; comment: string };
type Feedback = {
  scores: { structure: Score; specificity: Score; authenticity: Score; length: Score; fit: Score };
  flags: { quote: string; suggestion: string }[];
  mustInclude: { item: string; present: boolean; note: string }[];
  summary: string;
  seconds: number;
  words: number;
  level: string;
};

const EMPTY: Answer = { builder: {}, linkedStoryIds: [], includedInteractionIds: [], draft: "", feedback: null, status: "not_started", selfRating: null, versions: [] };
const fmtSecs = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function FitQuestionPage({
  question,
  variant,
  onVariant,
  choices,
  stories,
  groups,
  basics,
  onSaved,
}: {
  question: FitQuestion;
  variant: string;
  onVariant: (v: string) => void;
  choices: { firm: string[]; city: string[]; group: string[] };
  stories: StoryLite[];
  groups: GroupProfile[];
  basics: { year: string | null; school: string | null; hometown: string | null; level: string };
  onSaved: (status: string) => void;
}) {
  const kind = variantKind(question);
  const [answer, setAnswer] = useState<Answer>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [ctx, setCtx] = useState<Context | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<{ unfilled: string[]; unused: string[]; missing: string[] } | null>(null);
  const [allStories, setAllStories] = useState(false);
  const [compare, setCompare] = useState<string[]>([]);
  const [hometown, setHometown] = useState(basics.hometown ?? "");
  const dirty = useRef(false);

  const needsVariant = Boolean(kind) && !variant;

  // Load the saved answer for this question + variant.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setNotes(null);
    setCompare([]);
    dirty.current = false;
    void fetch(`/api/fit/answers?questionId=${encodeURIComponent(question.id)}&variant=${encodeURIComponent(variant)}`)
      .then((r) => r.json())
      .then((d: { answer: (Answer & { feedback: unknown }) | null }) => {
        if (!alive) return;
        setAnswer(d.answer ? { ...EMPTY, ...d.answer, feedback: (d.answer.feedback as Feedback | null) ?? null } : EMPTY);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [question.id, variant]);

  // Pre-fill data from the rolodex / profile for firm, city and group questions.
  useEffect(() => {
    if (!kind) return setCtx(null);
    let alive = true;
    void fetch(`/api/fit/context?kind=${kind}&value=${encodeURIComponent(variant)}`)
      .then((r) => r.json())
      .then((d: Context) => alive && setCtx(d));
    return () => {
      alive = false;
    };
  }, [kind, variant]);

  const patch = (p: Partial<Answer>) => {
    dirty.current = true;
    setAnswer((a) => ({ ...a, ...p }));
  };

  const save = useCallback(
    async (next?: Answer, quiet = false) => {
      const a = next ?? answer;
      const res = await fetch("/api/fit/answers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, variant, builder: a.builder, linkedStoryIds: a.linkedStoryIds, includedInteractionIds: a.includedInteractionIds, draft: a.draft }),
      });
      if (!res.ok) return toast.error("Couldn't save.");
      const d = (await res.json()) as { answer: Answer };
      dirty.current = false;
      setAnswer((cur) => ({ ...cur, versions: d.answer.versions, status: d.answer.status }));
      onSaved(d.answer.status);
      if (!quiet) toast.success("Saved");
    },
    [answer, question.id, variant, onSaved],
  );

  const matchedStories = useMemo(() => stories.filter((s) => storyMatchesThemes(s, question.suggestedStoryThemes)), [stories, question.suggestedStoryThemes]);
  const shownStories = allStories || !matchedStories.length ? stories : matchedStories;
  const people = (ctx?.interactions ?? []).filter((i) => answer.includedInteractionIds.includes(i.id));
  const group = kind === "group" ? groups.find((g) => g.name === variant) : undefined;

  const linkStory = (s: StoryLite, on: boolean) => {
    const ids = on ? [...answer.linkedStoryIds, s.id] : answer.linkedStoryIds.filter((x) => x !== s.id);
    const builder = { ...answer.builder };
    if (on) {
      // The linked story's key details fill in empty builder fields.
      const keys = question.builderFields.map((f) => f.key);
      for (const part of ["situation", "task", "action", "result"] as const) {
        const v = s.parts?.[part];
        if (v && keys.includes(part) && !builder[part]?.trim()) builder[part] = v;
      }
      const empty = question.builderFields.find((f) => !builder[f.key]?.trim());
      if (empty && s.oneLiner && !Object.values(builder).some((v) => v.includes(s.oneLiner!))) builder[empty.key] = s.oneLiner;
    }
    patch({ linkedStoryIds: ids, builder });
  };

  const assemble = () => {
    const r = assembleDraft(question, answer.builder, { ...basics, hometown: hometown || basics.hometown, variant, variantKind: kind, people: people.map((p) => p.contact) });
    const next = { ...answer, draft: r.draft };
    setAnswer(next);
    setNotes({ unfilled: r.unfilled, unused: r.unused, missing: [] });
    void save(next, true);
  };

  const improve = async () => {
    setBusy("improve");
    try {
      const res = await fetch("/api/fit/answers/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, variant, builder: answer.builder, linkedStoryIds: answer.linkedStoryIds, includedInteractionIds: answer.includedInteractionIds, draft: answer.draft }),
      });
      const d = (await res.json()) as { draft?: string; missing?: string[]; error?: string };
      if (!res.ok || !d.draft) throw new Error(d.error ?? "AI failed");
      const next = { ...answer, draft: d.draft };
      setAnswer(next);
      setNotes({ unfilled: [], unused: [], missing: d.missing ?? [] });
      void save(next, true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const getFeedback = async () => {
    if (!answer.draft.trim()) return toast("Write or assemble a draft first.");
    setBusy("feedback");
    try {
      await save(undefined, true);
      const res = await fetch("/api/fit/answers/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, variant, builder: answer.builder, linkedStoryIds: answer.linkedStoryIds, includedInteractionIds: answer.includedInteractionIds, draft: answer.draft }),
      });
      const d = (await res.json()) as { feedback?: Feedback; error?: string };
      if (!res.ok || !d.feedback) throw new Error(d.error ?? "AI failed");
      setAnswer((a) => ({ ...a, feedback: d.feedback! }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const saveHometown = async () => {
    const res = await fetch("/api/user/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hometown }) });
    if (res.ok) toast.success("Hometown saved to your profile");
  };

  const target = targetSeconds(question);
  const secs = speakingSeconds(answer.draft);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-ink">{promptFor(question, variant)}</h2>
        {target ? <p className="mt-1 text-sm text-ink-2">Aim for {question.targetLengthSeconds} seconds.</p> : null}
      </div>

      {kind ? (
        <div className="max-w-md space-y-1">
          <span className="eyebrow block">{kind === "firm" ? "Which firm?" : kind === "city" ? "Which city?" : "Which group?"}</span>
          <SearchSelect
            ariaLabel={`Choose a ${kind}`}
            value={variant}
            placeholder={kind === "firm" ? "e.g. Houlihan Lokey" : kind === "city" ? "e.g. Chicago" : "e.g. Healthcare"}
            options={[...new Set([...choices[kind], ...(variant ? [variant] : [])])].map((v) => ({ value: v, label: v }))}
            onChange={(v) => onVariant(v)}
            onCreate={kind === "group" ? undefined : (label) => ({ value: label, label })}
          />
          <p className="text-[12px] text-ink-3">Each {kind} gets its own saved answer.</p>
        </div>
      ) : null}

      {kind === "group" ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius)] bg-accent-tint p-3 text-sm">
          <Compass className="h-4 w-4 text-accent" aria-hidden />
          <span className="text-ink-2">Not sure which group?</span>
          <Link href="/stories/group-finder" className="font-medium text-accent hover:underline">
            Take the 3-minute Group Finder
          </Link>
        </div>
      ) : null}

      {needsVariant ? (
        <p className="text-sm text-ink-3">Choose a {kind} above to start this answer.</p>
      ) : loading ? (
        <p className="text-sm text-ink-3">Loading…</p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="What they're testing">
              <p className="text-sm text-ink-2">{question.whatTheyreTesting}</p>
            </Card>
            <Card title="Framework">
              <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-2">
                {question.framework.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ol>
            </Card>
          </div>

          {group?.whyAngles?.length ? (
            <Card title={`Angles for "Why ${group.name}"`}>
              <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
                {group.whyAngles.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card title="Builder">
            {/* From the rolodex and profile */}
            {kind === "city" ? (
              <div className="mb-4 space-y-2 rounded-[var(--radius)] border border-border p-3">
                <p className="text-[13px] font-medium text-ink">Your ties to {variant}</p>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-ink-2">Hometown</span>
                  <input
                    value={hometown}
                    onChange={(e) => setHometown(e.target.value)}
                    onBlur={() => hometown !== (basics.hometown ?? "") && void saveHometown()}
                    placeholder="e.g. Grand Rapids, MI"
                    className="h-8 rounded-[var(--radius)] border border-border-strong bg-surface px-2 text-sm"
                    aria-label="Hometown"
                  />
                </div>
                {ctx?.cityContacts?.length ? (
                  <p className="text-[13px] text-ink-2">
                    Contacts in {variant}: {ctx.cityContacts.slice(0, 6).map((c) => `${c.name} (${c.firm})`).join(", ")}
                  </p>
                ) : (
                  <p className="text-[13px] text-ink-3">No contacts in {variant} yet.</p>
                )}
              </div>
            ) : null}
            {kind === "group" ? (
              <div className="mb-4 rounded-[var(--radius)] border border-border p-3 text-[13px]">
                {ctx?.groupFinder ? (
                  <p className="text-ink-2">
                    Your Group Finder ({ctx.groupFinder.date}): {ctx.groupFinder.top.map((t) => `${t.name} ${t.match}`).join(" · ")}
                  </p>
                ) : (
                  <p className="text-ink-3">
                    No Group Finder result yet. <Link href="/stories/group-finder" className="text-accent hover:underline">Take it</Link> to see which groups fit you.
                  </p>
                )}
              </div>
            ) : null}
            {kind && ctx ? (
              <div className="mb-4 rounded-[var(--radius)] border border-border p-3">
                <p className="mb-2 text-[13px] font-medium text-ink">
                  {kind === "firm" ? `People you spoke with at ${variant}` : kind === "group" ? `Conversations with people in ${variant}` : `Conversations with people in ${variant}`}
                </p>
                {ctx.interactions.length ? (
                  <ul className="space-y-1.5">
                    {ctx.interactions.map((i) => (
                      <li key={i.id}>
                        <label className="flex cursor-pointer items-start gap-2 text-[13px]">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]"
                            checked={answer.includedInteractionIds.includes(i.id)}
                            onChange={(e) =>
                              patch({ includedInteractionIds: e.target.checked ? [...answer.includedInteractionIds, i.id] : answer.includedInteractionIds.filter((x) => x !== i.id) })
                            }
                          />
                          <span className="min-w-0">
                            <span className="text-ink-3">{i.date}</span> · <span className="font-medium text-ink">{i.contact}</span>
                            {kind !== "firm" ? <span className="text-ink-3"> ({i.firm})</span> : null}
                            {i.firstLine ? <span className="block text-ink-2">{i.firstLine}</span> : null}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-ink-3">
                    Nothing logged yet. <Link href="/contacts" className="text-accent hover:underline">Log a conversation</Link> and it shows up here.
                  </p>
                )}
              </div>
            ) : null}

            {stories.length ? (
              <div className="mb-4 rounded-[var(--radius)] border border-border p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] font-medium text-ink">Use a story</p>
                  {matchedStories.length && matchedStories.length < stories.length ? (
                    <button type="button" className="text-[12px] text-accent hover:underline" onClick={() => setAllStories(!allStories)}>
                      {allStories ? "Show matching stories" : "Show all stories"}
                    </button>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {shownStories.map((s) => {
                    const on = answer.linkedStoryIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => linkStory(s, !on)}
                        className={cn("rounded-full border px-3 py-1 text-[13px]", on ? "border-accent bg-accent-tint text-accent" : "border-border-strong text-ink-2 hover:text-ink")}
                      >
                        {on ? <Check className="mr-1 inline h-3.5 w-3.5" aria-hidden /> : null}
                        {s.title || s.slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="mb-4 text-[13px] text-ink-3">
                Add stories in the <Link href="/stories" className="text-accent hover:underline">Stories</Link> tab to link them here.
              </p>
            )}

            <div className="space-y-4">
              {question.builderFields.map((f) => (
                <label key={f.key} className="block space-y-1">
                  <span className="text-sm font-medium text-ink">{f.label}</span>
                  {f.hint ? <span className="block text-[12px] text-ink-3">{f.hint}</span> : null}
                  <Textarea value={answer.builder[f.key] ?? ""} onChange={(e) => patch({ builder: { ...answer.builder, [f.key]: e.target.value } })} className="min-h-16" aria-label={f.label} />
                </label>
              ))}
            </div>
          </Card>

          <Card
            title="Draft"
            action={
              <span className={cn("text-[13px]", target && secs > target.max ? "text-warn" : "text-ink-3")}>
                {wordCount(answer.draft)} words · about {fmtSecs(secs)} spoken
              </span>
            }
          >
            <div className="mb-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={assemble}>
                <Wand2 className="h-4 w-4" aria-hidden /> Assemble draft
              </Button>
              <Button size="sm" variant="ghost" disabled={busy === "improve"} onClick={() => void improve()}>
                <Sparkles className="h-4 w-4" aria-hidden /> {busy === "improve" ? "Improving…" : "Improve with AI"}
              </Button>
            </div>
            <Textarea value={answer.draft} onChange={(e) => patch({ draft: e.target.value })} className="min-h-40" aria-label="Your draft" placeholder="Assemble a draft from the builder, or write your own." />
            {notes && (notes.unfilled.length || notes.unused.length || notes.missing.length) ? (
              <div className="mt-2 space-y-1 text-[13px] text-ink-2">
                {notes.unfilled.length ? <p>Still to fill: {notes.unfilled.map((u) => `[${u}]`).join(", ")}</p> : null}
                {notes.unused.length ? <p>Not placed in the template (add them where they fit): {notes.unused.join("; ")}</p> : null}
                {notes.missing.length ? <p>The AI marked these as missing: {notes.missing.join("; ")}</p> : null}
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="primary" onClick={() => void save()}>
                Save
              </Button>
              <Button size="sm" variant="secondary" disabled={busy === "feedback"} onClick={() => void getFeedback()}>
                {busy === "feedback" ? "Reading your draft…" : "Get feedback"}
              </Button>
            </div>
          </Card>

          {answer.feedback ? <FeedbackCard fb={answer.feedback} target={target} /> : null}

          <PracticePanel
            target={target}
            followUps={question.likelyFollowUps}
            onRate={async (rating) => {
              const res = await fetch("/api/fit/answers/practice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: question.id, variant, rating }) });
              if (res.ok) {
                setAnswer((a) => ({ ...a, status: "practiced", selfRating: rating }));
                onSaved("practiced");
                toast.success(rating === "nailed" ? "Marked as practiced" : "Marked to practice again");
              }
            }}
          />

          {answer.versions.length ? (
            <Card title="Versions">
              <ul className="space-y-1.5 text-sm">
                {answer.versions.map((v) => (
                  <li key={v.id} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-[var(--color-accent)]"
                      aria-label={`Compare version from ${new Date(v.createdAt).toLocaleString()}`}
                      checked={compare.includes(v.id)}
                      onChange={(e) => setCompare((c) => (e.target.checked ? [...c, v.id].slice(-2) : c.filter((x) => x !== v.id)))}
                    />
                    <span className="min-w-0">
                      <span className="text-ink-3">{new Date(v.createdAt).toLocaleString()}</span>
                      <span className="block truncate text-ink-2">{v.draft.slice(0, 140)}</span>
                    </span>
                  </li>
                ))}
              </ul>
              {compare.length === 2 ? <VersionCompare a={answer.versions.find((v) => v.id === compare[1])!} b={answer.versions.find((v) => v.id === compare[0])!} /> : <p className="mt-2 text-[12px] text-ink-3">Tick two versions to compare them.</p>}
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}

function FeedbackCard({ fb, target }: { fb: Feedback; target: { min: number; max: number } | null }) {
  const rows: [string, Score][] = [
    ["Structure", fb.scores.structure],
    ["Specificity", fb.scores.specificity],
    ["Authenticity", fb.scores.authenticity],
    ["Length", fb.scores.length],
    ["Fit to the question", fb.scores.fit],
  ];
  return (
    <Card title="Feedback" action={<span className="text-[13px] text-ink-3">Graded as {fb.level}</span>}>
      {fb.summary ? <p className="mb-3 text-sm text-ink">{fb.summary}</p> : null}
      <p className={cn("mb-3 text-[13px]", target && fb.seconds > target.max ? "text-warn" : "text-ink-2")}>
        About {fmtSecs(fb.seconds)} spoken ({fb.words} words){target ? ` · target ${target.min}–${target.max} seconds` : ""}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {rows.map(([name, s]) => (
          <li key={name} className="rounded-[var(--radius)] border border-border p-2.5">
            <p className="flex items-center justify-between text-sm font-medium text-ink">
              {name} <span className="tabular-nums">{s.score}/5</span>
            </p>
            <p className="mt-0.5 text-[13px] text-ink-2">{s.comment}</p>
          </li>
        ))}
      </ul>
      {fb.flags.length ? (
        <div className="mt-4">
          <p className="mb-1 text-sm font-medium text-ink">Phrases to replace</p>
          <ul className="space-y-1 text-[13px]">
            {fb.flags.map((f, i) => (
              <li key={i}>
                <span className="text-warn">“{f.quote}”</span> → <span className="text-ink-2">{f.suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-4">
        <p className="mb-1 text-sm font-medium text-ink">Must include</p>
        <ul className="space-y-1 text-[13px]">
          {fb.mustInclude.map((m) => (
            <li key={m.item} className="flex gap-2">
              {m.present ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label="Present" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-label="Missing" />}
              <span>
                <span className="text-ink">{m.item}</span>
                {m.note ? <span className="text-ink-3"> — {m.note}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function PracticePanel({ target, followUps, onRate }: { target: { min: number; max: number } | null; followUps: string[]; onRate: (r: "nailed" | "needs_work") => void }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [record, setRecord] = useState(false);
  const [audio, setAudio] = useState<string | null>(null);
  const started = useRef(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setElapsed(Math.floor((performance.now() - started.current) / 1000)), 250);
    return () => window.clearInterval(t);
  }, [running]);
  useEffect(() => () => void (audio && URL.revokeObjectURL(audio)), [audio]);

  const start = async () => {
    setDone(false);
    setElapsed(0);
    if (audio) URL.revokeObjectURL(audio);
    setAudio(null);
    if (record && typeof MediaRecorder !== "undefined") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const r = new MediaRecorder(stream);
        chunks.current = [];
        r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
        r.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          setAudio(URL.createObjectURL(new Blob(chunks.current, { type: r.mimeType })));
        };
        r.start();
        recorder.current = r;
      } catch {
        toast.error("Couldn't use the microphone — practicing without recording.");
      }
    }
    started.current = performance.now();
    setRunning(true);
  };
  const stop = () => {
    setRunning(false);
    setDone(true);
    recorder.current?.stop();
    recorder.current = null;
  };
  const over = target && elapsed > target.max;

  return (
    <Card title="Practice out loud">
      <div className="flex flex-wrap items-center gap-4">
        <span className={cn("text-3xl font-semibold tabular-nums", over ? "text-warn" : "text-ink")} aria-live="polite">
          {fmtSecs(elapsed)}
        </span>
        {running ? (
          <Button variant="secondary" onClick={stop}>
            <Square className="h-4 w-4" aria-hidden /> Stop
          </Button>
        ) : (
          <Button variant="primary" onClick={() => void start()}>
            <Play className="h-4 w-4" aria-hidden /> Start timer
          </Button>
        )}
        <label className="inline-flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" className="h-4 w-4 accent-[var(--color-accent)]" checked={record} disabled={running} onChange={(e) => setRecord(e.target.checked)} />
          <Mic className="h-4 w-4" aria-hidden /> Record myself
        </label>
      </div>
      <p className="mt-2 text-[12px] text-ink-3">
        {target ? `Turns amber after ${target.max} seconds. ` : ""}Recordings stay in this browser tab only. They are never uploaded and disappear when you leave the page.
      </p>
      {audio ? <audio controls src={audio} className="mt-3 w-full" /> : null}
      {done ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={() => onRate("nailed")}>
              I nailed it
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onRate("needs_work")}>
              Needs work
            </Button>
          </div>
          {followUps.length ? (
            <div>
              <p className="mb-1 text-sm font-medium text-ink">Likely follow-ups</p>
              <ul className="list-disc space-y-1 pl-5 text-[13px] text-ink-2">
                {followUps.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function VersionCompare({ a, b }: { a: { draft: string; createdAt: string }; b: { draft: string; createdAt: string } }) {
  const [older, newer] = new Date(a.createdAt) <= new Date(b.createdAt) ? [a, b] : [b, a];
  const parts = wordDiff(older.draft, newer.draft);
  return (
    <div className="mt-3 rounded-[var(--radius)] border border-border p-3">
      <p className="mb-2 text-[12px] text-ink-3">
        {new Date(older.createdAt).toLocaleString()} → {new Date(newer.createdAt).toLocaleString()}
      </p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">
        {parts.map((p, i) => (
          <span key={i} className={p.kind === "added" ? "bg-success-bg text-success" : p.kind === "removed" ? "bg-danger-bg text-danger line-through" : "text-ink"}>
            {p.text}
          </span>
        ))}
      </p>
    </div>
  );
}
