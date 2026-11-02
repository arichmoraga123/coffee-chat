import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeFirmName } from "@/lib/contact-match";
import { getGroupFinderData } from "@/lib/fit-content";
import { groupSearchTerm, type GroupProfile } from "@/lib/groupFinder";
import { PrintButton } from "@/components/fit/print-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Interview prep" };

type Draft = { questionId: string; variant: string; draft: string; updatedAt: Date };

/** F2.4: one printable page with the student's fit drafts for this firm, the people they've spoken with, and questions to ask. */
export default async function PrepPage({ params, searchParams }: { params: Promise<{ firmId: string }>; searchParams: Promise<{ opp?: string }> }) {
  const userId = await requireUserId();
  const { firmId } = await params;
  const { opp: oppId } = await searchParams;
  const firm = await prisma.firm.findFirst({ where: { id: firmId, userId }, select: { id: true, name: true, location: true } });
  if (!firm) notFound();
  const [opp, drafts, contacts, finder, latestGf] = await Promise.all([
    oppId ? prisma.opportunity.findFirst({ where: { id: oppId, userId }, select: { role: true, group: true, location: true, applicationDeadline: true } }) : null,
    prisma.fitAnswer.findMany({ where: { userId, questionId: { in: ["why-ib", "why-firm", "why-city", "why-group"] }, draft: { not: "" } }, select: { questionId: true, variant: true, draft: true, updatedAt: true }, orderBy: { updatedAt: "desc" } }),
    prisma.contact.findMany({
      where: { userId, firmId, deletedAt: null },
      select: { id: true, fullName: true, title: true, group: true, interactions: { where: { deletedAt: null }, orderBy: { date: "desc" }, take: 3, select: { id: true, date: true, notes: true, adviceGiven: true, nextStep: true } } },
    }),
    getGroupFinderData(),
    prisma.groupFinderResult.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, select: { topGroupId: true } }),
  ]);

  const norm = normalizeFirmName(firm.name);
  const pick = (qid: string, prefer: (d: Draft) => boolean) => drafts.find((d) => d.questionId === qid && prefer(d)) ?? drafts.find((d) => d.questionId === qid) ?? null;
  const city = (opp?.location || (firm.location !== "Unknown" ? firm.location : "") || "").split(",")[0].trim().toLowerCase();
  // The group: the opportunity's group if it matches a profile, else the latest Group Finder top pick.
  const groupFor = (text: string | null | undefined): GroupProfile | undefined => {
    const t = (text ?? "").toLowerCase();
    return t ? finder.groups.find((g) => t.includes(groupSearchTerm(g).toLowerCase()) || g.name.toLowerCase().includes(t)) : undefined;
  };
  const group = groupFor(opp?.group) ?? finder.groups.find((g) => g.id === latestGf?.topGroupId);
  const sections = [
    { title: "Why investment banking?", d: pick("why-ib", () => true) },
    { title: `Why ${firm.name}?`, d: pick("why-firm", (d) => normalizeFirmName(d.variant) === norm), strict: true },
    { title: `Why ${city ? city.replace(/\b\w/g, (c) => c.toUpperCase()) : "this city"}?`, d: pick("why-city", (d) => Boolean(city) && d.variant.toLowerCase().startsWith(city)) },
    { title: `Why ${group?.name ?? "this group"}?`, d: pick("why-group", (d) => Boolean(group) && d.variant === group?.name) },
  ];
  const whyFirm = sections[1].d && normalizeFirmName(sections[1].d.variant) === norm ? sections[1].d : null;
  sections[1].d = whyFirm;

  // Questions to ask: from the group profile, plus one built on the latest note.
  const latest = contacts.flatMap((c) => c.interactions.map((i) => ({ ...i, contact: c.fullName }))).sort((a, b) => b.date.getTime() - a.date.getTime())[0];
  const fromNotes = latest && (latest.adviceGiven || latest.notes) ? `${latest.contact} mentioned “${(latest.adviceGiven || latest.notes || "").split("\n")[0].slice(0, 120)}” — how has that played out since we spoke?` : null;
  const questions = [...(fromNotes ? [fromNotes] : []), ...(group?.questionsToAskBankers ?? ["What does a typical deal look like for your team?", "What makes analysts stand out in their first year?", "How has the group's deal mix changed recently?"])].slice(0, 3);

  return (
    <div className="mx-auto max-w-3xl space-y-6 print:max-w-none print:space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[13px] text-ink-3 print:hidden">
            <Link href={`/firms/${firm.id}`} className="hover:underline">
              {firm.name}
            </Link>{" "}
            › Interview prep
          </p>
          <h1 className="page-title">Interview prep · {firm.name}</h1>
          <p className="mt-1 text-sm text-ink-2">{[opp?.role, opp?.group, opp?.location, opp?.applicationDeadline ? `Deadline ${opp.applicationDeadline.toISOString().slice(0, 10)}` : null].filter(Boolean).join(" · ")}</p>
        </div>
        <PrintButton />
      </div>

      {sections.map((s) => (
        <section key={s.title} className="break-inside-avoid rounded-[var(--radius-lg)] border border-border bg-surface p-5 print:border-0 print:p-0">
          <h2 className="section-title">{s.title}</h2>
          {s.d ? (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{s.d.draft}</p>
          ) : (
            <p className="mt-2 text-sm text-ink-3 print:text-ink-2">
              No draft yet.{" "}
              <Link href="/stories/fit" className="text-accent hover:underline print:hidden">
                Write it in Fit questions
              </Link>
            </p>
          )}
        </section>
      ))}

      <section className="break-inside-avoid rounded-[var(--radius-lg)] border border-border bg-surface p-5 print:border-0 print:p-0">
        <h2 className="section-title">People you&apos;ve spoken with</h2>
        {contacts.length ? (
          <ul className="mt-2 space-y-3 text-sm">
            {contacts.map((c) => (
              <li key={c.id}>
                <p className="font-medium text-ink">
                  {c.fullName}
                  <span className="font-normal text-ink-3">{[c.title, c.group].filter(Boolean).length ? ` · ${[c.title, c.group].filter(Boolean).join(", ")}` : ""}</span>
                </p>
                {c.interactions.map((i) => (
                  <p key={i.id} className="mt-0.5 text-ink-2">
                    <span className="text-ink-3">{i.date.toISOString().slice(0, 10)}:</span> {[i.notes, i.adviceGiven, i.nextStep ? `Next: ${i.nextStep}` : null].filter(Boolean).join(" · ") || "No notes"}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-3">No contacts at {firm.name} yet.</p>
        )}
      </section>

      <section className="break-inside-avoid rounded-[var(--radius-lg)] border border-border bg-surface p-5 print:border-0 print:p-0">
        <h2 className="section-title">Questions to ask</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink">
          {questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
