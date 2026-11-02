"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Copy, Download, FileUp } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SearchSelect } from "@/components/ui/search-select";
import { DataTable, Td, Th } from "@/components/ui/data-table";
import { OPENINGS_CLAUDE_PROMPT, OPENINGS_TEMPLATE_URL } from "@/lib/openings";
import type { OpeningsPreview } from "@/lib/openings-import";
import { cn } from "@/lib/utils";

type Batch = { id: string; fileName: string; counts: Record<string, number>; status: string; createdAt: string; by: string };

export function OpeningsUpload({ isAdmin, clubs, batches }: { isAdmin: boolean; clubs: { id: string; name: string }[]; batches: Batch[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [audience, setAudience] = useState<"club" | "all">(clubs.length ? "club" : "all");
  const [clubId, setClubId] = useState(clubs[0]?.id ?? "");
  const [archiveMissing, setArchiveMissing] = useState(false);
  const [postToClub, setPostToClub] = useState(false);
  const [merge, setMerge] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<OpeningsPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ batchId: string | null; counts: OpeningsPreview["counts"]; message?: string } | null>(null);
  const [openDiff, setOpenDiff] = useState<string | null>(null);

  const send = async (mode: "preview" | "commit", over?: { file?: File; archiveMissing?: boolean; merge?: Record<string, string>; audience?: string; clubId?: string }) => {
    const f = over?.file ?? file;
    if (!f) return;
    setLoading(true);
    const fd = new FormData();
    fd.append("file", f);
    fd.append("mode", mode);
    fd.append("archiveMissing", String(over?.archiveMissing ?? archiveMissing));
    fd.append("mergeFirms", JSON.stringify(over?.merge ?? merge));
    fd.append("audience", over?.audience ?? audience);
    fd.append("clubId", over?.clubId ?? clubId);
    fd.append("postToClub", String(postToClub));
    try {
      const res = await fetch("/api/openings/import", { method: "POST", body: fd });
      const d = (await res.json().catch(() => ({}))) as { preview?: OpeningsPreview; batchId?: string | null; counts?: OpeningsPreview["counts"]; message?: string; posted?: boolean; error?: string };
      if (!res.ok) throw new Error(d.error ?? "Upload failed.");
      if (mode === "preview" && d.preview) setPreview(d.preview);
      if (mode === "commit" && d.counts) {
        setDone({ batchId: d.batchId ?? null, counts: d.counts, message: d.message });
        setPreview(null);
        toast.success(d.message ?? `Saved ${d.counts.new} new and ${d.counts.updated} updated openings${d.posted ? " · posted to the club" : ""}.`);
        router.refresh();
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const pick = (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setDone(null);
    setMerge({});
    void send("preview", { file: f, merge: {} });
  };

  const undo = async (batchId: string) => {
    const res = await fetch(`/api/openings/import/${batchId}/undo`, { method: "POST" });
    const d = (await res.json().catch(() => ({}))) as { removed?: number; restored?: number; unarchived?: number; error?: string };
    if (!res.ok) return toast.error(d.error ?? "Couldn't undo.");
    toast.success(`Undone: removed ${d.removed ?? 0}, restored ${d.restored ?? 0}, un-archived ${d.unarchived ?? 0}.`);
    setDone(null);
    router.refresh();
  };

  const p = preview;
  const nothing = p && !p.counts.new && !p.counts.updated && !p.counts.archive;

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Openings", href: "/recruiting/openings" }, { label: "Upload" }]}
        title="Upload openings"
        subtitle="Upload the openings template (or a tracker export). You'll see a preview before anything is saved."
        sectionTabs={false}
        actions={
          <>
            <Button variant="secondary" asChild>
              <a href={OPENINGS_TEMPLATE_URL} download>
                <Download className="h-4 w-4" aria-hidden /> Download template
              </a>
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                void navigator.clipboard.writeText(OPENINGS_CLAUDE_PROMPT).then(
                  () => toast.success("Prompt copied — paste it into Claude with your tracker export and the template."),
                  () => toast.error("Couldn't copy"),
                )
              }
            >
              <Copy className="h-4 w-4" aria-hidden /> Copy Claude prompt
            </Button>
          </>
        }
      />

      <Card title="1. Who sees these openings">
        <div className="flex flex-wrap items-end gap-4">
          {isAdmin ? (
            <SegmentedControl
              ariaLabel="Visible to"
              value={audience}
              onChange={(v) => {
                setAudience(v);
                if (file) void send("preview", { audience: v });
              }}
              options={[
                ...(clubs.length ? [{ value: "club" as const, label: "Club members" }] : []),
                { value: "all" as const, label: "Everyone on Prospect" },
              ]}
            />
          ) : null}
          {audience === "club" && clubs.length > 1 ? (
            <div className="w-64">
              <SearchSelect
                ariaLabel="Club"
                value={clubId}
                onChange={(v) => {
                  setClubId(v);
                  if (file) void send("preview", { clubId: v });
                }}
                options={clubs.map((c) => ({ value: c.id, label: c.name }))}
              />
            </div>
          ) : audience === "club" && clubs[0] ? (
            <p className="text-sm text-ink-2">Visible to {clubs[0].name} members.</p>
          ) : null}
        </div>
      </Card>

      <Card title="2. Choose the file">
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files?.[0]);
          }}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-border-strong p-8 text-center hover:border-accent"
        >
          <FileUp className="h-6 w-6 text-ink-3" aria-hidden />
          <p className="text-sm font-medium text-ink">{file ? file.name : "Drop an .xlsx or .csv here, or click to choose"}</p>
          <p className="text-[13px] text-ink-3">Headers like Company, Role, Location and Closing date are recognized automatically.</p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        {loading ? <p className="mt-3 text-[13px] text-ink-3">Reading the file…</p> : null}
      </Card>

      {p ? (
        <Card title="3. Check the preview">
          {p.headerProblems.length ? (
            <p className="mb-3 rounded-[var(--radius)] bg-danger-bg p-3 text-sm text-danger">{p.headerProblems.join(". ")}.</p>
          ) : null}
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge tone="success">{p.counts.new} new</Badge>
            <Badge tone="info">{p.counts.updated} updated</Badge>
            <Badge tone="neutral">{p.counts.unchanged} unchanged</Badge>
            <Badge tone={p.counts.errors ? "danger" : "neutral"}>{p.counts.errors} errors</Badge>
            {archiveMissing ? <Badge tone="warn">{p.counts.archive} to archive</Badge> : null}
            <span className="text-[13px] text-ink-3">from {p.counts.rows} rows</span>
          </div>

          {p.firmSuggestions.length ? (
            <div className="mt-5 space-y-2">
              <p className="text-sm font-medium text-ink">Firms that look like ones already listed</p>
              {p.firmSuggestions.map((s) => (
                <label key={s.from} className="flex items-center gap-2 text-sm text-ink-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--color-accent)]"
                    checked={merge[s.from] === s.to}
                    onChange={(e) => {
                      const next = { ...merge };
                      if (e.target.checked) next[s.from] = s.to;
                      else delete next[s.from];
                      setMerge(next);
                      void send("preview", { merge: next });
                    }}
                  />
                  Use <span className="font-medium text-ink">{s.to}</span> for “{s.from}” ({s.count} row{s.count === 1 ? "" : "s"})
                </label>
              ))}
            </div>
          ) : null}

          {p.warnings.length ? (
            <div className="mt-5">
              <p className="mb-2 text-sm font-medium text-ink">Values not in the template lists</p>
              <ul className="space-y-1 text-[13px] text-ink-2">
                {p.warnings.map((w) => (
                  <li key={`${w.field}${w.value}`}>
                    {w.field}: “{w.value}” {w.suggestion ? <>→ using <span className="font-medium text-ink">{w.suggestion}</span></> : "→ kept as typed"} ({w.count})
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {p.errors.length ? (
            <div className="mt-5">
              <p className="mb-2 text-sm font-medium text-danger">Rows that won&apos;t be saved</p>
              <DataTable>
                <thead>
                  <tr>
                    <Th className="w-28">Row</Th>
                    <Th>Reason</Th>
                  </tr>
                </thead>
                <tbody>
                  {p.errors.map((e, i) => (
                    <tr key={i}>
                      <Td className="text-ink-2">
                        {e.tab} · {e.row}
                      </Td>
                      <Td>{e.reason}</Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          ) : null}

          {p.newRows.length ? (
            <Section title={`New (${p.counts.new})`}>
              {p.newRows.map((r, i) => (
                <li key={i} className="py-1.5 text-sm">
                  <span className="font-medium text-ink">{r.firm}</span> · {r.program} · {r.city}
                </li>
              ))}
            </Section>
          ) : null}

          {p.updatedRows.length ? (
            <Section title={`Updated (${p.counts.updated})`} open>
              {p.updatedRows.map((r) => (
                <li key={r.id} className="py-1.5 text-sm">
                  <button type="button" className="text-left hover:underline" onClick={() => setOpenDiff(openDiff === r.id ? null : r.id)} aria-expanded={openDiff === r.id}>
                    <span className="font-medium text-ink">{r.firm}</span> · {r.program} · {r.city} <span className="text-[12px] text-accent">({r.diff.length} change{r.diff.length === 1 ? "" : "s"})</span>
                  </button>
                  {openDiff === r.id ? (
                    <ul className="mt-1 space-y-0.5 border-l-2 border-border pl-3 text-[13px] text-ink-2">
                      {r.diff.map((d) => (
                        <li key={d.field}>
                          {d.field}: <span className="line-through">{d.current}</span> → <span className="font-medium text-ink">{d.incoming}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </Section>
          ) : null}

          {p.counts.unchanged ? (
            <Section title={`Unchanged (${p.counts.unchanged})`}>
              {p.unchangedRows.map((r, i) => (
                <li key={i} className="py-1 text-[13px] text-ink-2">
                  {r.firm} · {r.program} · {r.city}
                </li>
              ))}
            </Section>
          ) : null}

          {archiveMissing && p.archiveRows.length ? (
            <Section title={`Will be archived (${p.counts.archive})`} open>
              {p.archiveRows.map((r) => (
                <li key={r.id} className="py-1 text-[13px] text-ink-2">
                  {r.firm} · {r.program} · {r.city}
                </li>
              ))}
            </Section>
          ) : null}

          <div className="mt-6 space-y-2 border-t border-divider pt-4">
            <label className="flex items-center gap-2 text-sm text-ink-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--color-accent)]"
                checked={archiveMissing}
                onChange={(e) => {
                  setArchiveMissing(e.target.checked);
                  void send("preview", { archiveMissing: e.target.checked });
                }}
              />
              Archive openings from this source that aren&apos;t in this file
            </label>
            {audience === "club" && clubs.length && p.counts.new > 0 ? (
              <label className="flex items-center gap-2 text-sm text-ink-2">
                <input type="checkbox" className="h-4 w-4 accent-[var(--color-accent)]" checked={postToClub} onChange={(e) => setPostToClub(e.target.checked)} />
                Post to club: “{p.counts.new} new openings added”
              </label>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="primary" disabled={loading || Boolean(nothing)} onClick={() => void send("commit")}>
              {nothing ? "Nothing to change" : `Save ${p.counts.new + p.counts.updated} opening${p.counts.new + p.counts.updated === 1 ? "" : "s"}`}
            </Button>
            {nothing ? <p className="text-[13px] text-ink-3">Every row matches what&apos;s already there.</p> : null}
          </div>
        </Card>
      ) : null}

      {done ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm">
            <p className="text-ink">
              {done.message ?? `Saved: ${done.counts.new} new, ${done.counts.updated} updated${done.counts.archive ? `, ${done.counts.archive} archived` : ""}.`}
            </p>
            <div className="flex gap-2">
              {done.batchId ? (
                <Button variant="secondary" size="sm" onClick={() => void undo(done.batchId!)}>
                  Undo this upload
                </Button>
              ) : null}
              <Button variant="primary" size="sm" asChild>
                <Link href="/recruiting/openings">View openings</Link>
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {batches.length ? (
        <Card title="Recent uploads">
          <ul className="divide-y divide-border">
            {batches.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span className="min-w-0 break-words">
                  <span className="font-medium text-ink">{b.fileName}</span>{" "}
                  <span className="text-[13px] text-ink-3">
                    {new Date(b.createdAt).toLocaleString()} · {b.by} · {b.counts.new ?? 0} new, {b.counts.updated ?? 0} updated
                  </span>
                </span>
                {b.status === "undone" ? (
                  <Badge tone="neutral">Undone</Badge>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => void undo(b.id)}>
                    Undo
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function Section({ title, open: initial = false, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(initial);
  return (
    <div className="mt-5">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex items-center gap-1 text-sm font-medium text-ink">
        <ChevronDown className={cn("h-4 w-4 transition-transform", !open && "-rotate-90")} aria-hidden /> {title}
      </button>
      {open ? <ul className="mt-1 max-h-72 divide-y divide-divider overflow-y-auto pl-5">{children}</ul> : null}
    </div>
  );
}
