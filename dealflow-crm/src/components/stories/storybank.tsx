"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { BEHAVIORAL_QUESTIONS, STORY_SLOTS, type PolishedStory, type StoryQuestion } from "@/lib/storybank";


type Story = {
  id: string;
  slot: string;
  title: string;
  rawText: string;
  polished: (PolishedStory & { followUps?: string[] }) | null;
  questions: StoryQuestion[];
  feedback: string | null;
};

const status = (s: Story | undefined) => (!s || !s.rawText.trim() ? "empty" : s.polished ? "ready" : "draft");

export function Storybank({ initial }: { initial: Story[] }) {
  const [stories, setStories] = useState<Story[]>(initial);
  const [open, setOpen] = useState<string | null>(() => STORY_SLOTS.find((s) => status(initial.find((x) => x.slot === s.id)) !== "ready")?.id ?? null);

  const upsertLocal = (s: Story) => setStories((list) => (list.some((x) => x.id === s.id) ? list.map((x) => (x.id === s.id ? s : x)) : [...list, s]));

  const bySlot = (slot: string) => stories.find((s) => s.slot === slot);
  const ready = STORY_SLOTS.filter((s) => status(bySlot(s.id)) === "ready").length;

  // Which polished story covers each common question (first/strongest match wins).
  const coverage = useMemo(() => {
    const map = new Map<string, { story: Story; angle: string }>();
    for (const s of stories) {
      if (!s.polished) continue;
      for (const q of s.questions) if (!map.has(q.question)) map.set(q.question, { story: s, angle: q.angle });
    }
    return map;
  }, [stories]);

  const addCustom = async () => {
    const res = await fetch("/api/stories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slot: "custom", rawText: "" }) });
    const d = (await res.json().catch(() => ({}))) as { story?: Story; error?: string };
    if (!res.ok || !d.story) return toast.error(d.error ?? "Couldn't add a story.");
    upsertLocal({ ...d.story, questions: [] });
    setOpen(d.story.id);
  };

  const customs = stories.filter((s) => s.slot === "custom");

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-3">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink">
              <span className="font-semibold">{ready} of 6</span> core stories ready
            </p>
            <span className="text-[13px] text-ink-3">Covers {coverage.size} of {BEHAVIORAL_QUESTIONS.length} common questions</span>
          </div>
          <ProgressBar value={ready} max={6} className="mt-3" />
          <p className="mt-3 text-[13px] text-ink-3">
            Write each story messily, like you&apos;re telling a friend: what happened, what you did, how it turned out. Then press Clean it up. Nothing is
            invented; the AI only uses what you wrote and tells you what&apos;s missing.
          </p>
        </Card>

        {STORY_SLOTS.map((slot) => (
          <StoryCard
            key={slot.id}
            slotId={slot.id}
            heading={slot.title}
            prompt={slot.prompt}
            jogs={slot.jogs}
            story={bySlot(slot.id)}
            open={open === slot.id}
            onToggle={() => setOpen(open === slot.id ? null : slot.id)}
            onChange={upsertLocal}
          />
        ))}
        {customs.map((s, i) => (
          <StoryCard
            key={s.id}
            slotId="custom"
            heading={s.title || `Extra story ${i + 1}`}
            prompt="Any other experience worth having ready (a job, a deal you followed, a personal challenge)."
            jogs={[]}
            story={s}
            open={open === s.id}
            onToggle={() => setOpen(open === s.id ? null : s.id)}
            onChange={upsertLocal}
            onDelete={async () => {
              if (!confirm("Delete this story?")) return;
              await fetch(`/api/stories/${s.id}`, { method: "DELETE" });
              setStories((list) => list.filter((x) => x.id !== s.id));
            }}
          />
        ))}
        <Button variant="secondary" onClick={() => void addCustom()}>
          Add another story
        </Button>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-8 xl:h-fit">
        <Card title="Question coverage">
          <ul className="max-h-[70vh] space-y-2.5 overflow-y-auto pr-1">
            {BEHAVIORAL_QUESTIONS.map((q) => {
              const hit = coverage.get(q);
              return (
                <li key={q} className="text-[13px]">
                  <p className="text-ink">{q}</p>
                  {hit ? (
                    <p className="text-success">
                      → {hit.story.polished?.title || hit.story.title}
                      <span className="block text-ink-3">{hit.angle}</span>
                    </p>
                  ) : (
                    <p className="text-warn">No story yet</p>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      </aside>
    </div>
  );
}

function StoryCard({
  slotId,
  heading,
  prompt,
  jogs,
  story,
  open,
  onToggle,
  onChange,
  onDelete,
}: {
  slotId: string;
  heading: string;
  prompt: string;
  jogs: string[];
  story: Story | undefined;
  open: boolean;
  onToggle: () => void;
  onChange: (s: Story) => void;
  onDelete?: () => void;
}) {
  const [raw, setRaw] = useState(story?.rawText ?? "");
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [polishing, setPolishing] = useState(false);
  const [tab, setTab] = useState<"spoken" | "star" | "questions" | "coach">("spoken");
  const idRef = useRef(story?.id ?? null);
  const st = status(story);

  // Autosave the brain dump.
  const save = useCallback(
    async (text: string) => {
      setSaving("saving");
      const res = idRef.current
        ? await fetch(`/api/stories/${idRef.current}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rawText: text }) })
        : await fetch("/api/stories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slot: slotId, rawText: text }) });
      const d = (await res.json().catch(() => ({}))) as { story?: Story };
      if (res.ok && d.story) {
        idRef.current = d.story.id;
        onChange({ ...d.story, questions: (d.story.questions as StoryQuestion[]) ?? [] });
        setSaving("saved");
      } else setSaving("idle");
    },
    [slotId, onChange],
  );

  useEffect(() => {
    if (raw === (story?.rawText ?? "")) return;
    const t = window.setTimeout(() => void save(raw), 900);
    return () => window.clearTimeout(t);
  }, [raw, story?.rawText, save]);

  const polish = async () => {
    if (raw !== (story?.rawText ?? "")) await save(raw);
    if (!idRef.current) return;
    setPolishing(true);
    const res = await fetch(`/api/stories/${idRef.current}/polish`, { method: "POST" });
    setPolishing(false);
    const d = (await res.json().catch(() => ({}))) as { story?: Story; error?: string };
    if (!res.ok || !d.story) return toast.error(d.error ?? "Couldn't clean it up.");
    onChange({ ...d.story, questions: (d.story.questions as StoryQuestion[]) ?? [] });
    setTab("spoken");
    toast("Story cleaned up");
  };

  const words = raw.trim().split(/\s+/).filter(Boolean).length;
  const p = story?.polished;

  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-surface">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-h-14 w-full items-center gap-3 px-5 py-3 text-left">
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-ink">
            {heading}
            {p?.title && slotId !== "custom" ? <span className="font-normal text-ink-3"> · {p.title}</span> : null}
          </span>
          <span className="block text-[13px] text-ink-3">{p?.oneLiner ?? prompt}</span>
        </span>
        <Badge tone={st === "ready" ? "success" : st === "draft" ? "warn" : "neutral"}>{st === "ready" ? "Ready" : st === "draft" ? "Draft" : "Not started"}</Badge>
      </button>
      {open ? (
        <div className="space-y-4 border-t border-divider px-5 py-4">
          {jogs.length ? (
            <ul className="list-disc space-y-0.5 pl-5 text-[13px] text-ink-3">
              {jogs.map((j) => (
                <li key={j}>{j}</li>
              ))}
            </ul>
          ) : null}
          <div>
            <Textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="Just start typing. What happened, who was involved, what you did, what changed, any numbers. Messy is fine."
              className="min-h-44 leading-relaxed"
              aria-label={`${heading} brain dump`}
            />
            <div className="mt-1 flex items-center justify-between text-xs text-ink-3">
              <span>{saving === "saving" ? "Saving…" : saving === "saved" ? "Saved" : ""}</span>
              <span>{words} words</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" disabled={polishing || words < 40} onClick={() => void polish()}>
              {polishing ? "Cleaning up…" : p ? "Clean it up again" : "Clean it up"}
            </Button>
            {words < 40 ? <span className="text-[13px] text-ink-3">Write at least a few sentences first.</span> : null}
            {onDelete ? (
              <Button variant="ghost" className="ml-auto" onClick={onDelete}>
                Delete
              </Button>
            ) : null}
          </div>

          {p ? (
            <div className="space-y-4">
              <Tabs
                items={[
                  { value: "spoken", label: "2-minute version", active: tab === "spoken" },
                  { value: "star", label: "STAR", active: tab === "star" },
                  { value: "questions", label: `Questions (${story?.questions.length ?? 0})`, active: tab === "questions" },
                  { value: "coach", label: "Coaching", active: tab === "coach" },
                ]}
                onSelect={(v) => setTab(v as typeof tab)}
              />
              {tab === "spoken" ? (
                <div className="space-y-2">
                  <p className="lesson-prose whitespace-pre-wrap text-ink">{p.twoMinute}</p>
                  <p className="text-[13px] text-ink-3">Read it out loud with a timer. Aim for 90 seconds to 2 minutes, then cut anything you tripped on.</p>
                </div>
              ) : tab === "star" ? (
                <dl className="space-y-3 text-sm">
                  {(["situation", "task", "action", "result"] as const).map((k) => (
                    <div key={k}>
                      <dt className="eyebrow">{k}</dt>
                      <dd className="mt-0.5 whitespace-pre-wrap leading-relaxed text-ink">{p[k]}</dd>
                    </div>
                  ))}
                </dl>
              ) : tab === "questions" ? (
                <ul className="space-y-3 text-sm">
                  {(story?.questions ?? []).map((q) => (
                    <li key={q.question}>
                      <p className="font-medium text-ink">{q.question}</p>
                      <p className="text-ink-2">{q.angle}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-4 text-sm">
                  {story?.feedback ? (
                    <div>
                      <p className="eyebrow mb-1">Make it stronger</p>
                      <ul className="list-disc space-y-1 pl-5 text-ink-2">
                        {story.feedback.split("\n").filter(Boolean).map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {p.followUps?.length ? (
                    <div>
                      <p className="eyebrow mb-1">Follow-ups to expect</p>
                      <ul className="list-disc space-y-1 pl-5 text-ink-2">
                        {p.followUps.map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

