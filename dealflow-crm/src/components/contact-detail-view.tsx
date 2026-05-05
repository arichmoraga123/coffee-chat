"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InteractionType } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  ContactProfileForm,
  type ContactProfilePayload,
} from "@/components/contact-profile-form";
import {
  ContactInteractionTimeline,
  type TimelineInteraction,
} from "@/components/contact-interaction-timeline";
import { AiOutputModal } from "@/components/ai-output-modal";
import { FirmTypeBadge } from "@/lib/firm-type";

type FirmOption = { id: string; name: string; type?: string | null };

type Props = {
  profile: ContactProfilePayload;
  firms: FirmOption[];
  interactions: TimelineInteraction[];
  tasks: Array<{ id: string; taskType: string; dueDate: string; status: string }>;
  opportunities: Array<{ id: string; label: string }>;
  linkableOpportunities: Array<{ id: string; label: string }>;
};

const interactionTypes = Object.values(InteractionType);

function splitActionItems(s: string) {
  return s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function ContactDetailView({
  profile,
  firms,
  interactions,
  tasks,
  opportunities,
  linkableOpportunities,
}: Props) {
  const router = useRouter();
  const [showI, setShowI] = useState(false);
  const [showT, setShowT] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [introTarget, setIntroTarget] = useState("");
  const [introBusy, setIntroBusy] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState(linkableOpportunities[0]?.id ?? "");

  const [interactionForm, setInteractionForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: "COFFEE_CHAT" as string,
    notes: "",
    adviceGiven: "",
    actionItemsText: "",
    personalDetails: "",
    firmInsights: "",
    redFlags: "",
    followUpDate: "",
  });

  const [taskForm, setTaskForm] = useState({
    contactId: profile.id,
    dueDate: new Date().toISOString().slice(0, 10),
    taskType: "FOLLOW_UP",
    notes: "",
  });

  const [aiModal, setAiModal] = useState({
    open: false,
    title: "",
    text: "",
    loading: false,
    error: null as string | null,
  });

  const refresh = () => router.refresh();

  const openAiModal = (title: string) => {
    setAiModal({ open: true, title, text: "", loading: true, error: null });
  };

  const runPreCallBrief = async () => {
    openAiModal("Pre-call brief");
    try {
      const res = await fetch(`/api/contacts/${profile.id}/pre-call-brief`, { method: "POST" });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) {
        setAiModal((m) => ({ ...m, loading: false, error: data.error ?? "Request failed" }));
        return;
      }
      setAiModal((m) => ({ ...m, loading: false, text: data.text ?? "" }));
    } catch {
      setAiModal((m) => ({ ...m, loading: false, error: "Network error" }));
    }
  };

  const runDraftFollowUp = async (interactionId: string) => {
    openAiModal("Follow-up email draft");
    try {
      const res = await fetch(`/api/contacts/${profile.id}/draft-followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interactionId }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) {
        setAiModal((m) => ({ ...m, loading: false, error: data.error ?? "Request failed" }));
        return;
      }
      setAiModal((m) => ({ ...m, loading: false, text: data.text ?? "" }));
    } catch {
      setAiModal((m) => ({ ...m, loading: false, error: "Network error" }));
    }
  };

  const submitIntroRequest = async () => {
    setIntroBusy(true);
    openAiModal("Intro request draft");
    setShowIntro(false);
    try {
      const res = await fetch(`/api/contacts/${profile.id}/intro-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPerson: introTarget }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) {
        setAiModal((m) => ({ ...m, loading: false, error: data.error ?? "Request failed" }));
        return;
      }
      setAiModal((m) => ({ ...m, loading: false, text: data.text ?? "" }));
      setIntroTarget("");
    } catch {
      setAiModal((m) => ({ ...m, loading: false, error: "Network error" }));
    } finally {
      setIntroBusy(false);
    }
  };

  const logInteraction = async () => {
    const res = await fetch(`/api/contacts/${profile.id}/interactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: interactionForm.date,
        type: interactionForm.type,
        notes: interactionForm.notes.trim() || null,
        adviceGiven: interactionForm.adviceGiven.trim() || null,
        actionItems: splitActionItems(interactionForm.actionItemsText),
        personalDetails: interactionForm.personalDetails.trim() || null,
        firmInsights: interactionForm.firmInsights.trim() || null,
        redFlags: interactionForm.redFlags.trim() || null,
        followUpDate: interactionForm.followUpDate.trim() || null,
      }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      alert(err.error ?? "Failed to log interaction");
      return;
    }
    setShowI(false);
    setInteractionForm((f) => ({
      ...f,
      date: new Date().toISOString().slice(0, 10),
      notes: "",
      adviceGiven: "",
      actionItemsText: "",
      personalDetails: "",
      firmInsights: "",
      redFlags: "",
      followUpDate: "",
    }));
    refresh();
  };

  const fieldClass =
    "w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-100 placeholder:text-zinc-600";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-50">{profile.fullName}</h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
            <span>
              {profile.title} · {profile.group} · {profile.firmName}
            </span>
            <FirmTypeBadge type={profile.firmType} />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowI(true)}>
            Log interaction
          </Button>
          <Button size="sm" variant="outline" onClick={() => void runPreCallBrief()}>
            Generate pre-call brief
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowIntro(true)}>
            Request intro
          </Button>
          <Button size="sm" onClick={() => setShowT(true)}>
            Add task
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,400px)_1fr]">
        <ContactProfileForm profile={profile} firms={firms} />
        <div className="space-y-4">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-zinc-200">Interaction timeline</h2>
            <ContactInteractionTimeline interactions={interactions} onDraftFollowUp={runDraftFollowUp} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Card className="border-zinc-800 bg-zinc-900/50 p-4">
              <h2 className="mb-2 text-sm font-semibold text-zinc-200">Tasks</h2>
              {tasks.length === 0 ? (
                <p className="text-xs text-zinc-500">No tasks.</p>
              ) : (
                <ul className="space-y-2 text-xs text-zinc-300">
                  {tasks.map((t) => (
                    <li key={t.id}>
                      {t.taskType} · due {new Date(t.dueDate).toLocaleDateString()} ({t.status})
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="border-zinc-800 bg-zinc-900/50 p-4">
              <h2 className="mb-2 text-sm font-semibold text-zinc-200">Linked opportunities</h2>
              {opportunities.length === 0 ? (
                <p className="text-xs text-zinc-500">None linked.</p>
              ) : (
                <ul className="space-y-1 text-xs text-zinc-300">
                  {opportunities.map((o) => (
                    <li key={o.id}>{o.label}</li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex gap-2">
                <select
                  value={selectedOpp}
                  onChange={(e) => setSelectedOpp(e.target.value)}
                  className="h-8 min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-950 px-2 text-xs"
                >
                  <option value="">Select to link</option>
                  {linkableOpportunities.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (!selectedOpp) return;
                    await fetch("/api/opportunities/link", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ opportunityId: selectedOpp, contactId: profile.id }),
                    });
                    refresh();
                  }}
                >
                  Link
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Modal open={showI} onClose={() => setShowI(false)} title="Log interaction" className="max-w-lg">
        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1 text-sm">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-zinc-500">Date</label>
            <Input
              type="date"
              className={fieldClass}
              value={interactionForm.date}
              onChange={(e) => setInteractionForm((p) => ({ ...p, date: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-zinc-500">Type</label>
            <select
              className={fieldClass}
              value={interactionForm.type}
              onChange={(e) => setInteractionForm((p) => ({ ...p, type: e.target.value }))}
            >
              {interactionTypes.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-zinc-500">What was discussed</label>
            <textarea
              className={`${fieldClass} min-h-[72px]`}
              value={interactionForm.notes}
              onChange={(e) => setInteractionForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-zinc-500">Advice given</label>
            <textarea
              className={`${fieldClass} min-h-[64px]`}
              value={interactionForm.adviceGiven}
              onChange={(e) => setInteractionForm((p) => ({ ...p, adviceGiven: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-zinc-500">
              Action items (one per line)
            </label>
            <textarea
              className={`${fieldClass} min-h-[64px]`}
              value={interactionForm.actionItemsText}
              onChange={(e) => setInteractionForm((p) => ({ ...p, actionItemsText: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-zinc-500">Personal details</label>
            <textarea
              className={`${fieldClass} min-h-[56px]`}
              value={interactionForm.personalDetails}
              onChange={(e) => setInteractionForm((p) => ({ ...p, personalDetails: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-zinc-500">Firm insights</label>
            <textarea
              className={`${fieldClass} min-h-[56px]`}
              value={interactionForm.firmInsights}
              onChange={(e) => setInteractionForm((p) => ({ ...p, firmInsights: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-zinc-500">Red flags</label>
            <textarea
              className={`${fieldClass} min-h-[48px]`}
              value={interactionForm.redFlags}
              onChange={(e) => setInteractionForm((p) => ({ ...p, redFlags: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-zinc-500">Follow-up date (optional)</label>
            <Input
              type="date"
              className={fieldClass}
              value={interactionForm.followUpDate}
              onChange={(e) => setInteractionForm((p) => ({ ...p, followUpDate: e.target.value }))}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setShowI(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={() => void logInteraction()}>
            Save interaction
          </Button>
        </div>
      </Modal>

      <Modal open={showIntro} onClose={() => setShowIntro(false)} title="Request intro" className="max-w-md">
        <p className="mb-2 text-xs text-zinc-400">Who do you want an intro to? (person and/or firm)</p>
        <Input
          className={fieldClass}
          value={introTarget}
          onChange={(e) => setIntroTarget(e.target.value)}
          placeholder="e.g. Jane Doe at Morgan Stanley"
        />
        <div className="mt-3 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setShowIntro(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" disabled={introBusy || !introTarget.trim()} onClick={() => void submitIntroRequest()}>
            {introBusy ? "Drafting…" : "Draft email"}
          </Button>
        </div>
      </Modal>

      <Modal open={showT} onClose={() => setShowT(false)} title="Add task">
        <div className="grid gap-2">
          <Input
            type="date"
            className={fieldClass}
            value={taskForm.dueDate}
            onChange={(e) => setTaskForm((p) => ({ ...p, dueDate: e.target.value }))}
          />
          <Input
            className={fieldClass}
            value={taskForm.taskType}
            onChange={(e) => setTaskForm((p) => ({ ...p, taskType: e.target.value }))}
          />
          <Input
            className={fieldClass}
            value={taskForm.notes}
            onChange={(e) => setTaskForm((p) => ({ ...p, notes: e.target.value }))}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            onClick={async () => {
              await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(taskForm),
              });
              setShowT(false);
              refresh();
            }}
          >
            Save
          </Button>
        </div>
      </Modal>

      <AiOutputModal
        open={aiModal.open}
        title={aiModal.title}
        text={aiModal.text}
        loading={aiModal.loading}
        error={aiModal.error}
        onClose={() => setAiModal((m) => ({ ...m, open: false }))}
      />
    </div>
  );
}
