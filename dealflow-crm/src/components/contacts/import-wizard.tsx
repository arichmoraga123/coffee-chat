"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { Select } from "@/components/ui/select";
import { downloadCsv } from "@/components/ui/bulk";
import { UndoImportButton } from "@/components/contacts/undo-import-button";
import { fileToTabs, type SheetTab } from "@/lib/sheet-rows";
import { CLAUDE_CONVERT_PROMPT, CONTACT_FIELD_LABELS, contactFieldFor, detectTab, type ContactField } from "@/lib/rolodex-fields";
import type { ImportPreview, ImportSource, RowIssue } from "@/lib/rolodex-import";
import { cn } from "@/lib/utils";

type Loaded = { source: ImportSource; fileName: string; tabs: SheetTab[] };
type Mapping = { fileName: string; headers: string[]; rows: string[][]; map: (ContactField | "")[] };

const MAX_BYTES = 10 * 1024 * 1024;

function DropZone({ accept, multiple, label, hint, onFiles }: { accept: string; multiple?: boolean; label: string; hint: string; onFiles: (files: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles([...e.dataTransfer.files]);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-[var(--radius)] border border-dashed border-border-strong px-4 py-6 text-center transition-colors hover:bg-surface-2",
        over && "border-accent bg-accent-tint",
      )}
    >
      <Upload className="size-5 text-ink-3" aria-hidden />
      <p className="text-sm font-medium text-ink">{label}</p>
      <p className="text-[13px] text-ink-3">{hint}</p>
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          onFiles([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function ImportWizard() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [acceptAll, setAcceptAll] = useState(false);
  const [acceptFirms, setAcceptFirms] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ batchId: string; counts: ImportPreview["counts"]; source: ImportSource } | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const requestPreview = async (l: Loaded, opts: { acceptSuggestions: boolean; acceptFirms: string[] }, commit = false) => {
    setBusy(true);
    const res = await fetch("/api/imports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...l, ...opts, commit }),
    }).catch(() => null);
    setBusy(false);
    const d = (await res?.json().catch(() => ({}))) as { preview?: ImportPreview; batchId?: string; counts?: ImportPreview["counts"]; error?: string };
    if (!res?.ok) {
      toast.error(d?.error ?? "Couldn't read that file.");
      return;
    }
    if (commit && d.batchId && d.counts) {
      setDone({ batchId: d.batchId, counts: d.counts, source: l.source });
      setPreview(null);
      return;
    }
    if (d.preview) setPreview(d.preview);
  };

  const readFiles = async (files: File[], source: ImportSource) => {
    if (!files.length) return;
    if (files.some((f) => f.size > MAX_BYTES)) return toast.error("Files must be under 10 MB.");
    if (files.some((f) => !/\.(xlsx|xls|csv)$/i.test(f.name))) return toast.error("Upload an .xlsx or .csv file.");
    try {
      const tabs = (await Promise.all(files.map((f) => fileToTabs(f)))).flat().filter((t) => t.rows.length);
      if (!tabs.length) return toast.error("That file is empty.");
      const fileName = files.map((f) => f.name).join(" + ");
      if (source === "csv") {
        const t = tabs[0];
        const { headerRow } = detectTab(t.rows);
        const headers = t.rows[headerRow] ?? [];
        const used = new Set<ContactField>();
        const map = headers.map((h) => {
          const f = contactFieldFor(h);
          if (!f || used.has(f)) return "" as const;
          used.add(f);
          return f;
        });
        setMapping({ fileName, headers, rows: t.rows.slice(headerRow + 1), map });
        return;
      }
      if (source === "rolodex_template" && !tabs.some((t) => detectTab(t.rows).kind)) {
        return toast.error("Couldn't find the Contacts or Interactions columns. Use the template's headers, or try Other CSV.");
      }
      if (source === "linkedin" && !tabs.some((t) => detectTab(t.rows).kind === "linkedin")) {
        return toast.error("That doesn't look like LinkedIn's Connections.csv (no First Name / Connected On columns).");
      }
      const l = { source, fileName, tabs };
      setLoaded(l);
      setAcceptAll(false);
      setAcceptFirms([]);
      await requestPreview(l, { acceptSuggestions: false, acceptFirms: [] });
    } catch {
      toast.error("Couldn't read that file.");
    }
  };

  const reset = () => {
    setLoaded(null);
    setMapping(null);
    setPreview(null);
    setDone(null);
    setOpen(null);
  };

  if (done) {
    const c = done.counts;
    return (
      <Card className="space-y-4 p-6">
        <div>
          <h2 className="section-title">Import complete</h2>
          <p className="mt-1 text-sm text-ink-2">
            Added {c.contactsNew} {c.contactsNew === 1 ? "contact" : "contacts"}, updated {c.contactsUpdated}, and logged {c.interactions} {c.interactions === 1 ? "interaction" : "interactions"}.
            {c.tasks ? ` ${c.tasks} next ${c.tasks === 1 ? "step is" : "steps are"} now on your task list.` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" asChild>
            <Link href={done.source === "linkedin" ? "/contacts?view=network" : "/contacts"}>{done.source === "linkedin" ? "View Network" : "View contacts"}</Link>
          </Button>
          <Button variant="secondary" onClick={reset}>
            Import another file
          </Button>
          <UndoImportButton id={done.batchId} label="this import" />
        </div>
      </Card>
    );
  }

  if (mapping) {
    const mapped = new Set(mapping.map.filter(Boolean));
    const hasName = mapped.has("fullName") || (mapped.has("firstName") && mapped.has("lastName"));
    return (
      <Card className="space-y-4 p-5">
        <div>
          <h2 className="section-title">Match your columns</h2>
          <p className="mt-1 text-[13px] text-ink-3">
            {mapping.fileName} · {mapping.rows.length} {mapping.rows.length === 1 ? "row" : "rows"}. Name and Firm are required. Columns left as &quot;Skip&quot; aren&apos;t imported. Interactions need the Rolodex template so each one has a real date.
          </p>
        </div>
        <div className="divide-y divide-divider rounded-[var(--radius)] border border-border">
          {mapping.headers.map((h, i) => (
            <div key={i} className="grid items-center gap-2 px-3 py-2 sm:grid-cols-[1fr_1fr_220px]">
              <span className="truncate text-sm font-medium text-ink">{h || `Column ${i + 1}`}</span>
              <span className="truncate text-[13px] text-ink-3">{mapping.rows.find((r) => r[i])?.[i] ?? ""}</span>
              <Select
                value={mapping.map[i]}
                aria-label={`Map ${h}`}
                onChange={(e) => {
                  const map = [...mapping.map];
                  map[i] = e.target.value as ContactField | "";
                  setMapping({ ...mapping, map });
                }}
              >
                <option value="">Skip</option>
                {(Object.keys(CONTACT_FIELD_LABELS) as ContactField[]).map((f) => (
                  <option key={f} value={f}>
                    {CONTACT_FIELD_LABELS[f]}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            disabled={!hasName || !mapped.has("firm") || busy}
            onClick={() => {
              const keep = mapping.map.map((f, i) => (f ? i : -1)).filter((i) => i >= 0);
              const header = keep.map((i) => CONTACT_FIELD_LABELS[mapping.map[i] as ContactField]);
              const rows = mapping.rows.map((r) => keep.map((i) => r[i] ?? ""));
              const l: Loaded = { source: "csv", fileName: mapping.fileName, tabs: [{ name: "Contacts", rows: [header, ...rows] }] };
              setLoaded(l);
              setMapping(null);
              void requestPreview(l, { acceptSuggestions: false, acceptFirms: [] });
            }}
          >
            Preview import
          </Button>
          <Button variant="secondary" onClick={reset}>
            Cancel
          </Button>
          {!hasName || !mapped.has("firm") ? <span className="text-[13px] text-warn">Map a name (First + Last, or Full Name) and Firm to continue.</span> : null}
        </div>
      </Card>
    );
  }

  if (preview && loaded) {
    const c = preview.counts;
    const reissue = (acceptSuggestions: boolean, firms: string[]) => {
      setAcceptAll(acceptSuggestions);
      setAcceptFirms(firms);
      void requestPreview(loaded, { acceptSuggestions, acceptFirms: firms });
    };
    const issueList = (xs: RowIssue[]) => (
      <ul className="divide-y divide-divider text-[13px]">
        {xs.slice(0, 200).map((e, i) => (
          <li key={i} className="flex gap-3 py-1.5">
            <span className="w-28 shrink-0 text-ink-3">
              {e.tab} row {e.row}
            </span>
            <span className="text-ink-2">{e.reason}</span>
          </li>
        ))}
        {xs.length > 200 ? <li className="py-1.5 text-ink-3">…and {xs.length - 200} more</li> : null}
      </ul>
    );
    const section = (key: string, title: string, count: number, body: React.ReactNode, tone?: "warn") =>
      count ? (
        <div className="border-t border-divider">
          <button type="button" onClick={() => setOpen(open === key ? null : key)} className="flex w-full items-center gap-2 px-5 py-3 text-left text-sm font-medium text-ink hover:bg-surface-2">
            {open === key ? <ChevronDown className="size-4 text-ink-3" /> : <ChevronRight className="size-4 text-ink-3" />}
            {title}
            <span className={cn("ml-auto text-[13px]", tone === "warn" ? "text-warn" : "text-ink-3")}>{count}</span>
          </button>
          {open === key ? <div className="px-5 pb-4">{body}</div> : null}
        </div>
      ) : null;
    const nothing = !c.contactsNew && !c.contactsUpdated && !c.interactions;

    return (
      <div className="space-y-4">
        <Card className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
            <div>
              <h2 className="section-title">Preview</h2>
              <p className="text-[13px] text-ink-3">{loaded.fileName}. Nothing is saved until you press Import.</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-px border-y border-divider bg-divider sm:grid-cols-3 lg:grid-cols-6">
            {[
              [c.contactsNew, "New contacts"],
              [c.contactsUpdated, "Updated"],
              [c.interactions, "Interactions"],
              [c.tasks, "Next steps → tasks"],
              [c.skipped, "Skipped"],
              [c.errors, "Errors"],
            ].map(([v, l]) => (
              <div key={l} className="bg-surface px-4 py-3">
                <StatTile value={v as number} label={l as string} tone={l === "Errors" && (v as number) > 0 ? "warn" : undefined} />
              </div>
            ))}
          </div>

          {preview.suggestions.length || preview.firmSuggestions.length ? (
            <div className="space-y-3 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">Values that need a decision</p>
                {acceptAll ? (
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => reissue(false, [])}>
                    Undo accept all
                  </Button>
                ) : (
                  <Button size="sm" variant="primary" disabled={busy} onClick={() => reissue(true, acceptFirms)}>
                    Accept all suggestions
                  </Button>
                )}
              </div>
              <ul className="space-y-1.5 text-[13px]">
                {preview.firmSuggestions.map((s) => {
                  const on = acceptAll || acceptFirms.includes(s.from);
                  return (
                    <li key={s.from} className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={acceptAll || busy}
                          onChange={() => reissue(acceptAll, on ? acceptFirms.filter((f) => f !== s.from) : [...acceptFirms, s.from])}
                        />
                        <span className="text-ink-2">
                          Firm &quot;{s.from}&quot; → <span className="font-medium text-ink">{s.to}</span>?
                        </span>
                      </label>
                      <span className="text-ink-3">
                        {s.count} {s.count === 1 ? "row" : "rows"} · {on ? "will use the existing firm" : "will create a new firm"}
                      </span>
                    </li>
                  );
                })}
                {preview.suggestions.map((s) => (
                  <li key={`${s.field}|${s.value}`} className="text-ink-2">
                    {s.field}: &quot;{s.value}&quot; → <span className="font-medium text-ink">{s.suggestion}</span>
                    <span className="text-ink-3">
                      {" "}
                      · {s.count} {s.count === 1 ? "row" : "rows"} · {acceptAll ? "accepted" : s.field === "Interaction Type" ? "rows held back until accepted" : "left blank unless accepted"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {section(
            "new",
            "New contacts",
            c.contactsNew,
            <ul className="grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2">
              {preview.newContacts.map((n, i) => (
                <li key={i} className="truncate text-ink-2">
                  <span className="font-medium text-ink">{n.name}</span> · {n.firm}
                  {n.list === "network" ? <span className="text-ink-3"> · Network</span> : null}
                </li>
              ))}
              {c.contactsNew > preview.newContacts.length ? <li className="text-ink-3">…and {c.contactsNew - preview.newContacts.length} more</li> : null}
            </ul>,
          )}
          {section(
            "updated",
            "Updated contacts",
            c.contactsUpdated,
            <ul className="space-y-3 text-[13px]">
              {preview.updatedContacts.map((u) => (
                <li key={u.id}>
                  <p className="font-medium text-ink">
                    {u.name} <span className="font-normal text-ink-3">· {u.firm}</span>
                  </p>
                  <ul className="mt-1 space-y-0.5 pl-3">
                    {u.diff.map((d, i) => (
                      <li key={i} className="text-ink-2">
                        <span className="text-ink-3">{d.field}: </span>
                        {d.action === "fill" ? (
                          <>
                            add <span className="text-ink">{d.incoming}</span>
                          </>
                        ) : d.action === "append" ? (
                          <>
                            add <span className="text-ink">{d.incoming}</span>
                          </>
                        ) : d.action === "restore" ? (
                          "restore from Trash"
                        ) : (
                          <>
                            keeps <span className="text-ink">{d.current}</span> <span className="text-ink-3">(file says {d.incoming})</span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>,
          )}
          {section(
            "interactions",
            "New interactions",
            c.interactions,
            <ul className="divide-y divide-divider text-[13px]">
              {preview.newInteractions.map((n, i) => (
                <li key={i} className="flex gap-3 py-1.5">
                  <span className="w-24 shrink-0 text-ink-3">{n.date}</span>
                  <span className="w-40 shrink-0 truncate font-medium text-ink">{n.name}</span>
                  <span className="w-36 shrink-0 text-ink-2">{n.type}</span>
                  <span className="truncate text-ink-3">{n.summary}</span>
                </li>
              ))}
            </ul>,
          )}
          {section("skipped", "Skipped (duplicates or nothing new)", c.skipped, issueList(preview.skipped))}
          {section("warnings", "Warnings", preview.warnings.length, issueList(preview.warnings), "warn")}
          {section(
            "errors",
            "Errors",
            c.errors,
            <div className="space-y-2">
              {issueList(preview.errors)}
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  downloadCsv(
                    "import-errors.csv",
                    ["Tab", "Row", "Reason", "Row values…"],
                    preview.errors.map((e) => [e.tab, e.row, e.reason, ...e.raw]),
                  )
                }
              >
                <Download className="size-4" /> Download error rows
              </Button>
            </div>,
            "warn",
          )}
        </Card>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" disabled={busy || nothing} onClick={() => void requestPreview(loaded, { acceptSuggestions: acceptAll, acceptFirms }, true)}>
            {busy ? "Working…" : nothing ? "Nothing new to import" : `Import ${[c.contactsNew + c.contactsUpdated ? `${c.contactsNew + c.contactsUpdated} contacts` : "", c.interactions ? `${c.interactions} interactions` : ""].filter(Boolean).join(" and ")}`}
          </Button>
          <Button variant="secondary" onClick={reset} disabled={busy}>
            Start over
          </Button>
          {c.errors ? <span className="text-[13px] text-ink-3">Rows with errors are left out. Fix them in your file and upload again; nothing gets duplicated.</span> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title="Rolodex file" action={<span className="rounded bg-accent-tint px-2 py-0.5 text-xs font-semibold text-accent">Recommended</span>}>
        <div className="space-y-3">
          <p className="text-[13px] text-ink-2">Everyone you know plus every email, call, and meeting with its real date. Prospect works out last contacted, stage, and reminders from it.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" asChild>
              <a href="/templates/Prospect_Rolodex_Import_Template.xlsx" download>
                <Download className="size-4" /> Download template
              </a>
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                void navigator.clipboard.writeText(CLAUDE_CONVERT_PROMPT).then(
                  () => toast("Prompt copied. Paste it into Claude with the template and your own spreadsheet attached."),
                  () => toast.error("Couldn't copy."),
                )
              }
            >
              Copy Claude prompt
            </Button>
          </div>
          <p className="text-[13px] text-ink-3">Have your own spreadsheet? Attach it and the template in Claude, paste the prompt, and upload what it gives back.</p>
          <DropZone accept=".xlsx,.xls,.csv" multiple label={busy ? "Reading…" : "Drop the .xlsx here"} hint="Or the Contacts and Interactions CSVs together" onFiles={(f) => void readFiles(f, "rolodex_template")} />
        </div>
      </Card>
      <Card title="LinkedIn connections">
        <div className="space-y-3">
          <ol className="list-decimal space-y-1 pl-4 text-[13px] text-ink-2">
            <li>On LinkedIn, open Settings &amp; Privacy → Data privacy → Get a copy of your data.</li>
            <li>Pick Connections and request the archive. LinkedIn emails it within about 10 minutes.</li>
            <li>Unzip it and upload Connections.csv here.</li>
          </ol>
          <p className="text-[13px] text-ink-3">Connections go to your Network list with no interactions, so your follow-up list stays focused. Move people to Contacts when you start reaching out.</p>
          <DropZone accept=".csv" label={busy ? "Reading…" : "Drop Connections.csv here"} hint="LinkedIn's export, unchanged" onFiles={(f) => void readFiles(f, "linkedin")} />
        </div>
      </Card>
      <Card title="Other CSV">
        <div className="space-y-3">
          <p className="text-[13px] text-ink-2">Any list of people. You match its columns to Prospect&apos;s fields on the next step.</p>
          <p className="text-[13px] text-ink-3">This brings in contacts only. To bring in interactions with dates, use the Rolodex template.</p>
          <DropZone accept=".csv,.xlsx,.xls" label={busy ? "Reading…" : "Drop a .csv here"} hint="First sheet of an .xlsx works too" onFiles={(f) => void readFiles(f.slice(0, 1), "csv")} />
        </div>
      </Card>
    </div>
  );
}
