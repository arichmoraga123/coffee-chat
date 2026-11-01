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
        <h1 className="page-title">Firm research</h1>
        <p className="mt-1 text-sm text-ink-2">
          <span className="text-success">SHARED</span> wiki — any logged-in member can edit.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {firms.map((f) => (
          <Link
            key={f.id}
            href={`/research/${f.id}`}
            className="block h-full rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong"
          >
            <p className="font-semibold text-ink">{f.firmName}</p>
            <p className="mt-1 text-xs text-ink-3">{f.firmType}</p>
            {f.description ? (
              <p className="mt-2 line-clamp-3 text-sm text-ink-2">{f.description}</p>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
