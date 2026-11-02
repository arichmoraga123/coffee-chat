import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { requireUserId } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, Td, Th } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { STAGE_LABELS } from "@/lib/constants";
import { INTERACTION_KINDS, kindOf, nextFollowup, stageFromKind } from "@/lib/followups";
import { peBroadMembership } from "@/lib/club-social";
import { firmOverlap } from "@/lib/club-profiles";
import { FirmDetailEditor } from "@/components/firm-detail-editor";
import { FirmTypeBadge } from "@/lib/firm-type";

export const dynamic = "force-dynamic";

export default async function FirmDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();
  const firm = await prisma.firm.findFirst({
    where: { id, userId },
    include: {
      contacts: {
        where: { deletedAt: null },
        orderBy: [{ lastInteractionDate: { sort: "desc", nulls: "last" } }],
        include: {
          interactions: { where: { deletedAt: null, autoCreated: false }, orderBy: { date: "desc" }, take: 8, select: { id: true, date: true, kind: true, type: true, notes: true, nextStep: true, nextStepDue: true } },
        },
      },
      opportunities: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!firm) return notFound();
  const membership = await peBroadMembership(userId);
  const overlap = membership ? await firmOverlap(membership.clubId, firm.name, userId) : [];
  const tasks = await prisma.task.findMany({
    where: { userId, status: "PENDING", dismissedAt: null, contact: { firmId: firm.id, deletedAt: null } },
    orderBy: { dueDate: "asc" },
    take: 20,
    select: { id: true, dueDate: true, reason: true, taskType: true, contact: { select: { id: true, fullName: true } } },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        crumbs={[{ label: "Firms", href: "/firms" }, { label: firm.name }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {firm.name}
            <FirmTypeBadge type={firm.type} />
          </span>
        }
        subtitle={[firm.location !== "Unknown" ? firm.location : null, firm.focus !== "Generalist" ? firm.focus : null, `${firm.contacts.length} contact${firm.contacts.length === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
        actions={
          <Link href={`/prep/${firm.id}`} className="inline-flex h-9 items-center rounded-[var(--radius)] border border-border-strong bg-surface px-4 text-sm font-medium text-ink hover:bg-surface-2">
            Prep for interview
          </Link>
        }
      />
      {overlap.length ? (
        <p className="rounded-[var(--radius)] border border-border bg-accent-tint px-4 py-3 text-sm text-ink">
          {overlap.length} PE@Broad member{overlap.length === 1 ? " is" : "s are"} also talking to {firm.name}:{" "}
          {overlap.map((o, i) => (
            <span key={o.userId}>
              {i ? ", " : ""}
              <Link href={`/club/pe-broad/members/${o.userId}`} className="font-medium text-accent hover:underline">
                {o.name}
              </Link>{" "}
              <span className="text-ink-3">({o.stage})</span>
            </span>
          ))}
          . Compare notes before your interviews.
        </p>
      ) : null}
      <section className="space-y-3">
        <h2 className="section-title">Your contacts here</h2>
        {firm.contacts.length ? (
          <DataTable minWidth={620}>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Title</Th>
                <Th>Stage</Th>
                <Th>Last contact</Th>
                <Th>Next</Th>
              </tr>
            </thead>
            <tbody>
              {firm.contacts.map((c) => {
                const ixs = c.interactions.map((i) => ({ id: i.id, date: i.date, kind: kindOf(i), nextStep: i.nextStep, nextStepDue: i.nextStepDue }));
                const r = nextFollowup(c, ixs);
                const last = ixs[0];
                return (
                  <tr key={c.id}>
                    <Td>
                      <Link href={`/contacts/${c.id}`} className="font-medium hover:underline">
                        {c.fullName}
                      </Link>
                    </Td>
                    <Td className="text-ink-2">{c.title || "—"}</Td>
                    <Td className="text-ink-2">{c.relationshipStage ?? stageFromKind(last?.kind ?? null)}</Td>
                    <Td className="text-ink-2">{last ? `${INTERACTION_KINDS[last.kind].label} · ${last.date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}` : "Not contacted yet"}</Td>
                    <Td className="text-ink-2">{r.followup ? `${r.followup.label} · ${r.followup.due.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}` : r.goneCold ? "Gone cold" : "—"}</Td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        ) : (
          <p className="text-sm text-ink-3">No contacts at {firm.name} yet.</p>
        )}
      </section>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
        <Card title="Pipeline" action={<Link href="/pipeline" className="text-accent hover:underline">Open pipeline</Link>}>
          {firm.opportunities.length ? (
            <ul className="space-y-2 text-sm">
              {firm.opportunities.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3">
                  <span className="text-ink">
                    {o.role}
                    {o.group ? <span className="text-ink-3"> · {o.group}</span> : null}
                  </span>
                  <Badge tone={o.stage === "OFFER" ? "success" : o.stage === "REJECTED" ? "danger" : "neutral"}>{STAGE_LABELS[o.stage]}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-3">Not in your pipeline yet.</p>
          )}
        </Card>
        <Card title="Tasks" action={<Link href="/tasks" className="text-accent hover:underline">All tasks</Link>}>
          {tasks.length ? (
            <ul className="space-y-2 text-sm">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 text-ink">
                    <Link href={`/contacts/${t.contact.id}`} className="font-medium hover:underline">
                      {t.contact.fullName}
                    </Link>
                    {t.reason ? <span className="block text-[13px] text-ink-3">{t.reason}</span> : null}
                  </span>
                  <span className="shrink-0 text-[13px] text-ink-2">{t.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-3">Nothing due.</p>
          )}
        </Card>
      </div>
      <FirmDetailEditor
        firm={{
          id: firm.id,
          name: firm.name,
          type: firm.type,
          location: firm.location,
          focus: firm.focus,
          aum: firm.aum,
          recruitingNotes: firm.recruitingNotes,
        }}
      />
    </div>
  );
}
