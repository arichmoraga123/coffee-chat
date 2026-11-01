"use client";

import Link from "next/link";
import { differenceInDays } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ContactEmailDropdown } from "@/components/contact-email-dropdown";
import { FirmTypeBadge } from "@/lib/firm-type";

export type QueueContact = {
  id: string;
  fullName: string;
  firmName: string;
  firmType: string | null;
  firmId: string;
  title: string;
  warmthScore: string;
  createdAt: string;
  inOutreachQueue: boolean;
};

const warmthColors: Record<string, string> = {
  COLD: "bg-info-bg text-info",
  WARM: "bg-warn-bg text-warn",
  HOT: "bg-warn-bg text-warn",
  ADVOCATE: "bg-success-bg text-success",
};

type Props = {
  contacts: QueueContact[];
  onDraftEmail: (contactId: string) => void;
  onMarkContacted: (contactId: string) => void;
  onRemove: (contactId: string) => void;
};

export function OutreachQueuePanel({
  contacts,
  onDraftEmail,
  onMarkContacted,
  onRemove,
}: Props) {
  const sorted = [...contacts].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-ink-2">Outreach queue is empty.</p>
        <p className="mt-1 text-xs text-ink-3">
          Add contacts via Find Contacts or the contact menu.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((c) => {
        const days = differenceInDays(new Date(), new Date(c.createdAt));
        return (
          <Card key={c.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/contacts/${c.id}`}
                    className="font-medium text-ink underline-offset-4 hover:underline"
                  >
                    {c.fullName}
                  </Link>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${warmthColors[c.warmthScore] ?? warmthColors.COLD}`}
                  >
                    {c.warmthScore}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-2">
                  {c.title} ·{" "}
                  <Link href={`/firms/${c.firmId}`} className="hover:underline">
                    {c.firmName}
                  </Link>{" "}
                  <FirmTypeBadge type={c.firmType} className="ml-1" />
                </p>
                <p className="mt-1 text-xs text-ink-3">
                  Added {days === 0 ? "today" : `${days} day${days !== 1 ? "s" : ""} ago`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => onDraftEmail(c.id)}>
                  Draft Email
                </Button>
                <Button size="sm" variant="outline" onClick={() => onMarkContacted(c.id)}>
                  Mark Contacted
                </Button>
                <Button size="sm" variant="outline" onClick={() => onRemove(c.id)}>
                  Remove
                </Button>
                <ContactEmailDropdown contactId={c.id} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
