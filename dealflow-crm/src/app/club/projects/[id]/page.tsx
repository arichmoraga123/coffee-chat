import { notFound } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { clubViewer, lessonOptions, projectInput, publicFiles } from "@/lib/club-view";
import { PROJECT_STATUS, teamNames } from "@/lib/club-projects";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SimpleMarkdown } from "@/components/ui/simple-markdown";
import { ItemAdminMenu } from "@/components/club/item-admin-menu";

export const dynamic = "force-dynamic";

export default async function ClubProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const v = await clubViewer(userId);
  if (!v) notFound();
  const p = await prisma.clubProject.findUnique({ where: { id }, include: { deliverables: { orderBy: { dueDate: "asc" } } } });
  if (!p || p.clubId !== v.clubId || (p.archivedAt && !v.canPost)) notFound();
  const names = await teamNames([p]);
  const team = [...new Set([...(p.leadId ? [p.leadId] : []), ...p.memberIds])];
  const files = publicFiles(p.files);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return (
    <div className="space-y-5">
      <PageHeader
        crumbs={[{ label: "Projects", href: "/club/projects" }, { label: p.title }]}
        title={p.title}
        subtitle={`${PROJECT_STATUS[p.status] ?? p.status}${p.dueDate ? ` · Due ${fmt(p.dueDate)}` : ""}${p.archivedAt ? " · Archived" : ""}`}
        actions={
          v.canPost ? (
            <ItemAdminMenu
              target={{ kind: "project", id: p.id, input: projectInput(p), memberLabels: team.map((u) => ({ value: u, label: names.get(u) ?? "Member" })) }}
              isAdmin={v.isAdmin}
              lessons={lessonOptions()}
              archived={Boolean(p.archivedAt)}
              afterDelete="/club/projects"
            />
          ) : null
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {p.description ? (
            <Card className="p-5">
              <SimpleMarkdown text={p.description} className="text-sm leading-relaxed text-ink" />
            </Card>
          ) : null}
          {files.length || p.links.length || p.driveLink ? (
            <Card title="Files and links">
              <ul className="divide-y divide-divider text-sm">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 truncate text-ink">{f.name}</span>
                    <a href={`/api/club/files/project/${p.id}/${f.id}`} className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-accent hover:underline">
                      <Download className="size-4" /> Download
                    </a>
                  </li>
                ))}
                {[...p.links, ...(p.driveLink ? [p.driveLink] : [])].map((l) => (
                  <li key={l} className="flex items-center justify-between gap-3 py-2">
                    <a href={l} target="_blank" rel="noreferrer" className="min-w-0 truncate text-accent hover:underline">
                      {l.replace(/^https?:\/\//, "")}
                    </a>
                    <ExternalLink className="size-4 shrink-0 text-ink-3" aria-hidden />
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          {p.deliverables.length ? (
            <Card title="Updates and deliverables">
              <ul className="divide-y divide-divider text-sm">
                {p.deliverables.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-ink">{d.title}</span>
                    <span className="text-[13px] text-ink-3">
                      {d.status}
                      {d.dueDate ? ` · ${fmt(d.dueDate)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
        <Card title="Team">
          {team.length ? (
            <ul className="space-y-2">
              {team.map((u) => (
                <li key={u} className="flex items-center gap-2 text-sm">
                  <Avatar name={names.get(u) ?? "?"} size={28} />
                  <span className="text-ink">{names.get(u) ?? "Member"}</span>
                  {u === p.leadId ? <span className="rounded bg-accent-tint px-1.5 py-0.5 text-xs font-semibold text-accent">Lead</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-3">No team yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
