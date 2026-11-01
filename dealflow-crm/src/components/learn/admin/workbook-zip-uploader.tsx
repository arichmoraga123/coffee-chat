"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Row = { fileName: string; workbookKey: string | null; kind: string | null; nextVersion: number | null; sizeBytes: number; status: "new" | "update" | "skip"; reason?: string };

/** Upload the whole workbook zip: see what it contains, then confirm to create new versions. */
export function WorkbookZipUploader() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<{ rows: Row[]; missing: string[]; storage: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async (f: File, confirm: boolean) => {
    setBusy(true);
    const fd = new FormData();
    fd.append("file", f);
    if (confirm) fd.append("confirm", "1");
    const res = await fetch("/api/admin/learn/resources/zip", { method: "POST", body: fd });
    setBusy(false);
    const d = (await res.json().catch(() => ({}))) as { summary?: Row[]; missing?: string[]; storage?: boolean; created?: number; error?: string };
    if (!res.ok) return toast.error(d.error ?? "Upload failed.");
    if (confirm) {
      toast(`Uploaded ${d.created} files as new versions`);
      setFile(null);
      setSummary(null);
      router.refresh();
      return;
    }
    setSummary({ rows: d.summary ?? [], missing: d.missing ?? [], storage: Boolean(d.storage) });
  };

  const ok = summary?.rows.filter((r) => r.status !== "skip") ?? [];
  return (
    <div className="space-y-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-ink">Upload the whole set (.zip)</p>
          <p className="text-[13px] text-ink-3">For example PEB_Practice_Workbooks_v2.zip. You&apos;ll see what changes before anything is saved.</p>
        </div>
        <Button variant="secondary" size="sm" disabled={busy} onClick={() => input.current?.click()}>
          {file ? "Choose another zip" : "Choose zip"}
        </Button>
        <input
          ref={input}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setFile(f);
            setSummary(null);
            void send(f, false);
          }}
        />
      </div>
      {busy && !summary ? <p className="text-[13px] text-ink-3">Reading {file?.name}…</p> : null}
      {summary ? (
        <div className="space-y-3">
          <p className="text-sm text-ink">
            {file?.name}: {summary.rows.filter((r) => r.status === "new").length} new, {summary.rows.filter((r) => r.status === "update").length} new versions, {summary.rows.filter((r) => r.status === "skip").length} skipped.
          </p>
          <div className="max-h-80 overflow-y-auto rounded-[var(--radius)] border border-border">
            <table className="w-full text-left text-[13px]">
              <thead className="sticky top-0 bg-surface-2 text-xs text-ink-3">
                <tr>
                  <th className="px-3 py-1.5">File</th>
                  <th className="px-3 py-1.5">Kind</th>
                  <th className="px-3 py-1.5">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {summary.rows.map((r) => (
                  <tr key={r.fileName}>
                    <td className="px-3 py-1.5 text-ink">{r.fileName}</td>
                    <td className="px-3 py-1.5 text-ink-2">{r.kind === "answer_key" ? "Answer key" : r.kind === "student" ? "Student" : "—"}</td>
                    <td className={`px-3 py-1.5 ${r.status === "skip" ? "text-warn" : "text-ink-2"}`}>{r.status === "skip" ? `Skipped: ${r.reason}` : r.status === "new" ? "New" : `Version ${r.nextVersion}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {summary.missing.length ? <p className="text-[13px] text-warn">Not in this zip: {summary.missing.join(", ")}</p> : null}
          {!summary.storage ? <p className="text-[13px] text-warn">Storage isn&apos;t connected, so this can&apos;t be saved yet.</p> : null}
          <div className="flex gap-2">
            <Button variant="primary" disabled={busy || !ok.length || !summary.storage} onClick={() => file && void send(file, true)}>
              {busy ? "Uploading…" : `Confirm and upload ${ok.length} files`}
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setFile(null);
                setSummary(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
