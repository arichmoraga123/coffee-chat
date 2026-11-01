import Link from "next/link";
import { requireUserId } from "@/lib/auth";
import { peBroadMembership } from "@/lib/club-social";
import { clubStandings, MIN_ACCURACY_ANSWERS, STANDING_TABS, type StandingTab } from "@/lib/club-standings";
import { DataTable, Td, Th } from "@/components/ui/data-table";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Standings" };

export default async function StandingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const userId = await requireUserId();
  const membership = await peBroadMembership(userId);
  if (!membership) {
    return <EmptyState title="Standings are for PE@Broad members." description="Ask an officer to add you to the roster, or request to join from the Club page." />;
  }
  const { tab: rawTab } = await searchParams;
  const tab = (STANDING_TABS.find((t) => t.key === rawTab) ?? STANDING_TABS[0]) as (typeof STANDING_TABS)[number];
  const rows = await clubStandings(membership.clubId);
  const ranked = rows
    .filter((r) => tab.metric(r) >= 0)
    .sort((a, b) => tab.metric(b) - tab.metric(a) || a.name.localeCompare(b.name))
    .map((r, i, arr) => ({ ...r, rank: i > 0 && tab.metric(arr[i - 1]) === tab.metric(r) ? -1 : i + 1 }));
  // Ties share the rank above them.
  let last = 0;
  for (const r of ranked) {
    if (r.rank === -1) r.rank = last;
    else last = r.rank;
  }
  const notQualified = rows.length - ranked.length;

  return (
    <div className="space-y-4">
      <div role="tablist" className="flex flex-wrap gap-2">
        {STANDING_TABS.map((t) => (
          <Link
            key={t.key}
            href={`?tab=${t.key}`}
            role="tab"
            aria-selected={t.key === tab.key}
            className={cn(
              "rounded-[var(--radius)] border px-3 py-1.5 text-sm",
              t.key === tab.key ? "border-accent bg-accent-tint font-semibold text-accent" : "border-border-strong bg-surface text-ink-2 hover:bg-surface-2",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <p className="text-[13px] text-ink-3">
        {tab.key === "weekly"
          ? "Points earned since Monday 12:00 AM ET."
          : tab.key === "accuracy"
            ? `Multiple-choice accuracy. You need ${MIN_ACCURACY_ANSWERS} answers to qualify.`
            : tab.key === "challenge"
              ? "Score on this week's club challenge (out of 10)."
              : "Only active PE@Broad members appear here."}
        {notQualified && tab.key !== "weekly" && tab.key !== "all" ? ` ${notQualified} member${notQualified === 1 ? "" : "s"} not shown yet.` : ""}
      </p>
      <DataTable minWidth={640}>
        <thead>
          <tr>
            <Th className="w-14">Rank</Th>
            <Th>Member</Th>
            <Th className="text-right">Points (week)</Th>
            <Th className="text-right">Points (all)</Th>
            <Th className="text-right">Streak</Th>
            <Th className="text-right">Accuracy</Th>
            <Th className="text-right">Lessons</Th>
          </tr>
        </thead>
        <tbody>
          {ranked.length === 0 ? (
            <tr>
              <Td colSpan={7} className="py-8 text-center text-ink-3">
                Nobody qualifies yet.
              </Td>
            </tr>
          ) : (
            ranked.map((r) => {
              const me = r.userId === userId;
              const cell = (key: StandingTab) => cn("text-right", tab.key === key ? "font-semibold text-ink" : "text-ink-2");
              return (
                <tr key={r.userId} className={cn(me && "bg-accent-tint")}>
                  <Td className="text-ink-3">{r.rank}</Td>
                  <Td>
                    <Link href={`/club/pe-broad/members/${r.userId}`} className="flex items-center gap-2.5 hover:underline">
                      <Avatar name={r.name} size={28} />
                      <span className={cn(me && "font-semibold")}>{me ? `${r.name} (you)` : r.name}</span>
                    </Link>
                  </Td>
                  <Td className={cell("weekly")}>{r.weeklyXP}</Td>
                  <Td className={cell("all")}>{r.xp}</Td>
                  <Td className={cell("streak")}>{r.streak}</Td>
                  <Td className={cell("accuracy")}>
                    {r.answers >= MIN_ACCURACY_ANSWERS && r.accuracy !== null ? `${r.accuracy}%` : <span className="text-ink-3">{r.answers}/{MIN_ACCURACY_ANSWERS}</span>}
                  </Td>
                  <Td className={cell("lessons")}>{r.lessons}/56</Td>
                </tr>
              );
            })
          )}
        </tbody>
      </DataTable>
    </div>
  );
}
