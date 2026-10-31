"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Result = { fileName: string; ok: boolean; error?: string; version?: number };

/** Drop all 14 files at once: key and kind come from the file names (PEB_0X_Name.xlsx / _KEY.xlsx). */
export function WorkbookUploader({ keys }: { keys: string[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [key, setKey] = useState("");
  const [kind, setKind] = useState<"student" | "answer_key">("student");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const single = files.length === 1;

  const upload = async () => {
    if (!files.length) return;
    setBusy(true);
    setResults(null);
    const fd = new FormData();
    for (const f of files) fd.append("files", f);
    if (single) {
      if (key) fd.append("workbookKey", key);
      fd.append("kind", kind);
      if (title.trim()) fd.append("title", title.trim());
      if (description.trim()) fd.append("description", description.trim());
    }
    try {
      const res = await fetch("/api/admin/learn/resources", { method: "POST", body: fd, credentials: "same-origin" });
      const data = (await res.json()) as { results?: Result[]; error?: string };
      setResults(data.results ?? [{ fileName: "upload", ok: false, error: data.error ?? "Upload failed" }]);
      if (data.results?.some((r) => r.ok)) router.refresh();
      setFiles([]);
      if (input.current) input.current.value = "";
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="space-y-3 rounded-xl border border-dashed border-white/20 bg-zinc-900/40 p-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        setFiles(Array.from(e.dataTransfer.files).filter((f) => f.name.toLowerCase().endsWith(".xlsx")));
      }}
    >
      <p className="text-sm text-zinc-300">
        Drag in one or more <code>.xlsx</code> files (max 10 MB each), or{" "}
        <button type="button" className="text-[#a8c0e6] underline" onClick={() => input.current?.click()}>
          choose files
        </button>
        . Names like <code>PEB_03_CAPM_Beta_WACC.xlsx</code> and <code>PEB_03_CAPM_Beta_WACC_KEY.xlsx</code> are matched
        automatically. Re-uploading creates a new version.
      </p>
      <input
        ref={input}
        type="file"
        multiple
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
      />
      {files.length ? (
        <ul className="text-xs text-zinc-400">
          {files.map((f) => (
            <li key={f.name}>
              {f.name} · {Math.round(f.size / 1024)} KB
            </li>
          ))}
        </ul>
      ) : null}
      {single ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-zinc-400">
            Workbook (blank = from file name)
            <select value={key} onChange={(e) => setKey(e.target.value)} className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm">
              <option value="">From file name</option>
              {keys.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-zinc-400">
            Kind
            <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm">
              <option value="student">Student workbook</option>
              <option value="answer_key">Answer key</option>
            </select>
          </label>
          <label className="text-xs text-zinc-400">
            Title (optional)
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs text-zinc-400">
            Description (optional)
            <input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm" />
          </label>
        </div>
      ) : null}
      <Button type="button" disabled={busy || !files.length} onClick={() => void upload()}>
        {busy ? "Uploading…" : `Upload ${files.length || ""} file${files.length === 1 ? "" : "s"}`}
      </Button>
      {results ? (
        <ul className="space-y-1 text-sm">
          {results.map((r) => (
            <li key={r.fileName} className={r.ok ? "text-emerald-300" : "text-red-300"}>
              {r.ok ? "✓" : "✗"} {r.fileName} {r.ok ? `→ v${r.version}` : `— ${r.error}`}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
