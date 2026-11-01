import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { clubViewer, lessonOptions } from "@/lib/club-view";
import { PROJECT_STATUS, teamNames } from "@/lib/club-projects";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { PostToClubButton } from "@/components/club/publish-dialog";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Club projects" };

export default async function ClubProjectsPage() {
  const userId = await requireUserId();
  const v = await clubViewer(userId);
  if (!v) return <p className="text-sm text-ink-2">No club context.</p>;
  const projects = await prisma.clubProject.findMany({
    where: { clubId: v.clubId, ...(v.canPost ? {} : { archivedAt: null }) },
    orderBy: [{ archivedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
  });
  const names = await teamNames(projects);
  if (!projects.length) {
    return (
      <EmptyState
        title="No projects yet"
        description={v.canPost ? "Start a stock pitch, case competition team or research project and add the team." : "Projects your officers start show up here."}
        action={v.canPost ? <PostToClubButton isAdmin={v.isAdmin} lessons={lessonOptions()} label="Add project" type="project" variant="secondary" /> : undefined}
      />
    );
  }
  return (
    <div className="space-y-3">
      <h2 className="section-title">Projects</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {projects.map((p) => {
          const team = [...new Set([...(p.leadId ? [p.leadId] : []), ...p.memberIds])];
          return (
            <Link key={p.id} href={`/club/projects/${p.id}`} className={cn("block rounded-[var(--radius-lg)] border border-border bg-surface p-4 transition-colors hover:border-border-strong", p.archivedAt && "opacity-60")}>
              <div className="flex items-center justify-between gap-2">
                <span className={cn("rounded px-2 py-0.5 text-xs font-semibold", p.status === "done" ? "bg-success-bg text-success" : p.status === "planning" ? "bg-surface-2 text-ink-2" : "bg-accent-tint text-accent")}>
                  {PROJECT_STATUS[p.status] ?? p.status}
                </span>
                {p.dueDate ? <span className="text-[13px] text-ink-3">Due {p.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</span> : null}
              </div>
              <p className="mt-2 font-medium text-ink">{p.title}</p>
              {p.description ? <p className="mt-1 line-clamp-2 text-[13px] text-ink-2">{p.description}</p> : null}
              {team.length ? (
                <div className="mt-3 flex items-center gap-1">
                  {team.slice(0, 6).map((u) => (
                    <span key={u} title={names.get(u)}>
                      <Avatar name={names.get(u) ?? "?"} size={24} />
                    </span>
                  ))}
                  {team.length > 6 ? <span className="text-xs text-ink-3">+{team.length - 6}</span> : null}
                </div>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
