import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SchoolProfilePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUserId();
  const { id } = await params;
  const school = await prisma.school.findUnique({
    where: { id },
    select: { name: true, shortName: true, location: true, type: true, domain: true },
  });
  if (!school) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/schools" className="text-xs text-amber-200/90 hover:underline">
        ← Schools
      </Link>
      <Card className="border-zinc-800 bg-zinc-900/50 p-6">
        <h1 className="text-2xl font-semibold text-zinc-50">{school.name}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {school.shortName} · {school.domain}
        </p>
        {school.location ? <p className="mt-2 text-sm text-zinc-400">{school.location}</p> : null}
        <p className="mt-3 text-sm text-zinc-500">
          School profile pages (placements, clubs, and activity) will live here. For now, explore the global hub from the
          sidebar.
        </p>
      </Card>
    </div>
  );
}
