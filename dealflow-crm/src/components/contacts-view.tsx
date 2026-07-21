"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { subDays } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";
import { FIRM_TYPE_ORDER, FIRM_TYPE_LABELS, FirmTypeBadge } from "@/lib/firm-type";
import type { FirmType } from "@prisma/client";
import { ContactImportModal } from "@/components/contact-import-modal";
import { LinkedInXRayModal } from "@/components/linkedin-xray-modal";
import { ContactEmailDropdown, ContactRowMenu } from "@/components/contact-email-dropdown";
import { OutreachQueuePanel } from "@/components/outreach-queue-panel";
import { BulkEmailDraftModal, BulkOutreachBar } from "@/components/bulk-outreach-bar";
import { AiOutputModal } from "@/components/ai-output-modal";
import { subjectLineForContact } from "@/lib/email-template-types";

type ContactRow = {
  id: string;
  fullName: string;
  email: string;
  linkedinUrl: string | null;
  firmName: string;
  firmType: FirmType | null;
  firmId: string;
  group: string;
  title: string;
  relationshipStrength: number;
  referralProbability: string;
  recruitingCategory: string;
  lastInteractionDate: string | null;
  followUpStatus: "green" | "yellow" | "red";
  warmthScore: string;
  source: string | null;
  inOutreachQueue: boolean;
  queueExcluded: boolean;
  createdAt: string;
};

type FirmOption = { id: string; name: string };
type Tab = "all" | "queue" | "recent";

export function ContactsView({
  initialContacts,
  firms,
  schoolName,
  initialTab = "all",
  importFilter = false,
}: {
  initialContacts: ContactRow[];
  firms: FirmOption[];
  schoolName: string;
  initialTab?: string;
  importFilter?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState(initialContacts);
  const [tab, setTab] = useState<Tab>(
    initialTab === "queue" ? "queue" : initialTab === "recent" ? "recent" : "all",
  );
  const [importedOnly, setImportedOnly] = useState(importFilter);
  const [firmFilter, setFirmFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [minStrength, setMinStrength] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showImport, setShowImport] = useState(false);
  const [showXRay, setShowXRay] = useState(false);
  const [showBulkDraft, setShowBulkDraft] = useState(false);
  const [showC, setShowC] = useState(false);
  const [showI, setShowI] = useState(false);
  const [showT, setShowT] = useState(false);
  const [quickLogContactId, setQuickLogContactId] = useState("");
  const [intelligenceNote, setIntelligenceNote] = useState<string | null>(null);
  const [aiModal, setAiModal] = useState({
    open: false,
    title: "",
    text: "",
    loading: false,
    error: null as string | null,
  });

  const [contactForm, setContactForm] = useState({
    fullName: "",
    email: "",
    linkedinUrl: "",
    firmId: firms[0]?.id ?? "",
    firmName: "",
    firmType: "" as FirmType | "",
    group: "",
    title: "Analyst",
    location: "",
    school: "",
    recruitingCategory: "IB",
    relationshipStrength: 1,
    referralProbability: "MEDIUM",
    notes: "",
    lastInteractionDate: new Date().toISOString().slice(0, 10),
    undergradSchool: "",
    gradSchool: "",
    graduationYear: "",
    hometown: "",
    previousFirms: "",
    careerPath: "",
    clubs: "",
    sports: "",
    greekLife: "",
    howWeMet: "",
    referredBy: "",
    mutualConnections: "",
    warmthScore: "COLD",
    hiringTimeline: "",
    whatTheyLookFor: "",
    referralPotential: "",
    openRoles: "",
    notableDeals: "",
  });

  const [interactionForm, setInteractionForm] = useState({
    contactId: "",
    date: new Date().toISOString().slice(0, 10),
    type: "COFFEE_CHAT",
    notes: "",
    adviceGiven: "",
    actionItemsText: "",
    personalDetails: "",
    firmInsights: "",
    redFlags: "",
    followUpDate: "",
  });

  const [taskForm, setTaskForm] = useState({
    contactId: "",
    dueDate: new Date().toISOString().slice(0, 10),
    taskType: "FOLLOW_UP",
    notes: "",
  });

  const [quickInteractionDate, setQuickInteractionDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  useEffect(() => {
    setContacts(initialContacts);
  }, [initialContacts]);

  useEffect(() => {
    const onShortcut = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail === "c") setShowC(true);
      if (detail === "i") setShowI(true);
      if (detail === "t") setShowT(true);
    };
    window.addEventListener("prospect-shortcut", onShortcut);
    return () => window.removeEventListener("prospect-shortcut", onShortcut);
  }, []);

  const refresh = () => router.refresh();

  const setTabAndUrl = (t: Tab) => {
    setTab(t);
    const params = new URLSearchParams(searchParams.toString());
    if (t === "all") params.delete("tab");
    else params.set("tab", t);
    router.replace(`/contacts${params.toString() ? `?${params}` : ""}`);
  };

  const queueContacts = useMemo(
    () =>
      contacts.filter(
        (c) =>
          !c.queueExcluded &&
          (c.inOutreachQueue || c.lastInteractionDate === null),
      ),
    [contacts],
  );

  const recentContacts = useMemo(
    () =>
      [...contacts]
        .filter((c) => c.lastInteractionDate !== null)
        .sort(
          (a, b) =>
            new Date(b.lastInteractionDate!).getTime() -
            new Date(a.lastInteractionDate!).getTime(),
        ),
    [contacts],
  );

  const filtered = useMemo(() => {
    let list = tab === "queue" ? queueContacts : tab === "recent" ? recentContacts : contacts;
    if (importedOnly) list = list.filter((c) => c.source === "import");
    return list
      .filter((c) => (firmFilter === "all" ? true : c.firmId === firmFilter))
      .filter((c) => (categoryFilter === "all" ? true : c.recruitingCategory === categoryFilter))
      .filter((c) => c.relationshipStrength >= minStrength)
      .sort((a, b) => {
        if (tab === "queue") {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        const ad = a.lastInteractionDate ? new Date(a.lastInteractionDate).getTime() : 0;
        const bd = b.lastInteractionDate ? new Date(b.lastInteractionDate).getTime() : 0;
        return bd - ad;
      });
  }, [contacts, queueContacts, recentContacts, tab, importedOnly, firmFilter, categoryFilter, minStrength]);

  const fetchIntelligence = useCallback(async (firmName: string, fullName: string) => {
    const params = new URLSearchParams();
    if (firmName) params.set("firmName", firmName);
    if (fullName) params.set("fullName", fullName);
    const res = await fetch(`/api/contacts/intelligence?${params}`);
    const data = (await res.json()) as {
      firmType?: string | null;
      alumniNote?: string | null;
    };
    if (data.firmType && !contactForm.firmId) {
      setContactForm((p) => ({
        ...p,
        firmType: data.firmType as FirmType,
        recruitingCategory: data.firmType === "PE" ? "PE" : data.firmType === "VC" ? "VC" : data.firmType === "HF" ? "HF" : data.firmType === "GE" ? "GE" : "IB",
      }));
    }
    setIntelligenceNote(data.alumniNote ?? null);
  }, [contactForm.firmId]);

  const createContact = async (overrides?: {
    fullName?: string;
    firmName?: string;
    firmId?: string;
    title?: string;
    email?: string;
    firmType?: FirmType | "";
    source?: string;
    inOutreachQueue?: boolean;
  }) => {
    const form = { ...contactForm, ...overrides };
    if (!form.firmId && (!form.firmName.trim() || !form.firmType)) return;
    await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        source: overrides?.source ?? "manual",
        inOutreachQueue: overrides?.inOutreachQueue ?? false,
      }),
    });
    setShowC(false);
    refresh();
  };

  const toggleQueue = async (contactId: string, add: boolean) => {
    await fetch(`/api/contacts/${contactId}/queue`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        add
          ? { inOutreachQueue: true, queueExcluded: false }
          : { inOutreachQueue: false, queueExcluded: true },
      ),
    });
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId
          ? { ...c, inOutreachQueue: add, queueExcluded: !add }
          : c,
      ),
    );
    refresh();
  };

  const markContacted = async (contactId: string) => {
    await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId,
        date: new Date().toISOString().slice(0, 10),
        type: "EMAIL",
        notes: "Outreach email sent",
      }),
    });
    await toggleQueue(contactId, false);
    refresh();
  };

  const draftEmail = async (contactId: string) => {
    const c = contacts.find((x) => x.id === contactId);
    setAiModal({
      open: true,
      title: `Cold Outreach — ${c?.fullName ?? "Contact"}`,
      text: "",
      loading: true,
      error: null,
    });
    try {
      const res = await fetch(`/api/contacts/${contactId}/draft-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateType: "cold-outreach" }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) {
        setAiModal((m) => ({ ...m, loading: false, error: data.error ?? "Failed" }));
        return;
      }
      setAiModal((m) => ({ ...m, loading: false, text: data.text ?? "" }));
    } catch {
      setAiModal((m) => ({ ...m, loading: false, error: "Network error" }));
    }
  };

  const exportSelectedCsv = () => {
    const rows = contacts.filter((c) => selected.has(c.id));
    const header = "Name,Firm,Title,Email,LinkedIn URL,Suggested Subject Line\n";
    const body = rows
      .map((c) => {
        const subject = subjectLineForContact("cold-outreach", c.firmName, c.title);
        return [
          c.fullName,
          c.firmName,
          c.title,
          c.email.includes("@placeholder.local") ? "" : c.email,
          c.linkedinUrl ?? "",
          subject,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",");
      })
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const bulkAddToQueue = async () => {
    await fetch("/api/contacts/bulk-queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactIds: [...selected], add: true }),
    });
    setSelected(new Set());
    refresh();
  };

  const staleDate = subDays(new Date(), 30);
  const followUpBadge = {
    green: "bg-emerald-500/20 text-emerald-300",
    yellow: "bg-amber-500/20 text-amber-300",
    red: "bg-red-500/20 text-red-300",
  } as const;
  const followUpLabel = {
    green: "On time",
    yellow: "Due soon",
    red: "Overdue",
  } as const;

  const selectedContacts = contacts.filter((c) => selected.has(c.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="page-title">Contacts</h1>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowImport(true)} size="sm" variant="outline">
            Import
          </Button>
          <Button onClick={() => setShowXRay(true)} size="sm" variant="outline">
            Find Contacts
          </Button>
          <Button onClick={() => setShowC(true)} size="sm">
            New Contact (C)
          </Button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-white/10">
        {(
          [
            ["all", "All Contacts"],
            ["queue", "Outreach Queue"],
            ["recent", "Recent Interactions"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTabAndUrl(key)}
            className={`px-3 py-2 text-sm transition-colors ${
              tab === key
                ? "border-b-2 border-zinc-100 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {label}
            {key === "queue" && queueContacts.length > 0 ? (
              <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 text-[10px] text-amber-300">
                {queueContacts.length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "queue" ? (
        <OutreachQueuePanel
          contacts={filtered.map((c) => ({
            id: c.id,
            fullName: c.fullName,
            firmName: c.firmName,
            firmType: c.firmType,
            firmId: c.firmId,
            title: c.title,
            warmthScore: c.warmthScore,
            createdAt: c.createdAt,
            inOutreachQueue: c.inOutreachQueue,
          }))}
          onDraftEmail={(id) => void draftEmail(id)}
          onMarkContacted={(id) => void markContacted(id)}
          onRemove={(id) => void toggleQueue(id, false)}
        />
      ) : (
        <>
          <Card className="p-3">
            <div className="grid gap-2 md:grid-cols-3">
              <select className="h-9 rounded border border-white/10 bg-zinc-950 px-2 text-sm" value={firmFilter} onChange={(e) => setFirmFilter(e.target.value)}>
                <option value="all">All Firms</option>
                {firms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <select className="h-9 rounded border border-white/10 bg-zinc-950 px-2 text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="all">All Categories</option>
                {["IB", "PE", "GE", "VC", "HF"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <Input type="number" min={1} max={10} value={minStrength} onChange={(e) => setMinStrength(Number(e.target.value || 1))} placeholder="Min relationship strength" />
            </div>
            {importedOnly ? (
              <button
                type="button"
                className="mt-2 text-xs text-zinc-400 underline"
                onClick={() => {
                  setImportedOnly(false);
                  router.replace("/contacts");
                }}
              >
                Clear imported filter
              </button>
            ) : null}
          </Card>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] text-sm md:min-w-[900px]">
                <thead className="border-b border-white/10 bg-zinc-950/90 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="w-8 px-2 py-3" />
                    <th className="px-3 py-3">Name</th>
                    <th className="min-w-[140px] px-3 py-3 md:min-w-0">Firm</th>
                    <th className="hidden px-3 py-3 md:table-cell">Title</th>
                    <th className="hidden px-3 py-3 md:table-cell">Strength</th>
                    <th className="hidden px-3 py-3 md:table-cell">Follow-up</th>
                    <th className="hidden px-3 py-3 md:table-cell">Last Interaction</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-0">
                        <EmptyState
                          icon={Users}
                          className="border-0 bg-transparent"
                          title="No contacts match"
                          description="Adjust filters or add a contact with New Contact."
                        />
                      </td>
                    </tr>
                  ) : null}
                  {filtered.map((c) => {
                    const last = c.lastInteractionDate ? new Date(c.lastInteractionDate) : null;
                    const isStale = !last || last < staleDate;
                    return (
                      <tr
                        key={c.id}
                        className="group border-t border-white/[0.06] odd:bg-white/[0.02] transition-colors hover:bg-white/[0.04]"
                      >
                        <td className="px-2 py-2 align-top">
                          <input
                            type="checkbox"
                            className="opacity-0 group-hover:opacity-100 checked:opacity-100"
                            checked={selected.has(c.id)}
                            onChange={(e) => {
                              setSelected((s) => {
                                const next = new Set(s);
                                if (e.target.checked) next.add(c.id);
                                else next.delete(c.id);
                                return next;
                              });
                            }}
                          />
                        </td>
                        <td className="max-w-[42vw] px-3 py-2 align-top md:max-w-none">
                          <Link href={`/contacts/${c.id}`} className="break-words text-[#f0f0f0] underline-offset-4 hover:underline">
                            {c.fullName}
                          </Link>
                          {isStale ? (
                            <span className="ml-1.5 inline-block rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                              Stale
                            </span>
                          ) : null}
                          {c.source === "import" ? (
                            <span className="ml-1 inline-block rounded bg-blue-500/20 px-1 py-0.5 text-[10px] text-blue-300">
                              Imported
                            </span>
                          ) : null}
                        </td>
                        <td className="min-w-0 px-3 py-2 align-top">
                          <div className="flex min-w-0 flex-col gap-1.5 md:flex-row md:flex-wrap md:items-center md:gap-1.5">
                            <Link href={`/firms/${c.firmId}`} className="min-w-0 break-words text-[#f0f0f0] underline-offset-4 hover:underline">
                              {c.firmName}
                            </Link>
                            <FirmTypeBadge type={c.firmType} className="w-fit shrink-0" />
                          </div>
                        </td>
                        <td className="hidden px-3 py-2 align-top md:table-cell">{c.title}</td>
                        <td className="hidden px-3 py-2 align-top md:table-cell">{c.relationshipStrength}</td>
                        <td className="hidden px-3 py-2 align-top md:table-cell">
                          <span className={`rounded px-1.5 py-0.5 text-xs ${followUpBadge[c.followUpStatus]}`}>
                            {followUpLabel[c.followUpStatus]}
                          </span>
                        </td>
                        <td className="hidden px-3 py-2 align-top md:table-cell">
                          {last ? last.toLocaleDateString() : "-"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 align-top">
                          <div className="flex items-center gap-1">
                            <ContactEmailDropdown contactId={c.id} />
                            <Button
                              size="sm"
                              variant="outline"
                              className="hidden h-7 px-2 text-xs md:inline-flex"
                              onClick={() => setQuickLogContactId(c.id)}
                            >
                              Log
                            </Button>
                            <ContactRowMenu
                              contactId={c.id}
                              inQueue={c.inOutreachQueue || c.lastInteractionDate === null}
                              onQueueChange={(add) => void toggleQueue(c.id, add)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <BulkOutreachBar
        count={selected.size}
        onDraftEmails={() => setShowBulkDraft(true)}
        onExport={exportSelectedCsv}
        onAddToQueue={() => void bulkAddToQueue()}
        onCancel={() => setSelected(new Set())}
      />

      <ContactImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={(ids) => {
          setImportedOnly(true);
          router.replace(`/contacts?filter=imported`);
          void ids;
          refresh();
        }}
      />

      <LinkedInXRayModal
        open={showXRay}
        onClose={() => setShowXRay(false)}
        schoolName={schoolName}
        onSaveToQueue={async (data) => {
          const knownType = data.firmName.toLowerCase().includes("kkr") ? "PE" : "OTHER";
          await createContact({
            fullName: data.fullName,
            firmName: data.firmName,
            firmId: "",
            title: data.title,
            email: "",
            firmType: knownType as FirmType,
            source: "linkedin-search",
            inOutreachQueue: true,
          });
        }}
      />

      <BulkEmailDraftModal
        open={showBulkDraft}
        contacts={selectedContacts}
        onClose={() => setShowBulkDraft(false)}
      />

      <AiOutputModal
        open={aiModal.open}
        title={aiModal.title}
        text={aiModal.text}
        loading={aiModal.loading}
        error={aiModal.error}
        onClose={() => setAiModal((m) => ({ ...m, open: false }))}
      />

      <Modal open={showC} onClose={() => setShowC(false)} title="New Contact" className="max-w-2xl">
        <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1 text-sm">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Basic info</p>
          <div className="grid gap-2 md:grid-cols-2">
            <Input placeholder="Full name" value={contactForm.fullName} onChange={(e) => {
              setContactForm((p) => ({ ...p, fullName: e.target.value }));
              if (contactForm.firmName) void fetchIntelligence(contactForm.firmName, e.target.value);
            }} />
            <Input placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))} />
            <Input placeholder="LinkedIn URL (optional)" value={contactForm.linkedinUrl} onChange={(e) => setContactForm((p) => ({ ...p, linkedinUrl: e.target.value }))} />
            <select className="h-9 rounded border border-zinc-700 bg-zinc-950 px-2 text-sm" value={contactForm.firmId} onChange={(e) => setContactForm((p) => ({ ...p, firmId: e.target.value }))}>
              {firms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              <option value="">Create new firm</option>
            </select>
            {!contactForm.firmId ? (
              <>
                <Input
                  placeholder="New firm name"
                  value={contactForm.firmName}
                  onChange={(e) => {
                    setContactForm((p) => ({ ...p, firmName: e.target.value }));
                    void fetchIntelligence(e.target.value, contactForm.fullName);
                  }}
                />
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs text-zinc-500">New firm type</label>
                  <select
                    className="h-9 w-full rounded border border-zinc-700 bg-zinc-950 px-2 text-sm"
                    value={contactForm.firmType}
                    onChange={(e) =>
                      setContactForm((p) => ({
                        ...p,
                        firmType: (e.target.value || "") as FirmType | "",
                      }))
                    }
                  >
                    <option value="">Select firm type…</option>
                    {FIRM_TYPE_ORDER.map((t) => (
                      <option key={t} value={t}>
                        {FIRM_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : null}
            {intelligenceNote ? (
              <p className="rounded border border-blue-500/20 bg-blue-500/5 px-2 py-1.5 text-xs text-blue-200 md:col-span-2">
                {intelligenceNote}
              </p>
            ) : null}
            <Input placeholder="Group" value={contactForm.group} onChange={(e) => setContactForm((p) => ({ ...p, group: e.target.value }))} />
            <Input placeholder="Title" value={contactForm.title} onChange={(e) => setContactForm((p) => ({ ...p, title: e.target.value }))} />
            <Input placeholder="Location" value={contactForm.location} onChange={(e) => setContactForm((p) => ({ ...p, location: e.target.value }))} />
            <Input placeholder="School" value={contactForm.school} onChange={(e) => setContactForm((p) => ({ ...p, school: e.target.value }))} />
            <select className="h-9 rounded border border-zinc-700 bg-zinc-950 px-2 text-sm" value={contactForm.recruitingCategory} onChange={(e) => setContactForm((p) => ({ ...p, recruitingCategory: e.target.value }))}>
              {["IB", "PE", "GE", "VC", "HF"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <Input type="number" min={1} max={10} value={contactForm.relationshipStrength} onChange={(e) => setContactForm((p) => ({ ...p, relationshipStrength: Number(e.target.value) }))} />
            <select className="h-9 rounded border border-zinc-700 bg-zinc-950 px-2 text-sm" value={contactForm.referralProbability} onChange={(e) => setContactForm((p) => ({ ...p, referralProbability: e.target.value }))}>
              {["LOW", "MEDIUM", "HIGH"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <Input type="date" value={contactForm.lastInteractionDate} onChange={(e) => setContactForm((p) => ({ ...p, lastInteractionDate: e.target.value }))} />
            <textarea className="min-h-[56px] rounded border border-zinc-700 bg-zinc-950 p-2 text-sm md:col-span-2" placeholder="Notes" value={contactForm.notes} onChange={(e) => setContactForm((p) => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            onClick={() => void createContact()}
            disabled={
              !contactForm.fullName.trim() ||
              (!contactForm.firmId && (!contactForm.firmName.trim() || !contactForm.firmType))
            }
          >
            Save Contact
          </Button>
        </div>
      </Modal>

      <Modal open={showI} onClose={() => setShowI(false)} title="New Interaction" className="max-w-lg">
        <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1 text-sm">
          <select className="h-9 w-full rounded border border-zinc-700 bg-zinc-950 px-2 text-sm" value={interactionForm.contactId} onChange={(e) => setInteractionForm((p) => ({ ...p, contactId: e.target.value }))}>
            <option value="">Select contact</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select>
          <Input type="date" value={interactionForm.date} onChange={(e) => setInteractionForm((p) => ({ ...p, date: e.target.value }))} />
          <Input placeholder="Type (COFFEE_CHAT/CALL/...)" value={interactionForm.type} onChange={(e) => setInteractionForm((p) => ({ ...p, type: e.target.value }))} />
          <textarea className="min-h-[56px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm" placeholder="What was discussed" value={interactionForm.notes} onChange={(e) => setInteractionForm((p) => ({ ...p, notes: e.target.value }))} />
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={async () => {
            await fetch("/api/interactions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contactId: interactionForm.contactId,
                date: interactionForm.date,
                type: interactionForm.type,
                notes: interactionForm.notes.trim() || null,
              }),
            });
            setShowI(false);
            refresh();
          }}>Log Interaction</Button>
        </div>
      </Modal>

      <Modal open={showT} onClose={() => setShowT(false)} title="New Task">
        <div className="grid gap-2">
          <select className="h-9 rounded border border-zinc-700 bg-zinc-950 px-2 text-sm" value={taskForm.contactId} onChange={(e) => setTaskForm((p) => ({ ...p, contactId: e.target.value }))}>
            <option value="">Select contact</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select>
          <Input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm((p) => ({ ...p, dueDate: e.target.value }))} />
          <Input placeholder="Task type" value={taskForm.taskType} onChange={(e) => setTaskForm((p) => ({ ...p, taskType: e.target.value }))} />
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={async () => {
            await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(taskForm) });
            setShowT(false);
            refresh();
          }}>Create Task</Button>
        </div>
      </Modal>

      <Modal open={Boolean(quickLogContactId)} onClose={() => setQuickLogContactId("")} title="Log Interaction">
        <Input type="date" value={quickInteractionDate} onChange={(e) => setQuickInteractionDate(e.target.value)} />
        <div className="mt-3 flex justify-end">
          <Button onClick={async () => {
            if (!quickLogContactId) return;
            await fetch("/api/interactions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contactId: quickLogContactId, date: quickInteractionDate, type: "COFFEE_CHAT", notes: null }),
            });
            setQuickLogContactId("");
            refresh();
          }}>Save</Button>
        </div>
      </Modal>
    </div>
  );
}
