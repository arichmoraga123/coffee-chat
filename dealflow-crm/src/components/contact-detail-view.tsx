"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

type Data = {
  contact: {
    id: string;
    fullName: string;
    title: string;
    group: string;
    firmName: string;
    email: string;
    location: string;
    notes: string;
  };
  interactions: Array<{ id: string; date: string; type: string; notes: string; keyTakeaways: string }>;
  tasks: Array<{ id: string; taskType: string; dueDate: string; status: string }>;
  opportunities: Array<{ id: string; label: string }>;
  linkableOpportunities: Array<{ id: string; label: string }>;
};

export function ContactDetailView(data: Data) {
  const router = useRouter();
  const [showI, setShowI] = useState(false);
  const [showT, setShowT] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState(data.linkableOpportunities[0]?.id ?? "");
  const [interactionForm, setInteractionForm] = useState({
    contactId: data.contact.id,
    date: new Date().toISOString().slice(0, 10),
    type: "COFFEE_CHAT",
    notes: "",
    keyTakeaways: "",
    personalDetails: "",
    followUpDate: "",
  });
  const [taskForm, setTaskForm] = useState({
    contactId: data.contact.id,
    dueDate: new Date().toISOString().slice(0, 10),
    taskType: "FOLLOW_UP",
    notes: "",
  });

  const refresh = () => router.refresh();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{data.contact.fullName}</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowI(true)}>Log Interaction</Button>
          <Button size="sm" onClick={() => setShowT(true)}>Add Task</Button>
        </div>
      </div>
      <Card className="p-4 text-sm">
        <p>{data.contact.title} | {data.contact.group} | {data.contact.firmName}</p>
        <p className="text-zinc-400">{data.contact.email} | {data.contact.location}</p>
        <p className="mt-2">{data.contact.notes || "No notes yet."}</p>
      </Card>
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="p-4"><h2 className="mb-2 font-semibold">Interactions</h2>{data.interactions.map((i) => <div key={i.id} className="mb-2 border-b border-zinc-800 pb-2 text-sm"><p>{new Date(i.date).toLocaleDateString()} - {i.type}</p><p className="text-zinc-400">{i.keyTakeaways || i.notes}</p></div>)}</Card>
        <Card className="p-4"><h2 className="mb-2 font-semibold">Tasks</h2>{data.tasks.map((t) => <p key={t.id} className="mb-2 text-sm">{t.taskType} - {new Date(t.dueDate).toLocaleDateString()} ({t.status})</p>)}</Card>
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">Linked Opportunities</h2>
          {data.opportunities.map((o) => <p key={o.id} className="mb-2 text-sm">{o.label}</p>)}
          <div className="mt-3 flex gap-2">
            <select value={selectedOpp} onChange={(e) => setSelectedOpp(e.target.value)} className="h-8 flex-1 rounded border border-zinc-700 bg-zinc-950 px-2 text-xs">
              <option value="">Select to link</option>
              {data.linkableOpportunities.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                if (!selectedOpp) return;
                await fetch("/api/opportunities/link", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ opportunityId: selectedOpp, contactId: data.contact.id }),
                });
                refresh();
              }}
            >
              Link
            </Button>
          </div>
        </Card>
      </div>

      <Modal open={showI} onClose={() => setShowI(false)} title="Add Interaction">
        <div className="grid gap-2">
          <Input type="date" value={interactionForm.date} onChange={(e) => setInteractionForm((p) => ({ ...p, date: e.target.value }))} />
          <Input value={interactionForm.type} onChange={(e) => setInteractionForm((p) => ({ ...p, type: e.target.value }))} />
          <Input placeholder="Takeaways" value={interactionForm.keyTakeaways} onChange={(e) => setInteractionForm((p) => ({ ...p, keyTakeaways: e.target.value }))} />
          <Input type="date" value={interactionForm.followUpDate} onChange={(e) => setInteractionForm((p) => ({ ...p, followUpDate: e.target.value }))} />
        </div>
        <div className="mt-3 flex justify-end"><Button onClick={async () => { await fetch("/api/interactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(interactionForm) }); setShowI(false); refresh(); }}>Save</Button></div>
      </Modal>
      <Modal open={showT} onClose={() => setShowT(false)} title="Add Task">
        <div className="grid gap-2">
          <Input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm((p) => ({ ...p, dueDate: e.target.value }))} />
          <Input value={taskForm.taskType} onChange={(e) => setTaskForm((p) => ({ ...p, taskType: e.target.value }))} />
          <Input value={taskForm.notes} onChange={(e) => setTaskForm((p) => ({ ...p, notes: e.target.value }))} />
        </div>
        <div className="mt-3 flex justify-end"><Button onClick={async () => { await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(taskForm) }); setShowT(false); refresh(); }}>Save</Button></div>
      </Modal>
    </div>
  );
}
