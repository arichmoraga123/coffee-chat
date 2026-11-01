import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { resolveClubIdForUser } from "@/lib/club-server";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ClubProjectsPage() {
  const userId = await requireUserId();
  const clubId = await resolveClubIdForUser(userId);
  if (!clubId) return <p className="text-sm text-ink-2">No club context.</p>;

  const projects = await prisma.clubProject.findMany({
    where: { clubId },
    orderBy: { createdAt: "desc" },
    include: { deliverables: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-ink">Projects</h1>
      <div className="space-y-4">
        {projects.map((p) => (
          <Card key={p.id} className="border-border bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase text-ink-3">{p.status}</p>
                <h2 className="text-lg font-medium text-ink">{p.title}</h2>
                {p.description ? <p className="mt-2 text-sm text-ink-2">{p.description}</p> : null}
                {p.dueDate ? <p className="mt-1 text-xs text-ink-3">Due {format(p.dueDate, "MMM d, yyyy")}</p> : null}
                {p.driveLink ? (
                  <Link href={p.driveLink} className="mt-2 inline-block text-xs text-warn hover:underline" target="_blank" rel="noreferrer">
                    Drive folder
                  </Link>
                ) : null}
              </div>
            </div>
            {p.deliverables.length ? (
              <ul className="mt-4 space-y-2 border-t border-border pt-3">
                {p.deliverables.map((d) => (
                  <li key={d.id} className="text-sm text-ink-2">
                    <span className="font-medium text-ink">{d.title}</span>
                    <span className="ml-2 text-xs text-ink-3">({d.status})</span>
                    {d.driveLink ? (
                      <Link href={d.driveLink} className="ml-2 text-xs text-warn hover:underline" target="_blank" rel="noreferrer">
                        Link
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        ))}
        {projects.length === 0 ? <p className="text-sm text-ink-3">No projects yet.</p> : null}
      </div>
    </div>
  );
}
