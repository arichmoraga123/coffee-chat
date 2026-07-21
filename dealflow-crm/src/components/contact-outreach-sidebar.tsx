"use client";

import { differenceInDays } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EMAIL_TEMPLATE_TYPES } from "@/lib/email-template-types";

type Draft = {
  id: string;
  templateType: string;
  content: string;
  createdAt: string;
};

type Interaction = {
  id: string;
  date: string;
  type: string;
  notes: string | null;
};

type Props = {
  drafts: Draft[];
  interactions: Interaction[];
  contactName: string;
  firmName: string;
  firstName: string;
  lastName: string;
  onDraftFollowUp: () => void;
  onPreCallBrief: () => void;
  onFindLinkedIn: () => void;
  onFindEmail: () => void;
  onAddToCalendar: () => void;
  onDraftTemplate: (templateType: string) => void;
};

export function ContactOutreachSidebar({
  drafts,
  interactions,
  onDraftFollowUp,
  onPreCallBrief,
  onFindLinkedIn,
  onFindEmail,
  onAddToCalendar,
  onDraftTemplate,
}: Props) {
  const emailInteractions = interactions.filter((i) => i.type === "EMAIL");
  const firstContact = interactions.length
    ? interactions[interactions.length - 1]
    : null;
  const lastContact = interactions[0] ?? null;
  const daysSinceFirst = firstContact
    ? differenceInDays(new Date(), new Date(firstContact.date))
    : null;
  const daysSinceLast = lastContact
    ? differenceInDays(new Date(), new Date(lastContact.date))
    : null;
  const responseRate =
    emailInteractions.length > 0
      ? Math.round(
          (interactions.filter((i) => i.type === "COFFEE_CHAT" || i.type === "CALL").length /
            emailInteractions.length) *
            100,
        )
      : null;

  return (
    <div className="space-y-4">
      <Card className="border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">Quick Actions</h2>
        <div className="flex flex-col gap-2">
          <Button size="sm" variant="outline" onClick={onDraftFollowUp}>
            Draft follow-up
          </Button>
          <Button size="sm" variant="outline" onClick={onPreCallBrief}>
            Pre-call brief
          </Button>
          <Button size="sm" variant="outline" onClick={onFindLinkedIn}>
            Find on LinkedIn
          </Button>
          <Button size="sm" variant="outline" onClick={onFindEmail}>
            Find email
          </Button>
          <Button size="sm" variant="outline" onClick={onAddToCalendar}>
            Add to calendar
          </Button>
          <div className="mt-2 border-t border-white/10 pt-2">
            <p className="mb-2 text-[10px] font-semibold uppercase text-zinc-500">Email templates</p>
            {(Object.entries(EMAIL_TEMPLATE_TYPES) as [string, (typeof EMAIL_TEMPLATE_TYPES)[keyof typeof EMAIL_TEMPLATE_TYPES]][]).map(
              ([key, t]) => (
                <button
                  key={key}
                  type="button"
                  className="block w-full rounded px-2 py-1.5 text-left text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  onClick={() => onDraftTemplate(key)}
                >
                  {t.icon} {t.label}
                </button>
              ),
            )}
          </div>
        </div>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">Outreach History</h2>
        <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
          {daysSinceFirst !== null ? (
            <div>
              <p className="text-zinc-500">Days since first contact</p>
              <p className="font-medium text-zinc-200">{daysSinceFirst}</p>
            </div>
          ) : null}
          {daysSinceLast !== null ? (
            <div>
              <p className="text-zinc-500">Days since last contact</p>
              <p className="font-medium text-zinc-200">{daysSinceLast}</p>
            </div>
          ) : null}
          {responseRate !== null ? (
            <div className="col-span-2">
              <p className="text-zinc-500">Response rate (tracked)</p>
              <p className="font-medium text-zinc-200">{responseRate}%</p>
            </div>
          ) : null}
        </div>

        {drafts.length > 0 ? (
          <div className="mb-4">
            <p className="mb-2 text-[10px] font-semibold uppercase text-zinc-500">Emails drafted</p>
            <ul className="space-y-2">
              {drafts.map((d) => (
                <li key={d.id} className="rounded border border-white/5 bg-zinc-950/50 p-2 text-xs">
                  <p className="font-medium text-zinc-300">
                    {EMAIL_TEMPLATE_TYPES[d.templateType as keyof typeof EMAIL_TEMPLATE_TYPES]?.label ??
                      d.templateType}
                  </p>
                  <p className="text-zinc-500">{new Date(d.createdAt).toLocaleString()}</p>
                  <p className="mt-1 line-clamp-2 text-zinc-400">{d.content}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mb-2 text-[10px] font-semibold uppercase text-zinc-500">Interactions logged</p>
        {interactions.length === 0 ? (
          <p className="text-xs text-zinc-500">No interactions yet.</p>
        ) : (
          <ul className="space-y-1 text-xs text-zinc-400">
            {interactions.slice(0, 8).map((i) => (
              <li key={i.id}>
                {new Date(i.date).toLocaleDateString()} — {i.type.replace(/_/g, " ")}
                {i.notes ? `: ${i.notes.slice(0, 60)}` : ""}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
