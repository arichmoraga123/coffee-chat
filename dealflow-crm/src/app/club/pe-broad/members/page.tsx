import Link from "next/link";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { peBroadMembership } from "@/lib/club-social";
import { memberProfiles, normFirm } from "@/lib/club-profiles";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DataTable, Td, Th } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { FirmChips, Hidden, MemberActions, TargetsLine } from "@/components/club/member-bits";
import { MemberSearch } from "@/components/club/member-search";
import { FirmSharePrompt } from "@/components/club/sharing-controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Members" };

const ROLE: Record<string, string> = { admin: "Admin", president: "President", vp: "VP", sector_head: "Sector head" };

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const userId = await requireUserId();
  const m = await peBroadMembership(userId);
  if (!m) return <EmptyState title="The directory is for PE@Broad members." description="Request to join from the Club page." />;
  const { q = "" } = await searchParams;
  const [profiles, me] = await Promise.all([
    memberProfiles(m.clubId),
    prisma.user.findUnique({ where: { id: userId }, select: { shareFirms: true } }),
  ]);
  const term = q.trim().toLowerCase();
  const shown = term
    ? profiles.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.tracks.some((t) => t.toLowerCase().includes(term)) ||
          (p.firmsInContact ?? []).some((f) => f.firm.toLowerCase().includes(term)) ||
          (p.targets?.firms ?? []).some((f) => f.toLowerCase().includes(term)),
      )
    : profiles;

  // Firm overlap: firms that two or more sharing members are talking to.
  const overlap = new Map<string, { firm: string; names: string[] }>();
  for (const p of profiles) {
    for (const f of p.firmsInContact ?? []) {
      const k = normFirm(f.firm);
      const cur = overlap.get(k) ?? { firm: f.firm, names: [] };
      cur.names.push(p.name);
      overlap.set(k, cur);
    }
  }
  const topOverlap = [...overlap.values()].filter((o) => o.names.length >= 2).sort((a, b) => b.names.length - a.names.length).slice(0, 6);

  return (
    <div className="space-y-4">
      {me?.shareFirms === null ? <FirmSharePrompt /> : null}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-3">
          <MemberSearch initial={q} count={shown.length} total={profiles.length} />
          <DataTable minWidth={900}>
            <thead>
              <tr>
                <Th>Member</Th>
                <Th>Targeting</Th>
                <Th className="w-40">Lessons</Th>
                <Th className="text-right">Accuracy</Th>
                <Th>Firms in contact</Th>
                <Th className="w-48" />
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.userId}>
                  <Td>
                    <Link href={`/club/pe-broad/members/${p.userId}`} className="flex items-center gap-3 hover:underline">
                      <Avatar name={p.name} size={32} />
                      <span className="min-w-0">
                        <span className="block font-medium text-ink">{p.name}</span>
                        <span className="block text-[13px] text-ink-3">
                          {[p.tracks.join(" / "), p.classYear ? `Class of ${p.classYear}` : null].filter(Boolean).join(" · ") || "PE@Broad"}
                        </span>
                      </span>
                      {ROLE[p.role] ? <Badge tone="accent">{ROLE[p.role]}</Badge> : null}
                    </Link>
                  </Td>
                  <Td className="max-w-56">
                    <TargetsLine targets={p.targets} />
                  </Td>
                  <Td>{p.lessonsDone === null ? <Hidden /> : <ProgressBar value={p.lessonsDone} max={56} size="sm" label={`${p.lessonsDone}/56`} />}</Td>
                  <Td className="text-right">
                    {p.drill === null ? <Hidden /> : p.drill.accuracy === null ? <span className="text-ink-3">—</span> : `${p.drill.accuracy}%`}
                  </Td>
                  <Td>
                    <FirmChips firms={p.firmsInContact} max={3} />
                  </Td>
                  <Td className="text-right">
                    <MemberActions userId={p.userId} self={p.userId === userId} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
        <aside className="space-y-4">
          <Card title="Firm overlap">
            {topOverlap.length ? (
              <ul className="space-y-3 text-sm">
                {topOverlap.map((o) => (
                  <li key={o.firm}>
                    <p className="font-medium text-ink">
                      {o.names.length} members · {o.firm}
                    </p>
                    <p className="text-[13px] text-ink-3">{o.names.join(", ")}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">No two members are talking to the same firm yet.</p>
            )}
            <p className="mt-4 text-[13px] text-ink-3">Only firm names and stages are shared, never contacts or notes.</p>
          </Card>
          <Card title="Weekly challenge" action={<Link href="/challenges" className="text-accent hover:underline">Open</Link>}>
            <p className="text-sm text-ink-2">10 questions, the same for everyone, refreshed every Monday.</p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
