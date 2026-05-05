"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { subDays } from "date-fns";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { FIRM_TYPE_ORDER, FIRM_TYPE_LABELS, FirmTypeBadge } from "@/lib/firm-type";
import type { FirmType } from "@prisma/client";

type ContactRow = {
  id: string;
  fullName: string;
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
};

type FirmOption = { id: string; name: string };

export function ContactsView({
  initialContacts,
  firms,
}: {
  initialContacts: ContactRow[];
  firms: FirmOption[];
}) {
  const router = useRouter();
  const [contacts] = useState(initialContacts);
  const [firmFilter, setFirmFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [minStrength, setMinStrength] = useState(1);
  const [showC, setShowC] = useState(false);
  const [showI, setShowI] = useState(false);
  const [showT, setShowT] = useState(false);
  const [quickLogContactId, setQuickLogContactId] = useState("");
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
    const onShortcut = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail === "c") setShowC(true);
      if (detail === "i") setShowI(true);
      if (detail === "t") setShowT(true);
    };
    window.addEventListener("dealflow-shortcut", onShortcut);
    return () => window.removeEventListener("dealflow-shortcut", onShortcut);
  }, []);

  const filtered = useMemo(() => {
    return contacts
      .filter((c) => (firmFilter === "all" ? true : c.firmId === firmFilter))
      .filter((c) => (categoryFilter === "all" ? true : c.recruitingCategory === categoryFilter))
      .filter((c) => c.relationshipStrength >= minStrength)
      .sort((a, b) => {
        const ad = a.lastInteractionDate ? new Date(a.lastInteractionDate).getTime() : 0;
        const bd = b.lastInteractionDate ? new Date(b.lastInteractionDate).getTime() : 0;
        return bd - ad;
      });
  }, [contacts, firmFilter, categoryFilter, minStrength]);

  const refresh = () => router.refresh();

  const createContact = async () => {
    if (!contactForm.firmId && (!contactForm.firmName.trim() || !contactForm.firmType)) {
      return;
    }
    await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contactForm),
    });
    setShowC(false);
    refresh();
  };

  const createInteraction = async () => {
    const actionItems = interactionForm.actionItemsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: interactionForm.contactId,
        date: interactionForm.date,
        type: interactionForm.type,
        notes: interactionForm.notes.trim() || null,
        adviceGiven: interactionForm.adviceGiven.trim() || null,
        actionItems,
        personalDetails: interactionForm.personalDetails.trim() || null,
        firmInsights: interactionForm.firmInsights.trim() || null,
        redFlags: interactionForm.redFlags.trim() || null,
        followUpDate: interactionForm.followUpDate.trim() || null,
      }),
    });
    setShowI(false);
    refresh();
  };

  const createTask = async () => {
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskForm),
    });
    setShowT(false);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Contacts</h1>
        <Button onClick={() => setShowC(true)} size="sm">New Contact (C)</Button>
      </div>
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
      </Card>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] text-sm md:min-w-[720px]">
            <thead className="border-b border-white/10 bg-zinc-950/90 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-3 py-3">Name</th>
                <th className="min-w-[140px] px-3 py-3 md:min-w-0">Firm</th>
                <th className="hidden px-3 py-3 md:table-cell">Group</th>
                <th className="hidden px-3 py-3 md:table-cell">Title</th>
                <th className="hidden px-3 py-3 md:table-cell">Strength</th>
                <th className="hidden px-3 py-3 md:table-cell">Referral</th>
                <th className="hidden px-3 py-3 md:table-cell">Follow-up</th>
                <th className="hidden px-3 py-3 md:table-cell">Last Interaction</th>
                <th className="hidden md:table-cell" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-0">
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
                    className="border-t border-white/[0.06] odd:bg-white/[0.02] transition-colors hover:bg-cyan-500/[0.06] hover:shadow-[inset_3px_0_0_0_rgba(34,211,238,0.45)]"
                  >
                    <td className="max-w-[42vw] px-3 py-2 align-top md:max-w-none">
                      <Link href={`/contacts/${c.id}`} className="break-words text-cyan-400 hover:underline">
                        {c.fullName}
                      </Link>
                      {isStale ? (
                        <span className="ml-1.5 inline-block rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300 md:ml-2 md:text-xs">
                          Stale
                        </span>
                      ) : null}
                    </td>
                    <td className="min-w-0 px-3 py-2 align-top">
                      <div className="flex min-w-0 flex-col gap-1.5 md:flex-row md:flex-wrap md:items-center md:gap-1.5">
                        <Link
                          href={`/firms/${c.firmId}`}
                          className="min-w-0 break-words text-cyan-400 hover:underline md:order-2"
                        >
                          {c.firmName}
                        </Link>
                        <FirmTypeBadge
                          type={c.firmType}
                          className="w-fit max-w-full shrink-0 whitespace-normal text-left leading-snug md:order-1"
                        />
                      </div>
                    </td>
                    <td className="hidden px-3 py-2 align-top md:table-cell">{c.group}</td>
                    <td className="hidden px-3 py-2 align-top md:table-cell">{c.title}</td>
                    <td className="hidden px-3 py-2 align-top md:table-cell">{c.relationshipStrength}</td>
                    <td className="hidden px-3 py-2 align-top md:table-cell">{c.referralProbability}</td>
                    <td className="hidden px-3 py-2 align-top md:table-cell">
                      <span className={`rounded px-1.5 py-0.5 text-xs ${followUpBadge[c.followUpStatus]}`}>
                        {followUpLabel[c.followUpStatus]}
                      </span>
                    </td>
                    <td className="hidden px-3 py-2 align-top md:table-cell">
                      {last ? last.toLocaleDateString() : "-"}
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-2 align-top md:table-cell">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 shrink-0 px-2 py-0 text-xs whitespace-nowrap"
                        onClick={() => setQuickLogContactId(c.id)}
                      >
                        Log Interaction
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={showC} onClose={() => setShowC(false)} title="New Contact" className="max-w-2xl">
        <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1 text-sm">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Basic info</p>
          <div className="grid gap-2 md:grid-cols-2">
            <Input placeholder="Full name" value={contactForm.fullName} onChange={(e) => setContactForm((p) => ({ ...p, fullName: e.target.value }))} />
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
                  onChange={(e) => setContactForm((p) => ({ ...p, firmName: e.target.value }))}
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
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Background &amp; education</p>
          <div className="grid gap-2 md:grid-cols-2">
            <Input placeholder="Undergrad school" value={contactForm.undergradSchool} onChange={(e) => setContactForm((p) => ({ ...p, undergradSchool: e.target.value }))} />
            <Input placeholder="Grad school" value={contactForm.gradSchool} onChange={(e) => setContactForm((p) => ({ ...p, gradSchool: e.target.value }))} />
            <Input placeholder="Graduation year" value={contactForm.graduationYear} onChange={(e) => setContactForm((p) => ({ ...p, graduationYear: e.target.value }))} />
            <Input placeholder="Hometown" value={contactForm.hometown} onChange={(e) => setContactForm((p) => ({ ...p, hometown: e.target.value }))} />
            <textarea className="min-h-[56px] rounded border border-zinc-700 bg-zinc-950 p-2 text-sm md:col-span-2" placeholder="Previous firms (one per line)" value={contactForm.previousFirms} onChange={(e) => setContactForm((p) => ({ ...p, previousFirms: e.target.value }))} />
            <textarea className="min-h-[56px] rounded border border-zinc-700 bg-zinc-950 p-2 text-sm md:col-span-2" placeholder="Career path" value={contactForm.careerPath} onChange={(e) => setContactForm((p) => ({ ...p, careerPath: e.target.value }))} />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Clubs &amp; activities</p>
          <div className="grid gap-2 md:grid-cols-2">
            <textarea className="min-h-[56px] rounded border border-zinc-700 bg-zinc-950 p-2 text-sm md:col-span-2" placeholder="Clubs (one per line)" value={contactForm.clubs} onChange={(e) => setContactForm((p) => ({ ...p, clubs: e.target.value }))} />
            <textarea className="min-h-[56px] rounded border border-zinc-700 bg-zinc-950 p-2 text-sm md:col-span-2" placeholder="Sports (one per line)" value={contactForm.sports} onChange={(e) => setContactForm((p) => ({ ...p, sports: e.target.value }))} />
            <Input placeholder="Greek life" value={contactForm.greekLife} onChange={(e) => setContactForm((p) => ({ ...p, greekLife: e.target.value }))} />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Relationship</p>
          <div className="grid gap-2 md:grid-cols-2">
            <Input placeholder="How we met" value={contactForm.howWeMet} onChange={(e) => setContactForm((p) => ({ ...p, howWeMet: e.target.value }))} />
            <Input placeholder="Referred by" value={contactForm.referredBy} onChange={(e) => setContactForm((p) => ({ ...p, referredBy: e.target.value }))} />
            <textarea className="min-h-[56px] rounded border border-zinc-700 bg-zinc-950 p-2 text-sm md:col-span-2" placeholder="Mutual connections (one per line)" value={contactForm.mutualConnections} onChange={(e) => setContactForm((p) => ({ ...p, mutualConnections: e.target.value }))} />
            <select className="h-9 rounded border border-zinc-700 bg-zinc-950 px-2 text-sm md:col-span-2" value={contactForm.warmthScore} onChange={(e) => setContactForm((p) => ({ ...p, warmthScore: e.target.value }))}>
              {["COLD", "WARM", "HOT", "ADVOCATE"].map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Recruiting intel</p>
          <div className="grid gap-2 md:grid-cols-2">
            <Input placeholder="Hiring timeline" value={contactForm.hiringTimeline} onChange={(e) => setContactForm((p) => ({ ...p, hiringTimeline: e.target.value }))} />
            <textarea className="min-h-[56px] rounded border border-zinc-700 bg-zinc-950 p-2 text-sm md:col-span-2" placeholder="What they look for" value={contactForm.whatTheyLookFor} onChange={(e) => setContactForm((p) => ({ ...p, whatTheyLookFor: e.target.value }))} />
            <select className="h-9 rounded border border-zinc-700 bg-zinc-950 px-2 text-sm" value={contactForm.referralPotential} onChange={(e) => setContactForm((p) => ({ ...p, referralPotential: e.target.value }))}>
              <option value="">Referral potential…</option>
              {["UNLIKELY", "POSSIBLE", "LIKELY", "OFFERED"].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <Input placeholder="Open roles" value={contactForm.openRoles} onChange={(e) => setContactForm((p) => ({ ...p, openRoles: e.target.value }))} />
            <textarea className="min-h-[56px] rounded border border-zinc-700 bg-zinc-950 p-2 text-sm md:col-span-2" placeholder="Notable deals (one per line)" value={contactForm.notableDeals} onChange={(e) => setContactForm((p) => ({ ...p, notableDeals: e.target.value }))} />
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-400">Last interaction date helps generate coffee chat follow-up alerts immediately.</p>
        <div className="mt-3 flex justify-end">
          <Button
            onClick={createContact}
            disabled={
              !contactForm.fullName.trim() ||
              (!contactForm.firmId &&
                (!contactForm.firmName.trim() || !contactForm.firmType))
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
          <textarea className="min-h-[48px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm" placeholder="Advice given" value={interactionForm.adviceGiven} onChange={(e) => setInteractionForm((p) => ({ ...p, adviceGiven: e.target.value }))} />
          <textarea className="min-h-[48px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm" placeholder="Action items (one per line)" value={interactionForm.actionItemsText} onChange={(e) => setInteractionForm((p) => ({ ...p, actionItemsText: e.target.value }))} />
          <textarea className="min-h-[48px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm" placeholder="Personal details" value={interactionForm.personalDetails} onChange={(e) => setInteractionForm((p) => ({ ...p, personalDetails: e.target.value }))} />
          <textarea className="min-h-[48px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm" placeholder="Firm insights" value={interactionForm.firmInsights} onChange={(e) => setInteractionForm((p) => ({ ...p, firmInsights: e.target.value }))} />
          <textarea className="min-h-[40px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm" placeholder="Red flags" value={interactionForm.redFlags} onChange={(e) => setInteractionForm((p) => ({ ...p, redFlags: e.target.value }))} />
          <Input type="date" value={interactionForm.followUpDate} onChange={(e) => setInteractionForm((p) => ({ ...p, followUpDate: e.target.value }))} />
        </div>
        <div className="mt-3 flex justify-end"><Button onClick={createInteraction}>Log Interaction</Button></div>
      </Modal>

      <Modal open={showT} onClose={() => setShowT(false)} title="New Task">
        <div className="grid gap-2">
          <select className="h-9 rounded border border-zinc-700 bg-zinc-950 px-2 text-sm" value={taskForm.contactId} onChange={(e) => setTaskForm((p) => ({ ...p, contactId: e.target.value }))}>
            <option value="">Select contact</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select>
          <Input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm((p) => ({ ...p, dueDate: e.target.value }))} />
          <Input placeholder="Task type (FOLLOW_UP/THANK_YOU/...)" value={taskForm.taskType} onChange={(e) => setTaskForm((p) => ({ ...p, taskType: e.target.value }))} />
          <Input placeholder="Notes" value={taskForm.notes} onChange={(e) => setTaskForm((p) => ({ ...p, notes: e.target.value }))} />
        </div>
        <div className="mt-3 flex justify-end"><Button onClick={createTask}>Create Task</Button></div>
      </Modal>
      <Modal
        open={Boolean(quickLogContactId)}
        onClose={() => setQuickLogContactId("")}
        title="Log Interaction"
      >
        <div className="grid gap-2">
          <Input
            type="date"
            value={quickInteractionDate}
            onChange={(event) => setQuickInteractionDate(event.target.value)}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            onClick={async () => {
              if (!quickLogContactId) return;
              await fetch("/api/interactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contactId: quickLogContactId,
                  date: quickInteractionDate,
                  type: "COFFEE_CHAT",
                  notes: null,
                }),
              });
              setQuickLogContactId("");
              refresh();
            }}
          >
            Save
          </Button>
        </div>
      </Modal>
    </div>
  );
}
