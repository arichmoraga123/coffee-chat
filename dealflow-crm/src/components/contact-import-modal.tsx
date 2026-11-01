"use client";

import { useCallback, useState } from "react";
import { Upload } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  autoDetectMapping,
  IMPORT_FIELD_OPTIONS,
  isLinkedInExport,
  linkedInAutoMapping,
  mapRowToContact,
  parseSpreadsheetFile,
  type ImportField,
  type MappedContactRow,
} from "@/lib/contact-import";
import { Select } from "@/components/ui/select";

type Step = 1 | 2 | 3 | 4;

type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
  importedIds: string[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onImported: (ids: string[]) => void;
};

export function ContactImportModal({ open, onClose, onImported }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, ImportField>>({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep(1);
    setFile(null);
    setHeaders([]);
    setRows([]);
    setMapping({});
    setSkipDuplicates(true);
    setImporting(false);
    setProgress(0);
    setResult(null);
    setError(null);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const processFile = async (f: File) => {
    setError(null);
    if (f.size > 10 * 1024 * 1024) {
      setError("File exceeds 10MB limit.");
      return;
    }
    try {
      const parsed = await parseSpreadsheetFile(f);
      if (!parsed.headers.length) {
        setError("No data found in file.");
        return;
      }
      setFile(f);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      if (parsed.isLinkedIn || isLinkedInExport(parsed.headers)) {
        setMapping(linkedInAutoMapping());
        setStep(3);
      } else {
        setMapping(autoDetectMapping(parsed.headers));
        setStep(2);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse file");
    }
  };

  const previewMapped = rows
    .slice(0, 5)
    .map((r) => mapRowToContact(r, mapping))
    .filter((r): r is MappedContactRow => r !== null);

  const totalToImport = rows.filter((r) => mapRowToContact(r, mapping) !== null).length;

  const runImport = async () => {
    if (!file) return;
    setImporting(true);
    setStep(4);
    setProgress(30);
    const form = new FormData();
    form.append("file", file);
    form.append("mapping", JSON.stringify(mapping));
    form.append("skipDuplicates", String(skipDuplicates));
    setProgress(60);
    const res = await fetch("/api/contacts/import", { method: "POST", body: form });
    const data = (await res.json()) as ImportResult & { error?: string };
    setProgress(100);
    setImporting(false);
    if (!res.ok) {
      setError(data.error ?? "Import failed");
      return;
    }
    setResult(data);
  };

  return (
    <Modal open={open} onClose={handleClose} title="Import Contacts" className="max-w-3xl">
      {step === 1 && (
        <div className="space-y-4">
          <div
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border-strong bg-surface px-6 py-10 transition-colors hover:border-ink-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) void processFile(f);
            }}
            onClick={() => document.getElementById("import-file-input")?.click()}
          >
            <Upload className="mb-2 h-8 w-8 text-ink-3" />
            <p className="text-sm text-ink-2">Drag and drop a .csv or .xlsx file here</p>
            <p className="mt-1 text-xs text-ink-3">or click to browse · 10MB max</p>
            <input
              id="import-file-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void processFile(f);
              }}
            />
          </div>
          <p className="rounded border border-warn/40 bg-warn-bg px-3 py-2 text-xs text-warn">
            Pro tip: Export your LinkedIn connections from LinkedIn Settings → Data Privacy → Get a copy of your data → Connections
          </p>
          {/* API file download, not a page navigation */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/api/contacts/import-template"
            download
            className="inline-block text-sm text-ink-2 underline-offset-4 hover:text-ink hover:underline"
          >
            Download sample CSV template
          </a>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-ink-2">Map your columns to contact fields.</p>
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-surface">
                  {headers.map((h, i) => (
                    <th key={i} className="px-2 py-2 text-left font-normal text-ink-3">
                      <div className="mb-1 font-medium text-ink-2">{h || `Column ${i + 1}`}</div>
                      <Select
                        className="w-full min-w-[120px]"
                        value={mapping[i] ?? "skip"}
                        onChange={(e) =>
                          setMapping((m) => ({ ...m, [i]: e.target.value as ImportField }))
                        }
                      >
                        {IMPORT_FIELD_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 3).map((row, ri) => (
                  <tr key={ri} className="border-t border-border">
                    {headers.map((_, ci) => (
                      <td key={ci} className="max-w-[140px] truncate px-2 py-1.5 text-ink-2">
                        {row[ci] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button size="sm" onClick={() => setStep(3)}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-ink">
            Ready to import {totalToImport} contact{totalToImport !== 1 ? "s" : ""}
          </p>
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full text-xs">
              <thead className="border-b border-border bg-surface text-left text-ink-3">
                <tr>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Firm</th>
                  <th className="px-2 py-2">Title</th>
                  <th className="px-2 py-2">Email</th>
                </tr>
              </thead>
              <tbody>
                {previewMapped.map((c, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-2 py-1.5">{c.fullName}</td>
                    <td className="px-2 py-1.5">{c.firm}</td>
                    <td className="px-2 py-1.5">{c.title}</td>
                    <td className="px-2 py-1.5">{c.email || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-2">
            <input
              type="checkbox"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
              className="rounded"
            />
            Skip duplicates (by email or name+firm)
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep(isLinkedInExport(headers) ? 1 : 2)}>
              Back
            </Button>
            <Button size="sm" onClick={() => void runImport()}>
              Import Contacts
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          {importing ? (
            <>
              <p className="text-sm text-ink-2">Importing contacts…</p>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full bg-success transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          ) : result ? (
            <div className="space-y-2 text-sm">
              <p className="text-success">✓ Imported {result.imported} contacts</p>
              {result.skipped > 0 ? (
                <p className="text-warn">⚠ Skipped {result.skipped} duplicates</p>
              ) : null}
              {result.errors.length > 0 ? (
                <p className="text-danger">
                  ✗ {result.errors.length} error{result.errors.length !== 1 ? "s" : ""} (missing required fields)
                </p>
              ) : null}
              {result.errors.slice(0, 5).map((e, i) => (
                <p key={i} className="text-xs text-danger">
                  {e}
                </p>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={handleClose}>
                  Close
                </Button>
                {result.imported > 0 ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      onImported(result.importedIds);
                      handleClose();
                    }}
                  >
                    View imported contacts
                  </Button>
                ) : null}
              </div>
            </div>
          ) : error ? (
            <p className="text-sm text-danger">{error}</p>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
