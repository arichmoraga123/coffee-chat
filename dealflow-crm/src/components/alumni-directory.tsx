"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Row = {
  id: string;
  firmName: string;
  role: string;
  vertical: string;
  gradYear: number | null;
  linkedinUrl: string | null;
  openToChat: boolean;
  anonymous: boolean;
};

export function AlumniDirectory({
  initialSchoolId,
  initialSchoolName,
}: {
  initialSchoolId: string | null;
  initialSchoolName: string | null;
}) {
  const [firmName, setFirmName] = useState("");
  const [vertical, setVertical] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [schoolName, setSchoolName] = useState(initialSchoolName);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (firmName.trim()) p.set("firmName", firmName.trim());
    if (vertical.trim()) p.set("vertical", vertical.trim());
    if (gradYear.trim()) p.set("gradYear", gradYear.trim());
    const res = await fetch(`/api/school-alumni?${p.toString()}`);
    if (res.ok) {
      const d = (await res.json()) as { alumni: Row[]; schoolName: string | null };
      setRows(d.alumni ?? []);
      setSchoolName(d.schoolName);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [form, setForm] = useState({
    firmName: "",
    role: "",
    vertical: "",
    gradYear: "",
    linkedinUrl: "",
    openToChat: false,
    anonymous: false,
  });
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  const submit = async () => {
    if (!initialSchoolId) {
      setSubmitErr("Set your school (onboarding or profile) to submit alumni.");
      return;
    }
    setSubmitErr(null);
    setSubmitBusy(true);
    const res = await fetch("/api/school-alumni", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schoolId: initialSchoolId,
        firmName: form.firmName,
        role: form.role,
        vertical: form.vertical,
        gradYear: form.gradYear ? Number(form.gradYear) : null,
        linkedinUrl: form.linkedinUrl || null,
        openToChat: form.openToChat,
        anonymous: form.anonymous,
      }),
    });
    setSubmitBusy(false);
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setSubmitErr(d.error ?? "Submit failed");
      return;
    }
    setForm({
      firmName: "",
      role: "",
      vertical: "",
      gradYear: "",
      linkedinUrl: "",
      openToChat: false,
      anonymous: false,
    });
    void load();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Alumni directory</h1>
        <p className="mt-1 text-sm text-ink-3">
          {schoolName ? (
            <>
              Showing alumni for <span className="text-ink-2">{schoolName}</span>. Add contacts to your{" "}
              <Link href="/contacts" className="text-warn hover:underline">
                rolodex
              </Link>{" "}
              as you network.
            </>
          ) : (
            "Set your school to see and submit alumni for your campus."
          )}
        </p>
      </div>

      <Card className="border-border bg-surface p-4">
        <p className="text-sm font-medium text-ink">Filters</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input
            className="rounded border border-border-strong bg-surface px-2 py-1.5 text-sm text-ink"
            placeholder="Firm"
            value={firmName}
            onChange={(e) => setFirmName(e.target.value)}
          />
          <input
            className="rounded border border-border-strong bg-surface px-2 py-1.5 text-sm text-ink"
            placeholder="Vertical"
            value={vertical}
            onChange={(e) => setVertical(e.target.value)}
          />
          <input
            className="rounded border border-border-strong bg-surface px-2 py-1.5 text-sm text-ink"
            placeholder="Grad year"
            value={gradYear}
            onChange={(e) => setGradYear(e.target.value)}
          />
        </div>
        <Button type="button" size="sm" className="mt-3" variant="outline" onClick={() => void load()} disabled={loading}>
          Apply
        </Button>
      </Card>

      {loading ? <p className="text-sm text-ink-3">Loading…</p> : null}

      <div className="space-y-2">
        {rows.map((r) => (
          <Card key={r.id} className="border-border bg-surface p-4">
            <p className="font-medium text-ink">
              {r.anonymous ? "Anonymous alum" : `${r.firmName} · ${r.role}`}
            </p>
            <p className="text-xs text-ink-3">
              {r.vertical}
              {r.gradYear != null ? ` · ’${String(r.gradYear).slice(-2)}` : ""}
              {r.openToChat ? " · Open to chat" : ""}
            </p>
            {r.linkedinUrl && !r.anonymous ? (
              <a href={r.linkedinUrl} className="mt-1 inline-block text-xs text-warn hover:underline" target="_blank" rel="noreferrer">
                LinkedIn
              </a>
            ) : null}
          </Card>
        ))}
        {!loading && rows.length === 0 ? <p className="text-sm text-ink-3">No alumni rows yet.</p> : null}
      </div>

      <Card className="border-border bg-surface p-6">
        <h2 className="text-lg font-medium text-ink">Submit alumni</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {(["firmName", "role", "vertical", "gradYear", "linkedinUrl"] as const).map((k) => (
            <input
              key={k}
              className="rounded border border-border-strong bg-surface px-2 py-1.5 text-sm text-ink"
              placeholder={k}
              value={form[k]}
              onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
            />
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" checked={form.openToChat} onChange={(e) => setForm((f) => ({ ...f, openToChat: e.target.checked }))} />
          Open to chat
        </label>
        <label className="mt-2 flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" checked={form.anonymous} onChange={(e) => setForm((f) => ({ ...f, anonymous: e.target.checked }))} />
          List as anonymous
        </label>
        {submitErr ? <p className="mt-2 text-sm text-danger">{submitErr}</p> : null}
        <Button type="button" className="mt-4" disabled={submitBusy} onClick={() => void submit()}>
          {submitBusy ? "Submitting…" : "Submit"}
        </Button>
      </Card>
    </div>
  );
}
