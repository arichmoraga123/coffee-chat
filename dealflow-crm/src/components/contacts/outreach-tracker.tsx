import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { kindOf, nextFollowup, type InteractionKind } from "@/lib/followups";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DataTable, Td, Th } from "@/components/ui/data-table";
import { StatTile } from "@/components/ui/stat-tile";
import { cn } from "@/lib/utils";

const COLD: InteractionKind[] = ["cold_email", "linkedin_message"];
const WARM: InteractionKind[] = ["replied", "coffee_chat", "phone_call", "video_call", "in_person", "interview", "referral", "thank_you"];
const DAY = 86_400_000;

type Status = "queued" | "waiting" | "bump1" | "bump2" | "replied" | "cold";
const STATUS_LABEL: Record<Status, string> = { queued: "To send", waiting: "Waiting", bump1: "Bump #1 due", bump2: "Bump #2 due", replied: "Replied", cold: "Gone cold" };

/** Contacts → Outreach queue: the cold-outreach funnel, reply rate, and each person's next action. */
export async function OutreachTracker({ userId }: { userId: string }) {
  const contacts = await prisma.contact.findMany({
    where: { userId, deletedAt: null, list: "active", doNotContact: false },
    select: {
      id: true,
      fullName: true,
      inOutreachQueue: true,
      priority: true,
      notPursuing: true,
      firm: { select: { name: true } },
      interactions: { where: { deletedAt: null, autoCreated: false }, orderBy: { date: "asc" }, select: { id: true, date: true, kind: true, type: true, notes: true, nextStep: true, nextStepDue: true } },
    },
  });
  const now = new Date().getTime();
  type Row = { id: string; name: string; firm: string; status: Status; sent: Date | null; bumps: number; lastTouch: Date | null; due: Date | null };
  const rows: Row[] = [];
  let sent30 = 0;
  let replied30 = 0;

  for (const c of contacts) {
    const xs = c.interactions.map((i) => ({ ...i, k: kindOf(i) }));
    const firstCold = xs.find((i) => COLD.includes(i.k));
    if (!firstCold) {
      if (c.inOutreachQueue && xs.length === 0) rows.push({ id: c.id, name: c.fullName, firm: c.firm.name, status: "queued", sent: null, bumps: 0, lastTouch: null, due: null });
      continue;
    }
    const after = xs.filter((i) => i.date >= firstCold.date);
    const gotReply = after.some((i) => WARM.includes(i.k));
    const bumps = after.filter((i) => i !== firstCold && (i.k === "followup_email" || COLD.includes(i.k)) && !after.some((w) => WARM.includes(w.k) && w.date <= i.date)).length;
    if (now - firstCold.date.getTime() <= 30 * DAY) {
      sent30++;
      if (gotReply) replied30++;
    }
    const r = nextFollowup(c, xs.map((i) => ({ id: i.id, date: i.date, kind: i.k, nextStep: i.nextStep, nextStepDue: i.nextStepDue })));
    let status: Status = "waiting";
    if (gotReply) status = "replied";
    else if (r.goneCold) status = "cold";
    else if (r.followup?.kind === "bump1" && r.followup.due.getTime() <= now) status = "bump1";
    else if (r.followup?.kind === "bump2" && r.followup.due.getTime() <= now) status = "bump2";
    rows.push({ id: c.id, name: c.fullName, firm: c.firm.name, status, sent: firstCold.date, bumps, lastTouch: xs[xs.length - 1]?.date ?? null, due: r.followup?.due ?? null });
  }

  const count = (s: Status) => rows.filter((r) => r.status === s).length;
  const order: Status[] = ["bump1", "bump2", "queued", "waiting", "replied", "cold"];
  rows.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || (a.due?.getTime() ?? 0) - (b.due?.getTime() ?? 0));
  const funnel: Status[] = ["queued", "waiting", "bump1", "bump2", "replied", "cold"];
  const rate = sent30 ? Math.round((replied30 / sent30) * 100) : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-border bg-divider sm:grid-cols-3 lg:grid-cols-7">
        <div className="bg-surface px-4 py-3">
          <StatTile value={rows.filter((r) => r.sent).length} label="Sent" />
        </div>
        {funnel.map((s) => (
          <div key={s} className="bg-surface px-4 py-3">
            <StatTile value={count(s)} label={STATUS_LABEL[s]} tone={s === "bump1" || s === "bump2" ? (count(s) ? "warn" : undefined) : undefined} />
          </div>
        ))}
      </div>
      <Card className="p-4">
        <p className="text-sm text-ink">
          Reply rate, last 30 days: <span className="font-semibold">{rate === null ? "—" : `${rate}%`}</span>{" "}
          <span className="text-ink-3">
            ({replied30} of {sent30} cold emails got a reply). Mark emails as sent from the Email writer so this stays accurate.
          </span>
        </p>
      </Card>
      {rows.length ? (
        <DataTable minWidth={760}>
          <thead>
            <tr>
              <Th>Person</Th>
              <Th>Status</Th>
              <Th>Sent</Th>
              <Th className="text-right">Bumps</Th>
              <Th>Last touch</Th>
              <Th className="w-40" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const days = r.lastTouch ? Math.floor((now - r.lastTouch.getTime()) / DAY) : null;
              const draftKind = r.status === "queued" ? "cold" : r.status === "bump1" || r.status === "bump2" || r.status === "waiting" ? "bump" : r.status === "cold" ? "re-engage" : "thank-you";
              return (
                <tr key={r.id}>
                  <Td>
                    <Link href={`/contacts/${r.id}`} className="font-medium hover:underline">
                      {r.name}
                    </Link>
                    <span className="block text-[13px] text-ink-3">{r.firm}</span>
                  </Td>
                  <Td>
                    <Badge tone={r.status === "replied" ? "success" : r.status === "bump1" || r.status === "bump2" ? "warn" : r.status === "cold" ? "neutral" : "info"}>{STATUS_LABEL[r.status]}</Badge>
                  </Td>
                  <Td className="text-ink-2">{r.sent ? r.sent.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : "—"}</Td>
                  <Td className="text-right text-ink-2">{r.bumps}</Td>
                  <Td className={cn("text-ink-2", days !== null && days > 14 && "text-warn")}>{days === null ? "—" : days === 0 ? "Today" : `${days} days ago`}</Td>
                  <Td className="text-right">
                    {r.status === "replied" ? (
                      <Link href={`/contacts/${r.id}`} className="text-[13px] font-medium text-accent hover:underline">
                        Open
                      </Link>
                    ) : (
                      <Link href={`/emails?contact=${r.id}&kind=${draftKind}`} className="text-[13px] font-medium text-accent hover:underline">
                        {r.status === "queued" ? "Write cold email" : r.status === "cold" ? "Re-engage" : "Draft bump"}
                      </Link>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      ) : (
        <p className="text-sm text-ink-3">No cold outreach yet. Write one in the Email writer and press Mark as sent.</p>
      )}
    </div>
  );
}
