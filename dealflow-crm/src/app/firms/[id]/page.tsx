import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { requireUserId } from "@/lib/auth";

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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{firm.name}</h1>
      <Card className="p-4 text-sm">
        <p>{firm.type} | {firm.location}</p>
        <p className="text-zinc-400">Focus: {firm.focus} {firm.aum ? `| AUM: ${firm.aum}` : ""}</p>
        <p className="mt-2">{firm.recruitingNotes || "No recruiting notes yet."}</p>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">Contacts</h2>
          {firm.contacts.map((c) => (
            <p key={c.id} className="mb-1 text-sm"><Link className="text-cyan-400 hover:underline" href={`/contacts/${c.id}`}>{c.fullName}</Link> - {c.title}</p>
          ))}
        </Card>
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">Opportunities</h2>
          {firm.opportunities.map((o) => (
            <p key={o.id} className="mb-1 text-sm">{o.role} ({o.stage})</p>
          ))}
        </Card>
      </div>
    </div>
  );
}
