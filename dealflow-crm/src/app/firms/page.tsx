import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function FirmsPage() {
  const userId = await requireUserId();
  const firms = await prisma.firm.findMany({
    where: { userId },
    include: { _count: { select: { contacts: true, opportunities: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Firms</h1>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-left text-zinc-400">
            <tr><th className="px-3 py-2">Firm</th><th>Type</th><th>Location</th><th>Contacts</th><th>Opportunities</th></tr>
          </thead>
          <tbody>
            {firms.map((f) => (
              <tr key={f.id} className="border-t border-zinc-800">
                <td className="px-3 py-2"><Link href={`/firms/${f.id}`} className="text-cyan-400 hover:underline">{f.name}</Link></td>
                <td>{f.type}</td><td>{f.location}</td><td>{f._count.contacts}</td><td>{f._count.opportunities}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
