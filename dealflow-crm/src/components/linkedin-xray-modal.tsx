"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  open: boolean;
  onClose: () => void;
  schoolName: string;
  onSaveToQueue: (data: { fullName: string; firmName: string; title: string }) => void;
};

function buildXRayQuery(firm: string, title: string, school: string, name: string) {
  const parts = ['site:linkedin.com/in'];
  if (firm) parts.push(`"${firm}"`);
  if (title) parts.push(`"${title}"`);
  if (school) parts.push(`"${school}"`);
  if (name) parts.push(`"${name}"`);
  return parts.join(" ");
}

export function LinkedInXRayModal({ open, onClose, schoolName, onSaveToQueue }: Props) {
  const [firm, setFirm] = useState("");
  const [title, setTitle] = useState("");
  const [school, setSchool] = useState(schoolName || "Michigan State");
  const [name, setName] = useState("");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickFirm, setQuickFirm] = useState("");
  const [quickTitle, setQuickTitle] = useState("");

  const query = useMemo(
    () => buildXRayQuery(firm, title, school, name),
    [firm, title, school, name],
  );
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

  const presets = [
    { label: `${firm || "Goldman Sachs"} Analysts from ${schoolName || "your school"}`, firm: firm || "Goldman Sachs", title: "Analyst", school: schoolName },
    { label: "KKR Associates from Big Ten", firm: "KKR", title: "Associate", school: "Big Ten" },
    { label: `Bulge Bracket IB from ${schoolName || "your school"}`, firm: "Goldman Sachs OR Morgan Stanley OR JPMorgan", title: "Investment Banking", school: schoolName },
    { label: `PE Firms from ${schoolName || "your school"}`, firm: "KKR OR Blackstone OR Apollo", title: "Private Equity", school: schoolName },
    { label: `McKinsey from ${schoolName || "your school"}`, firm: "McKinsey", title: "", school: schoolName },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Find Contacts — LinkedIn X-Ray" className="max-w-lg">
      <div className="space-y-3 text-sm">
        <div>
          <label className="mb-1 block text-xs text-ink-3">Firm/Company *</label>
          <Input value={firm} onChange={(e) => setFirm(e.target.value)} placeholder="Goldman Sachs" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-3">Title/Role</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Analyst, Associate, VP..." />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-3">School</label>
          <Input value={school} onChange={(e) => setSchool(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-3">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              className="rounded border border-border-strong bg-surface px-2 py-1 text-[10px] text-ink-2 hover:border-border-strong hover:text-ink"
              onClick={() => {
                setFirm(p.firm);
                setTitle(p.title);
                setSchool(p.school || schoolName);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {firm.trim() ? (
          <div className="space-y-2 rounded border border-border bg-surface p-3">
            <pre className="overflow-x-auto whitespace-pre-wrap break-all text-xs text-ink-2">{query}</pre>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => window.open(googleUrl, "_blank")}>
                Open in Google
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void navigator.clipboard.writeText(query)}
              >
                Copy query
              </Button>
            </div>
          </div>
        ) : null}

        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => {
            setQuickName(name);
            setQuickFirm(firm);
            setQuickTitle(title);
            setShowQuickAdd(true);
          }}
        >
          Save to Outreach Queue
        </Button>

        {showQuickAdd ? (
          <div className="space-y-2 rounded border border-success/40 bg-success-bg p-3">
            <Input placeholder="Name" value={quickName} onChange={(e) => setQuickName(e.target.value)} />
            <Input placeholder="Firm" value={quickFirm} onChange={(e) => setQuickFirm(e.target.value)} />
            <Input placeholder="Title" value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)} />
            <Button
              size="sm"
              disabled={!quickName.trim() || !quickFirm.trim()}
              onClick={() => {
                onSaveToQueue({
                  fullName: quickName.trim(),
                  firmName: quickFirm.trim(),
                  title: quickTitle.trim() || "Unknown",
                });
                setShowQuickAdd(false);
                onClose();
              }}
            >
              Add to queue
            </Button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
