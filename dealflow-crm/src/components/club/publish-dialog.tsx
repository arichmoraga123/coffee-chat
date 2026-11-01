"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { upload } from "@vercel/blob/client";
import { Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { SearchSelect, type SearchOption } from "@/components/ui/search-select";
import { Select } from "@/components/ui/select";
import { CAREER_TRACK_OPTIONS } from "@/lib/career-tracks";
import type { PublishInput } from "@/lib/club-publish-schema";
import { cn } from "@/lib/utils";

type PublishType = PublishInput["type"];
type UploadedFile = { id: string; name: string; size: number; contentType: string; key: string };

const TYPES: { value: PublishType; label: string }[] = [
  { value: "resource", label: "Resource" },
  { value: "assignment", label: "Assignment" },
  { value: "reading", label: "Reading" },
  { value: "case_study", label: "Case study" },
  { value: "project", label: "Project" },
  { value: "event", label: "Event" },
  { value: "announcement", label: "Announcement" },
];
const POSTISH = new Set<PublishType>(["resource", "assignment", "reading", "case_study"]);
const ACCEPT = ".pdf,.xlsx,.xls,.xlsm,.pptx,.ppt,.docx,.doc,.png,.jpg,.jpeg,.gif,.webp";

export type EditTarget = { kind: "post" | "project" | "event" | "announcement"; id: string; input: PublishInput; memberLabels?: SearchOption[] };

type Form = {
  type: PublishType;
  title: string;
  description: string;
  body: string;
  files: UploadedFile[];
  links: string[];
  linkDraft: string;
  tags: string;
  lessonIds: string[];
  dueDate: string;
  allowDone: boolean;
  memberIds: string[];
  leadId: string;
  status: "planning" | "active" | "done";
  start: string;
  end: string;
  location: string;
  meetingLink: string;
  capacity: string;
  rsvpOn: boolean;
  pinned: boolean;
  audienceMode: "all" | "tracks" | "members";
  tracks: string[];
  audienceUsers: string[];
  feed: boolean;
  inApp: boolean;
  email: boolean;
  text: boolean;
};

const blank = (type: PublishType): Form => ({
  type,
  title: "",
  description: "",
  body: "",
  files: [],
  links: [],
  linkDraft: "",
  tags: "",
  lessonIds: [],
  dueDate: "",
  allowDone: type === "assignment",
  memberIds: [],
  leadId: "",
  status: "planning",
  start: "",
  end: "",
  location: "",
  meetingLink: "",
  capacity: "",
  rsvpOn: true,
  pinned: false,
  audienceMode: "all",
  tracks: [],
  audienceUsers: [],
  feed: true,
  inApp: true,
  email: false,
  text: false,
});

function fromInput(input: PublishInput): Form {
  const f = blank(input.type);
  f.title = input.title;
  const a = input.audience as { all?: true; tracks?: string[]; userIds?: string[] };
  if (a.tracks) {
    f.audienceMode = "tracks";
    f.tracks = a.tracks;
  } else if (a.userIds) {
    f.audienceMode = "members";
    f.audienceUsers = a.userIds;
  }
  if (input.type === "announcement") {
    f.body = input.body;
    f.pinned = input.pinned;
  } else if (input.type === "event") {
    Object.assign(f, { start: input.start, end: input.end ?? "", location: input.location, meetingLink: input.meetingLink ?? "", description: input.description, capacity: input.capacity ? String(input.capacity) : "", rsvpOn: input.rsvpOn });
  } else if (input.type === "project") {
    Object.assign(f, { description: input.description, memberIds: input.memberIds, leadId: input.leadId ?? "", dueDate: input.dueDate ?? "", status: input.status, files: input.files, links: input.links });
  } else {
    Object.assign(f, { description: input.description, files: input.files, links: input.links, tags: input.tags.join(", "), lessonIds: input.lessonIds, dueDate: input.dueDate ?? "", allowDone: input.allowDone });
  }
  return f;
}

function toInput(f: Form): PublishInput {
  const audience = f.audienceMode === "tracks" && f.tracks.length ? { tracks: f.tracks } : f.audienceMode === "members" && f.audienceUsers.length ? { userIds: f.audienceUsers } : { all: true as const };
  const delivery = { feed: f.feed, inApp: f.inApp, email: f.email, text: f.text };
  const links = [...f.links, ...(f.linkDraft.trim() ? [f.linkDraft.trim()] : [])].map((l) => (/^https?:\/\//.test(l) ? l : `https://${l}`));
  const common = { title: f.title.trim(), audience, delivery };
  switch (f.type) {
    case "announcement":
      return { type: "announcement", ...common, body: f.body, pinned: f.pinned };
    case "event":
      return {
        type: "event",
        ...common,
        start: f.start,
        end: f.end || null,
        location: f.location,
        meetingLink: f.meetingLink.trim() ? (/^https?:\/\//.test(f.meetingLink.trim()) ? f.meetingLink.trim() : `https://${f.meetingLink.trim()}`) : null,
        description: f.description,
        capacity: f.capacity ? Number(f.capacity) : null,
        rsvpOn: f.rsvpOn,
      };
    case "project":
      return { type: "project", ...common, description: f.description, memberIds: f.memberIds, leadId: f.leadId || null, dueDate: f.dueDate || null, status: f.status, files: f.files, links };
    default:
      return {
        type: f.type,
        ...common,
        description: f.description,
        files: f.files,
        links,
        tags: f.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        lessonIds: f.lessonIds,
        dueDate: f.type === "resource" ? null : f.dueDate || null,
        allowDone: f.type === "resource" ? false : f.allowDone,
      };
  }
}

function FileField({ files, onChange }: { files: UploadedFile[]; onChange: (f: UploadedFile[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const add = async (list: File[]) => {
    const cfg = (await fetch("/api/club/files/upload").then((r) => (r.ok ? r.json() : null))) as { mode: "blob" | "local" | "off"; clubId: string } | null;
    if (!cfg || cfg.mode === "off") return toast.error("File storage isn't set up yet. Add links instead.");
    const out = [...files];
    for (const file of list) {
      if (file.size > 25 * 1024 * 1024) {
        toast.error(`${file.name} is over 25 MB.`);
        continue;
      }
      setBusy(file.name);
      try {
        if (cfg.mode === "blob") {
          const safe = file.name.replace(/[^\w.\- ]+/g, "_");
          const b = await upload(`club/${cfg.clubId}/${safe}`, file, { access: "private", handleUploadUrl: "/api/club/files/upload", contentType: file.type || undefined });
          out.push({ id: crypto.randomUUID().replace(/-/g, "").slice(0, 20), name: safe, size: file.size, contentType: file.type, key: b.url });
        } else {
          const fd = new FormData();
          fd.append("file", file);
          const r = await fetch("/api/club/files/upload", { method: "POST", body: fd });
          const d = (await r.json()) as UploadedFile & { error?: string };
          if (!r.ok) throw new Error(d.error ?? "Upload failed");
          out.push(d);
        }
      } catch (e) {
        toast.error(`${file.name}: ${(e as Error).message}`);
      }
    }
    setBusy(null);
    onChange(out);
  };
  return (
    <div className="space-y-2">
      {files.length ? (
        <ul className="space-y-1">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-2 rounded-[var(--radius)] border border-border px-2 py-1.5 text-[13px]">
              <Paperclip className="size-3.5 text-ink-3" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-ink">{f.name}</span>
              <span className="text-ink-3">{f.size > 1024 * 1024 ? `${(f.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(f.size / 1024))} KB`}</span>
              <button type="button" aria-label={`Remove ${f.name}`} className="text-ink-3 hover:text-ink" onClick={() => onChange(files.filter((x) => x.id !== f.id))}>
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Button type="button" size="sm" variant="secondary" disabled={Boolean(busy)} onClick={() => input.current?.click()}>
        <Paperclip className="size-4" /> {busy ? `Uploading ${busy}…` : "Attach files"}
      </Button>
      <span className="ml-2 text-xs text-ink-3">PDF, Excel, PowerPoint, Word, images · up to 25 MB each</span>
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          void add([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function insertAround(el: HTMLTextAreaElement | null, value: string, set: (v: string) => void, before: string, after = before, placeholder = "text") {
  if (!el) return set(value + before + placeholder + after);
  const s = el.selectionStart;
  const e = el.selectionEnd;
  const sel = value.slice(s, e) || placeholder;
  set(value.slice(0, s) + before + sel + after + value.slice(e));
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(s + before.length, s + before.length + sel.length);
  });
}

export function PublishDialog({
  open,
  onClose,
  isAdmin,
  lessons,
  initialType,
  edit,
}: {
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  lessons: SearchOption[];
  initialType?: PublishType;
  edit?: EditTarget | null;
}) {
  const router = useRouter();
  const [f, setF] = useState<Form>(() => (edit ? fromInput(edit.input) : blank(initialType ?? "resource")));
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (open) setF(edit ? fromInput(edit.input) : blank(initialType ?? "resource"));
  }, [open, edit, initialType]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const label = "mb-1 block text-[13px] font-medium text-ink-2";

  const submit = async () => {
    if (f.title.trim().length < 2) return toast.error("Add a title.");
    if (f.type === "event" && !f.start) return toast.error("Pick a start date and time.");
    if (f.type === "announcement" && f.body.trim().length < 2) return toast.error("Write the announcement.");
    setBusy(true);
    const res = await fetch(edit ? `/api/club/publish/${edit.kind}/${edit.id}` : "/api/club/publish", {
      method: edit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toInput(f)),
    });
    setBusy(false);
    const d = (await res.json().catch(() => ({}))) as { url?: string; recipients?: number; error?: string };
    if (!res.ok) return toast.error(d.error ?? "Couldn't post that.");
    toast(edit ? "Saved" : d.recipients ? `Posted. ${d.recipients} member${d.recipients === 1 ? "" : "s"} notified.` : "Posted");
    onClose();
    if (!edit && d.url) router.push(d.url);
    router.refresh();
  };

  return (
    <Modal open={open} onClose={onClose} title={edit ? "Edit" : "Post to club"} className="max-w-2xl">
      <div className="space-y-4 text-sm">
        {!edit ? (
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Type">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={f.type === t.value}
                onClick={() => setF((x) => ({ ...blank(t.value), title: x.title, description: x.description, files: x.files, links: x.links }))}
                className={cn(
                  "rounded-full border px-3 py-1 text-[13px]",
                  f.type === t.value ? "border-accent bg-accent-tint font-semibold text-accent" : "border-border-strong text-ink-2 hover:bg-surface-2",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        ) : null}

        <div>
          <label className={label}>Title</label>
          <Input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder={f.type === "event" ? "Superday prep night" : f.type === "announcement" ? "Dues are due Friday" : "LBO model walkthrough"} />
        </div>

        {f.type === "announcement" ? (
          <div>
            <label className={label}>Message</label>
            <div className="mb-1 flex gap-1">
              <Button type="button" size="sm" variant="secondary" className="h-7 px-2 font-bold" onClick={() => insertAround(bodyRef.current, f.body, (v) => set("body", v), "**", "**", "bold text")}>
                B
              </Button>
              <Button type="button" size="sm" variant="secondary" className="h-7 px-2" onClick={() => insertAround(bodyRef.current, f.body, (v) => set("body", v), "[", "](https://)", "link text")}>
                Link
              </Button>
              <Button type="button" size="sm" variant="secondary" className="h-7 px-2" onClick={() => set("body", `${f.body}${f.body && !f.body.endsWith("\n") ? "\n" : ""}- `)}>
                List
              </Button>
            </div>
            <Textarea ref={bodyRef} value={f.body} onChange={(e) => set("body", e.target.value)} className="min-h-36" />
            <label className="mt-2 flex items-center gap-2 text-[13px] text-ink-2">
              <input type="checkbox" checked={f.pinned} onChange={(e) => set("pinned", e.target.checked)} /> Pin to Overview (replaces the current pinned announcement)
            </label>
          </div>
        ) : (
          <div>
            <label className={label}>Description</label>
            <Textarea value={f.description} onChange={(e) => set("description", e.target.value)} className="min-h-24" />
          </div>
        )}

        {f.type === "event" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>Starts (Eastern)</label>
                <Input type="datetime-local" value={f.start} onChange={(e) => set("start", e.target.value)} />
              </div>
              <div>
                <label className={label}>Ends (Eastern)</label>
                <Input type="datetime-local" value={f.end} min={f.start || undefined} onChange={(e) => set("end", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>Location</label>
                <Input value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="Broad 1210" />
              </div>
              <div>
                <label className={label}>Or meeting link</label>
                <Input value={f.meetingLink} onChange={(e) => set("meetingLink", e.target.value)} placeholder="https://zoom.us/…" />
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-40">
                <label className={label}>Capacity (optional)</label>
                <Input type="number" min={1} value={f.capacity} onChange={(e) => set("capacity", e.target.value)} />
              </div>
              <label className="flex items-center gap-2 pb-2 text-[13px] text-ink-2">
                <input type="checkbox" checked={f.rsvpOn} onChange={(e) => set("rsvpOn", e.target.checked)} /> Take RSVPs
              </label>
            </div>
          </>
        ) : null}

        {f.type === "project" ? (
          <>
            <div>
              <label className={label}>Team</label>
              <SearchSelect multiple endpoint="/api/search/members" value={f.memberIds} knownOptions={edit?.memberLabels} onChange={(v) => set("memberIds", v)} ariaLabel="Team" placeholder="Search members" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={label}>Lead</label>
                <SearchSelect endpoint="/api/search/members" value={f.leadId} knownOptions={edit?.memberLabels} onChange={(v) => set("leadId", v)} ariaLabel="Lead" placeholder="Search members" />
              </div>
              <div>
                <label className={label}>Due</label>
                <Input type="date" value={f.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
              </div>
              <div>
                <label className={label}>Status</label>
                <Select value={f.status} onChange={(e) => set("status", e.target.value as Form["status"])} aria-label="Status">
                  <option value="planning">Planning</option>
                  <option value="active">In progress</option>
                  <option value="done">Done</option>
                </Select>
              </div>
            </div>
          </>
        ) : null}

        {POSTISH.has(f.type) && f.type !== "resource" ? (
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-44">
              <label className={label}>Due date (optional)</label>
              <Input type="date" value={f.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
            </div>
            <label className="flex items-center gap-2 pb-2 text-[13px] text-ink-2">
              <input type="checkbox" checked={f.allowDone} onChange={(e) => set("allowDone", e.target.checked)} /> Members can mark done
            </label>
          </div>
        ) : null}

        {POSTISH.has(f.type) || f.type === "project" ? (
          <>
            <div>
              <label className={label}>Files</label>
              <FileField files={f.files} onChange={(v) => set("files", v)} />
            </div>
            <div>
              <label className={label}>Links</label>
              {f.links.length ? (
                <ul className="mb-1 space-y-1">
                  {f.links.map((l) => (
                    <li key={l} className="flex items-center gap-2 text-[13px]">
                      <span className="min-w-0 flex-1 truncate text-accent">{l}</span>
                      <button type="button" aria-label="Remove link" className="text-ink-3 hover:text-ink" onClick={() => set("links", f.links.filter((x) => x !== l))}>
                        <X className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="flex gap-2">
                <Input
                  value={f.linkDraft}
                  placeholder="https://"
                  onChange={(e) => set("linkDraft", e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && f.linkDraft.trim()) {
                      e.preventDefault();
                      setF((x) => ({ ...x, links: [...x.links, x.linkDraft.trim()], linkDraft: "" }));
                    }
                  }}
                />
                <Button type="button" size="sm" variant="secondary" className="h-9" disabled={!f.linkDraft.trim()} onClick={() => setF((x) => ({ ...x, links: [...x.links, x.linkDraft.trim()], linkDraft: "" }))}>
                  Add
                </Button>
              </div>
            </div>
          </>
        ) : null}

        {POSTISH.has(f.type) ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>Tags</label>
              <Input value={f.tags} onChange={(e) => set("tags", e.target.value)} placeholder="LBO, technicals" />
            </div>
            <div>
              <label className={label}>Related lessons</label>
              <SearchSelect multiple options={lessons} value={f.lessonIds} onChange={(v) => set("lessonIds", v)} ariaLabel="Related lessons" placeholder="Search lessons" />
            </div>
          </div>
        ) : null}

        <fieldset className="space-y-2 rounded-[var(--radius)] border border-border p-3">
          <legend className="px-1 text-[13px] font-medium text-ink-2">Audience</legend>
          <div className="flex flex-wrap gap-4 text-[13px]">
            {(
              [
                ["all", "All members"],
                ["tracks", "Selected tracks"],
                ["members", "Selected members"],
              ] as const
            ).map(([v, l]) => (
              <label key={v} className="flex items-center gap-1.5">
                <input type="radio" name="audience" checked={f.audienceMode === v} onChange={() => set("audienceMode", v)} /> {l}
              </label>
            ))}
          </div>
          {f.audienceMode === "tracks" ? (
            <SearchSelect multiple options={CAREER_TRACK_OPTIONS.map((t) => ({ value: t, label: t }))} value={f.tracks} onChange={(v) => set("tracks", v)} ariaLabel="Tracks" placeholder="Pick tracks" />
          ) : null}
          {f.audienceMode === "members" ? (
            <SearchSelect multiple endpoint="/api/search/members" value={f.audienceUsers} knownOptions={edit?.memberLabels} onChange={(v) => set("audienceUsers", v)} ariaLabel="Members" placeholder="Search members" />
          ) : null}
        </fieldset>

        {!edit ? (
          <fieldset className="space-y-1.5 rounded-[var(--radius)] border border-border p-3 text-[13px] text-ink-2">
            <legend className="px-1 font-medium">Delivery</legend>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={f.feed} onChange={(e) => set("feed", e.target.checked)} /> Show in Activity feed
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={f.inApp} onChange={(e) => set("inApp", e.target.checked)} /> Notify in app
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={f.email} onChange={(e) => set("email", e.target.checked)} /> Email members
            </label>
            {isAdmin ? (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={f.text} onChange={(e) => set("text", e.target.checked)} /> Text members <span className="text-ink-3">(urgent only; only people who opted in)</span>
              </label>
            ) : null}
          </fieldset>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={busy}>
            {busy ? "Saving…" : edit ? "Save" : "Post"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Header button + dialog. */
export function PostToClubButton({ isAdmin, lessons, label = "Post to club", type, variant = "primary" }: { isAdmin: boolean; lessons: SearchOption[]; label?: string; type?: PublishType; variant?: "primary" | "secondary" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={variant === "primary" ? "default" : "sm"} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <PublishDialog open={open} onClose={() => setOpen(false)} isAdmin={isAdmin} lessons={lessons} initialType={type} />
    </>
  );
}
