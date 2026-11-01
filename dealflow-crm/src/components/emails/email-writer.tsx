"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { COLD_TEMPLATES, type ColdTemplate } from "@/lib/cold-email-templates";
import { EMAIL_KINDS, type EmailKind } from "@/lib/email-ai-kinds";
import { cn } from "@/lib/utils";

type Draft = { subjects: string[]; body: string; personalization: string[]; missing: string[]; tips: string[] };
type Me = { name: string; school: string; classYear: number | null; track: string };

const YEAR_WORD = (classYear: number | null) => {
  if (!classYear) return "student";
  const now = new Date();
  const gradIn = classYear - now.getFullYear() + (now.getMonth() >= 6 ? 0 : 1);
  return gradIn >= 4 ? "freshman" : gradIn === 3 ? "sophomore" : gradIn === 2 ? "junior" : "senior";
};

/** Fills the template placeholders we know about; the rest stay as {{…}} for the student. */
function fillTemplate(t: ColdTemplate, me: Me, r: { name: string; firm: string; group: string }) {
  const yy = me.classYear ? String(me.classYear).slice(2) : "YY";
  const map: Record<string, string> = {
    first: r.name.split(" ")[0] || "{{first}}",
    firm: r.firm || "{{firm}}",
    group: r.group || "{{group}}",
    school: me.school,
    year: `'${yy}`,
    yy,
    year_word: YEAR_WORD(me.classYear),
    track: me.track.toLowerCase(),
    my_name: me.name,
    club: "PE@Broad",
  };
  const fill = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (m, k: string) => map[k] ?? m);
  return { subject: fill(t.subject), body: fill(t.body) };
}

export function EmailWriter({
  contacts,
  me,
  initial,
}: {
  contacts: { id: string; label: string }[];
  me: Me;
  initial: { contactId: string; kind: string; templateId: string };
}) {
  const [source, setSource] = useState<"contact" | "manual">(initial.contactId || contacts.length ? "contact" : "manual");
  const [contactId, setContactId] = useState(initial.contactId);
  const [manual, setManual] = useState({ name: "", firm: "", title: "", group: "", school: "", hook: "", notes: "" });
  const [kind, setKind] = useState<EmailKind>((initial.kind as EmailKind) in EMAIL_KINDS ? (initial.kind as EmailKind) : "cold");
  const [templateId, setTemplateId] = useState(initial.templateId);
  const [extra, setExtra] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [filter, setFilter] = useState<"all" | EmailKind>("all");

  const templates = useMemo(() => COLD_TEMPLATES.filter((t) => filter === "all" || t.kind === filter), [filter]);
  const contactLabel = contacts.find((c) => c.id === contactId)?.label ?? "";

  const generate = async () => {
    if (source === "contact" && !contactId) return toast.error("Pick a contact, or switch to 'Someone new'.");
    if (source === "manual" && !manual.name.trim()) return toast.error("Enter their name.");
    setBusy(true);
    setDraft(null);
    const clean = Object.fromEntries(Object.entries(manual).filter(([, v]) => v.trim()));
    const res = await fetch("/api/emails/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        contactId: source === "contact" ? contactId : undefined,
        manual: source === "manual" ? clean : undefined,
        templateId: templateId || undefined,
        extra: extra.trim() || undefined,
        save: source === "contact",
      }),
    });
    setBusy(false);
    const d = (await res.json().catch(() => ({}))) as { draft?: Draft; to?: string | null; error?: string };
    if (!res.ok || !d.draft) return toast.error(d.error ?? "Couldn't write the email.");
    setDraft(d.draft);
    setTo(d.to ?? null);
    setSubject(d.draft.subjects[0] ?? "");
    setBody(d.draft.body);
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(subject ? `Subject: ${subject}\n\n${body}` : body);
      toast("Copied");
    } catch {
      toast.error("Couldn't copy.");
    }
  };

  const useTemplate = (t: ColdTemplate) => {
    setTemplateId(t.id);
    setKind(t.kind);
    const r = source === "manual" ? { name: manual.name, firm: manual.firm, group: manual.group } : { name: "", firm: "", group: "" };
    const filled = fillTemplate(t, me, r);
    setDraft(null);
    setSubject(filled.subject);
    setBody(filled.body);
    toast(`Loaded "${t.title}". Fill the {{…}} parts, or press Write with AI to personalize it.`);
  };

  const linkedin = kind === "linkedin";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card title="Who is it for?">
          <SegmentedControl
            ariaLabel="Recipient"
            value={source}
            onChange={setSource}
            options={[
              { value: "contact", label: "Saved contact" },
              { value: "manual", label: "Someone new" },
            ]}
          />
          {source === "contact" ? (
            <div className="mt-4">
              {contacts.length ? (
                <Select value={contactId} onChange={(e) => setContactId(e.target.value)} className="w-full" aria-label="Contact">
                  <option value="">Pick a contact</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <p className="text-sm text-ink-3">No saved contacts yet. Use &ldquo;Someone new&rdquo;.</p>
              )}
              <p className="mt-2 text-[13px] text-ink-3">Uses everything on their profile and your logged conversations.</p>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input placeholder="Full name *" value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} aria-label="Full name" />
              <Input placeholder="Firm" value={manual.firm} onChange={(e) => setManual({ ...manual, firm: e.target.value })} aria-label="Firm" />
              <Input placeholder="Title (e.g. Analyst)" value={manual.title} onChange={(e) => setManual({ ...manual, title: e.target.value })} aria-label="Title" />
              <Input placeholder="Group (e.g. TMT, Industrials)" value={manual.group} onChange={(e) => setManual({ ...manual, group: e.target.value })} aria-label="Group" />
              <Input placeholder="Their school" value={manual.school} onChange={(e) => setManual({ ...manual, school: e.target.value })} aria-label="Their school" className="sm:col-span-2" />
              <Textarea
                placeholder="Your hook: how you're connected or why them (same high school, met at the info session, they moved from banking to PE…)"
                value={manual.hook}
                onChange={(e) => setManual({ ...manual, hook: e.target.value })}
                className="min-h-20 sm:col-span-2"
                aria-label="Hook"
              />
            </div>
          )}
        </Card>

        <Card title="What kind of email?">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(EMAIL_KINDS) as EmailKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={cn(
                  "rounded-[var(--radius)] border px-3 py-1.5 text-sm",
                  kind === k ? "border-accent bg-accent-tint font-semibold text-accent" : "border-border-strong text-ink-2 hover:bg-surface-2",
                )}
              >
                {EMAIL_KINDS[k].label}
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Anything else? e.g. 'mention I'm in Chicago over winter break', 'keep it extra short', 'they offered to intro me to their VP'"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            className="mt-4 min-h-20"
            aria-label="Extra instructions"
          />
          {templateId ? (
            <p className="mt-2 text-[13px] text-ink-3">
              Starting from template: <span className="text-ink">{COLD_TEMPLATES.find((t) => t.id === templateId)?.title}</span>{" "}
              <button type="button" className="text-accent hover:underline" onClick={() => setTemplateId("")}>
                Clear
              </button>
            </p>
          ) : null}
          <Button variant="primary" className="mt-4" disabled={busy} onClick={() => void generate()}>
            {busy ? "Writing…" : "Write with AI"}
          </Button>
        </Card>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="section-title">Templates</h2>
            <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filter templates" className="h-8">
              <option value="all">All</option>
              {(Object.keys(EMAIL_KINDS) as EmailKind[])
                .filter((k) => COLD_TEMPLATES.some((t) => t.kind === k))
                .map((k) => (
                  <option key={k} value={k}>
                    {EMAIL_KINDS[k].label}
                  </option>
                ))}
            </Select>
          </div>
          {templates.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{t.title}</p>
                  <p className="mt-0.5 text-[13px] text-ink-3">{t.whenToUse}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => useTemplate(t)}>
                  Use
                </Button>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-[13px] text-accent">Preview</summary>
                <pre className="mt-2 whitespace-pre-wrap rounded-[var(--radius)] bg-surface-2 p-3 font-sans text-[13px] leading-relaxed text-ink-2">
                  {t.subject ? `Subject: ${t.subject}\n\n` : ""}
                  {t.body}
                </pre>
                <ul className="mt-2 list-disc pl-5 text-[13px] text-ink-3">
                  {t.tips.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </details>
            </Card>
          ))}
        </section>
      </div>

      <div className="space-y-4 xl:sticky xl:top-8 xl:h-fit">
        <Card title="Your email" action={source === "contact" && contactLabel ? <span className="text-ink-3">{contactLabel.split(" · ")[0]}</span> : null}>
          {subject || body ? (
            <>
              {!linkedin ? (
                <label className="block space-y-1">
                  <span className="eyebrow block">Subject</span>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject" />
                </label>
              ) : null}
              {draft && draft.subjects.length > 1 && !linkedin ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {draft.subjects.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSubject(s)}
                      className={cn("rounded border px-2 py-0.5 text-xs", s === subject ? "border-accent bg-accent-tint text-accent" : "border-border-strong text-ink-2")}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : null}
              <label className="mt-4 block space-y-1">
                <span className="eyebrow block">Body</span>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-72 leading-relaxed" aria-label="Body" />
              </label>
              <p className={cn("mt-1 text-right text-xs", linkedin && body.length > 280 ? "text-danger" : "text-ink-3")}>
                {linkedin ? `${body.length}/280 characters` : `${body.trim().split(/\s+/).filter(Boolean).length} words`}
              </p>
              {/\{\{\w+\}\}/.test(subject + body) ? (
                <p className="mt-2 rounded-[var(--radius)] bg-warn-bg px-3 py-2 text-[13px] text-warn">Fill in the {"{{…}}"} parts before sending.</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="primary" onClick={() => void copyAll()}>
                  Copy
                </Button>
                {!linkedin ? (
                  <Button variant="secondary" asChild>
                    <a href={`mailto:${to ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}>Open in email app</a>
                  </Button>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-3">Pick who it&apos;s for and the kind of email, then press Write with AI, or load a template.</p>
          )}
        </Card>

        {draft ? (
          <Card title="Before you send">
            {draft.personalization.length ? (
              <div>
                <p className="eyebrow mb-1.5">Personalized with</p>
                <div className="flex flex-wrap gap-1.5">
                  {draft.personalization.map((p) => (
                    <Badge key={p} tone="success">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {draft.missing.length ? (
              <div className="mt-4">
                <p className="eyebrow mb-1.5">Would make it stronger</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-warn">
                  {draft.missing.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {draft.tips.length ? (
              <div className="mt-4">
                <p className="eyebrow mb-1.5">Tips</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
                  {draft.tips.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>
    </div>
  );
}
