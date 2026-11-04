"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { readAiStream } from "@/lib/read-ai-stream";
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
import { ContactOutreachSidebar } from "@/components/contact-outreach-sidebar";
import { ContactEmailDropdown } from "@/components/contact-email-dropdown";
import type { EmailTemplateType } from "@/lib/email-template-types";
import { EMAIL_TEMPLATE_TYPES } from "@/lib/email-template-types";
import { Select } from "@/components/ui/select";
import { bulkRequest } from "@/components/ui/bulk";
import { LogInteractionDialog } from "@/components/contacts/log-interaction-dialog";

type FirmOption = { id: string; name: string; type?: string | null };

type EmailDraft = {
  id: string;
  templateType: string;
  content: string;
  createdAt: string;
};

type Props = {
  profile: ContactProfilePayload;
  firms: FirmOption[];
  interactions: TimelineInteraction[];
  meta?: { deleted: boolean; list: string; importSource: string | null };
  emailDrafts: EmailDraft[];
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
  meta,
  emailDrafts,
  tasks,
  opportunities,
  linkableOpportunities,
}: Props) {
  const router = useRouter();
  const [showI, setShowI] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const logContact = useMemo(() => ({ value: profile.id, label: profile.fullName }), [profile.id, profile.fullName]);
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

  /** Opens the AI popup and fills it as the text streams in. */
  const runAi = async (title: string, url: string, body?: unknown) => {
    openAiModal(title);
    try {
      const done = await readAiStream<{ text?: string }>(url, body, (ev) => {
        if (typeof ev.text === "string") setAiModal((m) => ({ ...m, text: ev.text as string }));
      });
      setAiModal((m) => ({ ...m, loading: false, text: done.text ?? m.text }));
      return true;
    } catch (e) {
      setAiModal((m) => ({ ...m, loading: false, error: e instanceof Error ? e.message : "Network error" }));
      return false;
    }
  };

  const runPreCallBrief = () => void runAi("Pre-call brief", `/api/contacts/${profile.id}/pre-call-brief`);

  const runDraftFollowUp = (interactionId: string) => void runAi("Follow-up email draft", `/api/contacts/${profile.id}/draft-followup`, { interactionId });

  const submitIntroRequest = async () => {
    setIntroBusy(true);
    setShowIntro(false);
    const ok = await runAi("Intro request draft", `/api/contacts/${profile.id}/intro-request`, { targetPerson: introTarget });
    if (ok) setIntroTarget("");
    setIntroBusy(false);
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

  const runDraftTemplate = async (templateType: EmailTemplateType) => {
    if (await runAi(EMAIL_TEMPLATE_TYPES[templateType]?.label ?? "Email draft", `/api/contacts/${profile.id}/draft-email`, { templateType })) refresh();
  };

  const nameParts = profile.fullName.trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ") || firstName;
  const firmDomain = profile.firmName.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";

  const fieldClass =
    "w-full rounded border border-border-strong bg-surface px-2 py-2 text-sm text-ink placeholder:text-ink-3";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title">{profile.fullName}</h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
            <span>
              {profile.title} · {profile.group} · {profile.firmName}
            </span>
            <FirmTypeBadge type={profile.firmType} />
            {meta?.list === "network" ? <span className="rounded bg-surface-2 px-2 py-0.5 text-xs text-ink-2">Network</span> : null}
          </p>
          {meta?.importSource ? <p className="mt-1 text-[13px] text-ink-3">{meta.importSource}</p> : null}
          {meta?.deleted ? <p className="mt-1 text-[13px] text-danger">This contact is in Trash.</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <ContactEmailDropdown contactId={profile.id} size="default" />
          <Button size="sm" variant="outline" onClick={() => setLogOpen(true)}>
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
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              const ok = await bulkRequest(
                { entity: "contacts", ids: [profile.id], op: "action", action: meta?.deleted ? "restore" : "delete" },
                { success: () => (meta?.deleted ? `Restored ${profile.fullName}` : `Deleted ${profile.fullName}`), onChange: () => router.refresh() },
              );
              if (ok && !meta?.deleted) router.push("/contacts");
            }}
          >
            {meta?.deleted ? "Restore" : "Delete"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr_minmax(0,280px)]">
        <ContactProfileForm profile={profile} firms={firms} />
        <div className="space-y-4">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-ink">Interaction timeline</h2>
            <ContactInteractionTimeline interactions={interactions} onDraftFollowUp={runDraftFollowUp} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Card className="border-border bg-surface p-4">
              <h2 className="mb-2 text-sm font-semibold text-ink">Tasks</h2>
              {tasks.length === 0 ? (
                <p className="text-xs text-ink-3">No tasks.</p>
              ) : (
                <ul className="space-y-2 text-xs text-ink-2">
                  {tasks.map((t) => (
                    <li key={t.id}>
                      {t.taskType} · due {new Date(t.dueDate).toLocaleDateString()} ({t.status})
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="border-border bg-surface p-4">
              <h2 className="mb-2 text-sm font-semibold text-ink">Linked opportunities</h2>
              {opportunities.length === 0 ? (
                <p className="text-xs text-ink-3">None linked.</p>
              ) : (
                <ul className="space-y-1 text-xs text-ink-2">
                  {opportunities.map((o) => (
                    <li key={o.id}>{o.label}</li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex gap-2">
                <Select
                  value={selectedOpp}
                  onChange={(e) => setSelectedOpp(e.target.value)}
                  className="min-w-0 flex-1"
                >
                  <option value="">Select to link</option>
                  {linkableOpportunities.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </Select>
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
        <ContactOutreachSidebar
          drafts={emailDrafts}
          interactions={interactions.map((i) => ({
            id: i.id,
            date: i.date,
            type: i.type,
            notes: i.notes,
          }))}
          contactName={profile.fullName}
          firmName={profile.firmName}
          firstName={firstName}
          lastName={lastName}
          onDraftFollowUp={() => {
            const last = interactions[0];
            if (last) void runDraftFollowUp(last.id);
          }}
          onPreCallBrief={() => void runPreCallBrief()}
          onFindLinkedIn={() => {
            const q = encodeURIComponent(`${profile.fullName} ${profile.firmName}`);
            window.open(`https://www.linkedin.com/search/results/people/?keywords=${q}`, "_blank");
          }}
          onFindEmail={() => {
            window.open(
              `https://hunter.io/email-finder?domain=${firmDomain}&first=${encodeURIComponent(firstName)}&last=${encodeURIComponent(lastName)}`,
              "_blank",
            );
          }}
          onAddToCalendar={async () => {
            const date = new Date();
            date.setDate(date.getDate() + 7);
            await fetch("/api/events", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: `Coffee chat — ${profile.fullName}`,
                date: date.toISOString(),
                type: "coffee_chat",
                firmName: profile.firmName,
                notes: `Scheduled call with ${profile.fullName} (${profile.title})`,
              }),
            });
            alert("Added to recruiting calendar");
          }}
          onDraftTemplate={(t) => void runDraftTemplate(t as EmailTemplateType)}
        />
      </div>

      <LogInteractionDialog open={logOpen} onClose={() => setLogOpen(false)} contact={logContact} onSaved={() => router.refresh()} />
      <Modal open={showI} onClose={() => setShowI(false)} title="Log interaction" className="max-w-lg">
        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1 text-sm">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-ink-3">Date</label>
            <Input
              type="date"
              className={fieldClass}
              value={interactionForm.date}
              onChange={(e) => setInteractionForm((p) => ({ ...p, date: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-ink-3">Type</label>
            <Select
              className={fieldClass}
              value={interactionForm.type}
              onChange={(e) => setInteractionForm((p) => ({ ...p, type: e.target.value }))}
            >
              {interactionTypes.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-ink-3">What was discussed</label>
            <textarea
              className={`${fieldClass} min-h-[72px]`}
              value={interactionForm.notes}
              onChange={(e) => setInteractionForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-ink-3">Advice given</label>
            <textarea
              className={`${fieldClass} min-h-[64px]`}
              value={interactionForm.adviceGiven}
              onChange={(e) => setInteractionForm((p) => ({ ...p, adviceGiven: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-ink-3">
              Action items (one per line)
            </label>
            <textarea
              className={`${fieldClass} min-h-[64px]`}
              value={interactionForm.actionItemsText}
              onChange={(e) => setInteractionForm((p) => ({ ...p, actionItemsText: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-ink-3">Personal details</label>
            <textarea
              className={`${fieldClass} min-h-[56px]`}
              value={interactionForm.personalDetails}
              onChange={(e) => setInteractionForm((p) => ({ ...p, personalDetails: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-ink-3">Firm insights</label>
            <textarea
              className={`${fieldClass} min-h-[56px]`}
              value={interactionForm.firmInsights}
              onChange={(e) => setInteractionForm((p) => ({ ...p, firmInsights: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-ink-3">Red flags</label>
            <textarea
              className={`${fieldClass} min-h-[48px]`}
              value={interactionForm.redFlags}
              onChange={(e) => setInteractionForm((p) => ({ ...p, redFlags: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-ink-3">Follow-up date (optional)</label>
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
        <p className="mb-2 text-xs text-ink-2">Who do you want an intro to? (person and/or firm)</p>
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
