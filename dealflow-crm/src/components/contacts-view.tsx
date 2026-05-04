"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { subDays } from "date-fns";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useRouter } from "next/navigation";

type ContactRow = {
  id: string;
  fullName: string;
  firmName: string;
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
    group: "",
    title: "Analyst",
    location: "",
    school: "",
    recruitingCategory: "IB",
    relationshipStrength: 1,
    referralProbability: "MEDIUM",
    notes: "",
    lastInteractionDate: new Date().toISOString().slice(0, 10),
  });
  const [interactionForm, setInteractionForm] = useState({
    contactId: "",
    date: new Date().toISOString().slice(0, 10),
    type: "COFFEE_CHAT",
    notes: "",
    keyTakeaways: "",
    personalDetails: "",
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
    await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contactForm),
    });
    setShowC(false);
    refresh();
  };

  const createInteraction = async () => {
    await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(interactionForm),
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
        <h1 className="text-xl font-semibold">Contacts</h1>
        <Button onClick={() => setShowC(true)} size="sm">New Contact (C)</Button>
      </div>
      <Card className="p-3">
        <div className="grid gap-2 md:grid-cols-3">
          <select className="h-9 rounded border border-zinc-700 bg-zinc-950 px-2 text-sm" value={firmFilter} onChange={(e) => setFirmFilter(e.target.value)}>
            <option value="all">All Firms</option>
            {firms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <select className="h-9 rounded border border-zinc-700 bg-zinc-950 px-2 text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {["IB", "PE", "GE", "VC", "HF"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Input type="number" min={1} max={10} value={minStrength} onChange={(e) => setMinStrength(Number(e.target.value || 1))} placeholder="Min relationship strength" />
        </div>
      </Card>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-left text-zinc-400"><tr><th className="px-3 py-2">Name</th><th>Firm</th><th>Group</th><th>Title</th><th>Strength</th><th>Referral</th><th>Follow-up</th><th>Last Interaction</th><th></th></tr></thead>
          <tbody>
            {filtered.map((c) => {
              const last = c.lastInteractionDate ? new Date(c.lastInteractionDate) : null;
              const isStale = !last || last < staleDate;
              return (
                <tr key={c.id} className="border-t border-zinc-800">
                  <td className="px-3 py-2"><Link href={`/contacts/${c.id}`} className="text-cyan-400 hover:underline">{c.fullName}</Link>{isStale ? <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-300">Stale</span> : null}</td>
                  <td>{c.firmName}</td><td>{c.group}</td><td>{c.title}</td><td>{c.relationshipStrength}</td><td>{c.referralProbability}</td><td><span className={`rounded px-1.5 py-0.5 text-xs ${followUpBadge[c.followUpStatus]}`}>{followUpLabel[c.followUpStatus]}</span></td><td>{last ? last.toLocaleDateString() : "-"}</td><td><Button size="sm" variant="outline" onClick={() => setQuickLogContactId(c.id)}>Log Interaction</Button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Modal open={showC} onClose={() => setShowC(false)} title="New Contact">
        <div className="grid gap-2 md:grid-cols-2">
          <Input placeholder="Full name" value={contactForm.fullName} onChange={(e) => setContactForm((p) => ({ ...p, fullName: e.target.value }))} />
          <Input placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))} />
          <Input placeholder="LinkedIn URL" value={contactForm.linkedinUrl} onChange={(e) => setContactForm((p) => ({ ...p, linkedinUrl: e.target.value }))} />
          <select className="h-9 rounded border border-zinc-700 bg-zinc-950 px-2 text-sm" value={contactForm.firmId} onChange={(e) => setContactForm((p) => ({ ...p, firmId: e.target.value }))}>
            {firms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            <option value="">Create new firm</option>
          </select>
          {!contactForm.firmId ? (
            <Input
              placeholder="New firm name"
              value={contactForm.firmName}
              onChange={(e) => setContactForm((p) => ({ ...p, firmName: e.target.value }))}
            />
          ) : null}
          <Input placeholder="Group" value={contactForm.group} onChange={(e) => setContactForm((p) => ({ ...p, group: e.target.value }))} />
          <Input placeholder="Title" value={contactForm.title} onChange={(e) => setContactForm((p) => ({ ...p, title: e.target.value }))} />
          <Input placeholder="Location" value={contactForm.location} onChange={(e) => setContactForm((p) => ({ ...p, location: e.target.value }))} />
          <Input placeholder="School" value={contactForm.school} onChange={(e) => setContactForm((p) => ({ ...p, school: e.target.value }))} />
          <Input type="date" value={contactForm.lastInteractionDate} onChange={(e) => setContactForm((p) => ({ ...p, lastInteractionDate: e.target.value }))} />
        </div>
        <p className="mt-2 text-xs text-zinc-400">Last interaction date helps generate coffee chat follow-up alerts immediately.</p>
        <div className="mt-3 flex justify-end"><Button onClick={createContact}>Save Contact</Button></div>
      </Modal>

      <Modal open={showI} onClose={() => setShowI(false)} title="New Interaction">
        <div className="grid gap-2">
          <select className="h-9 rounded border border-zinc-700 bg-zinc-950 px-2 text-sm" value={interactionForm.contactId} onChange={(e) => setInteractionForm((p) => ({ ...p, contactId: e.target.value }))}>
            <option value="">Select contact</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select>
          <Input type="date" value={interactionForm.date} onChange={(e) => setInteractionForm((p) => ({ ...p, date: e.target.value }))} />
          <Input placeholder="Type (COFFEE_CHAT/CALL/...)" value={interactionForm.type} onChange={(e) => setInteractionForm((p) => ({ ...p, type: e.target.value }))} />
          <Input placeholder="Key takeaways" value={interactionForm.keyTakeaways} onChange={(e) => setInteractionForm((p) => ({ ...p, keyTakeaways: e.target.value }))} />
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
