import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { requireUserId } from "@/lib/auth";
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
    include: { contacts: true, opportunities: true },
  });
  if (!firm) return notFound();
  const membership = await peBroadMembership(userId);
  const overlap = membership ? await firmOverlap(membership.clubId, firm.name, userId) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/firms" className="text-xs text-ink-3 underline-offset-4 hover:text-ink hover:underline">
          ← Firms
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">{firm.name}</h1>
        <FirmTypeBadge type={firm.type} />
      </div>
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
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">Contacts</h2>
          {firm.contacts.map((c) => (
            <p key={c.id} className="mb-1 text-sm">
              <Link className="text-ink underline-offset-4 hover:underline" href={`/contacts/${c.id}`}>
                {c.fullName}
              </Link>{" "}
              - {c.title}
            </p>
          ))}
        </Card>
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">Opportunities</h2>
          {firm.opportunities.map((o) => (
            <p key={o.id} className="mb-1 text-sm">
              {o.role} ({o.stage})
            </p>
          ))}
        </Card>
      </div>
    </div>
  );
}
