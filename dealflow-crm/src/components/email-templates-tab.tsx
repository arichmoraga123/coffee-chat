"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Star } from "lucide-react";

type Tpl = {
  id: string;
  title: string;
  category: string;
  subject: string | null;
  body: string;
  tags: string[];
  upvotes: number;
  isOfficial: boolean;
};

const CATS = ["All", "Thank You", "Cold Outreach", "Follow Up", "Referral Request", "Decline Offer", "Re-engage"] as const;

export function EmailTemplatesTab() {
  const [tab, setTab] = useState<string>("All");
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [upvoted, setUpvoted] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customBody, setCustomBody] = useState("");
  const [cForm, setCForm] = useState({ yourName: "", contactName: "", firm: "" });
  const [submit, setSubmit] = useState({ title: "", category: "Thank You", subject: "", body: "", tags: "" });

  const load = useCallback(async () => {
    const p = new URLSearchParams();
    if (tab !== "All") p.set("category", tab);
    const res = await fetch(`/api/email-templates?${p}`);
    if (!res.ok) return;
    const d = (await res.json()) as { templates: Tpl[]; upvoted: string[] };
    setTemplates(d.templates);
    setUpvoted(d.upvoted);
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleUp = async (id: string) => {
    await fetch(`/api/email-templates/${id}/upvote`, { method: "POST" });
    void load();
  };

  const selected = templates.find((t) => t.id === openId);

  const customize = async () => {
    const res = await fetch("/api/email-templates/customize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template: customBody,
        yourName: cForm.yourName,
        contactName: cForm.contactName,
        firm: cForm.firm,
      }),
    });
    const d = await res.json();
    if (!(d as { body?: string }).body) {
      alert((d as { error?: string }).error ?? "Failed");
      return;
    }
    setCustomBody((d as { body: string }).body);
  };

  const submitTpl = async () => {
    const res = await fetch("/api/email-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: submit.title,
        category: submit.category,
        subject: submit.subject || null,
        body: submit.body,
        tags: submit.tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    });
    if (!res.ok) return;
    setSubmit({ title: "", category: "Thank You", subject: "", body: "", tags: "" });
    void load();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        <span className="text-emerald-400/90">SHARED</span> template library
      </p>
      <div className="flex flex-wrap gap-2">
        {CATS.map((c) => (
          <Button key={c} size="sm" variant={tab === c ? "default" : "outline"} onClick={() => setTab(c)}>
            {c}
          </Button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.id} className="space-y-2 border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs">{t.category}</span>
              {t.isOfficial ? (
                <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
                  <Star className="size-3 fill-amber-400" /> Official
                </span>
              ) : null}
              <span className="text-xs text-zinc-500">{t.upvotes} upvotes</span>
            </div>
            <p className="font-semibold text-zinc-100">{t.title}</p>
            <p className="line-clamp-2 text-sm text-zinc-400">{t.body.slice(0, 160)}…</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setOpenId(t.id)}>
                Expand
              </Button>
              <Button size="sm" variant="outline" onClick={() => void toggleUp(t.id)}>
                {upvoted.includes(t.id) ? "− Upvote" : "+ Upvote"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <Card className="space-y-2 border-zinc-800 bg-zinc-900/50 p-4">
        <p className="font-medium text-zinc-200">Submit template</p>
        <Input placeholder="Title" value={submit.title} onChange={(e) => setSubmit((s) => ({ ...s, title: e.target.value }))} />
        <select className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm" value={submit.category} onChange={(e) => setSubmit((s) => ({ ...s, category: e.target.value }))}>
          {CATS.filter((c) => c !== "All").map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Input placeholder="Subject (optional)" value={submit.subject} onChange={(e) => setSubmit((s) => ({ ...s, subject: e.target.value }))} />
        <textarea className="min-h-[120px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm" placeholder="Body" value={submit.body} onChange={(e) => setSubmit((s) => ({ ...s, body: e.target.value }))} />
        <Input placeholder="Tags comma-separated" value={submit.tags} onChange={(e) => setSubmit((s) => ({ ...s, tags: e.target.value }))} />
        <Button size="sm" onClick={() => void submitTpl()}>
          Submit
        </Button>
      </Card>
      <Modal open={Boolean(selected)} onClose={() => setOpenId(null)} title={selected?.title ?? ""} className="max-w-lg">
        {selected ? (
          <div className="space-y-3 text-sm">
            {selected.subject ? <p className="text-zinc-400">Subject: {selected.subject}</p> : null}
            <pre className="whitespace-pre-wrap rounded bg-zinc-950 p-3 text-zinc-200">{selected.body}</pre>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(selected.body);
              }}
            >
              Copy body
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setCustomBody(selected.body);
                setCustomOpen(true);
              }}
            >
              Customize with AI
            </Button>
          </div>
        ) : null}
      </Modal>
      <Modal open={customOpen} onClose={() => setCustomOpen(false)} title="Customize with AI" className="max-w-lg">
        <div className="grid gap-2 text-sm">
          <Input placeholder="Your name" value={cForm.yourName} onChange={(e) => setCForm((c) => ({ ...c, yourName: e.target.value }))} />
          <Input placeholder="Contact first name" value={cForm.contactName} onChange={(e) => setCForm((c) => ({ ...c, contactName: e.target.value }))} />
          <Input placeholder="Their firm" value={cForm.firm} onChange={(e) => setCForm((c) => ({ ...c, firm: e.target.value }))} />
          <textarea className="min-h-[160px] w-full rounded border border-zinc-700 bg-zinc-950 p-2" value={customBody} onChange={(e) => setCustomBody(e.target.value)} />
          <Button size="sm" onClick={() => void customize()}>
            Run AI
          </Button>
        </div>
      </Modal>
    </div>
  );
}
