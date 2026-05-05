import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ResearchPage() {
  await requireUserId();
  const firms = await prisma.firmResearch.findMany({ orderBy: { firmName: "asc" } });
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Firm research</h1>
        <p className="mt-1 text-sm text-zinc-400">
          <span className="text-emerald-400/90">SHARED</span> wiki — any logged-in member can edit.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {firms.map((f) => (
          <Link
            key={f.id}
            href={`/research/${f.id}`}
            className="block h-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-cyan-800/60"
          >
            <p className="font-semibold text-cyan-300">{f.firmName}</p>
            <p className="mt-1 text-xs text-zinc-500">{f.firmType}</p>
            {f.description ? (
              <p className="mt-2 line-clamp-3 text-sm text-zinc-400">{f.description}</p>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
