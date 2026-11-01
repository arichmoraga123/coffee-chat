import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { getWalkthrough } from "@/lib/walkthroughs-index";
import { WORKBOOK_LESSONS, workbookTitle } from "@/lib/learn/workbook-map";
import { getLesson } from "@/lib/learn/lessons";
import { PageHeader } from "@/components/ui/page-header";
import { GuidedWorkbook } from "@/components/learn/guided/guided-workbook";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return { title: `${workbookTitle(key)} · Guided` };
}

/** "Walk me through it": the student workbook in the browser, one step at a time. Optional; downloading still works. */
export default async function GuidedWorkbookPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ from?: string }> }) {
  const userId = await requireUserId();
  const { key } = await params;
  const { from } = await searchParams;
  const w = getWalkthrough(key);
  if (!w || !WORKBOOK_LESSONS[key]) notFound();
  const [student, progress] = await Promise.all([
    prisma.lessonResource.findFirst({ where: { workbookKey: key, kind: "student" }, orderBy: { version: "desc" }, select: { id: true } }),
    prisma.workbookProgress.findUnique({ where: { userId_workbookKey: { userId, workbookKey: key } } }),
  ]);
  const lessonIds = from && WORKBOOK_LESSONS[key].includes(from) ? [from, ...WORKBOOK_LESSONS[key].filter((l) => l !== from)] : WORKBOOK_LESSONS[key];
  const lessons = lessonIds.slice(0, 3).flatMap((id) => {
    const l = getLesson(id);
    return l ? [{ id, label: `${id.replace("-", ".")} ${l.title}` }] : [];
  });
  const title = workbookTitle(key);
  return (
    <div className="space-y-4">
      <PageHeader
        crumbs={[{ label: "Lessons", href: "/learn" }, ...(lessons[0] ? [{ label: lessons[0].label, href: `/learn/${lessons[0].id}` }] : []), { label: "Guided workbook" }]}
        title={title}
        subtitle={`${w.steps.length} steps across ${w.sheets.join(", ")}. Optional: downloading the workbook works just as well.`}
        actions={
          student ? (
            <a href={`/api/learn/resources/${student.id}/download`} className="text-[13px] font-medium text-accent hover:underline">
              Download the workbook instead
            </a>
          ) : null
        }
      />
      {student ? (
        <GuidedWorkbook
          workbookKey={key}
          title={title}
          steps={w.steps}
          sheetsOrder={w.sheets}
          studentUrl={`/api/learn/resources/${student.id}/download`}
          saved={{ entries: (progress?.entries as Record<string, string>) ?? {}, completedStepIds: progress?.completedStepIds ?? [], firstTryStepIds: progress?.firstTryStepIds ?? [] }}
          lessons={lessons}
        />
      ) : (
        <p className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 text-sm text-ink-2">
          This workbook hasn&apos;t been uploaded yet. A mentor uploads it on{" "}
          <Link href="/admin/learn/resources" className="text-accent hover:underline">
            Learn · Workbooks
          </Link>
          .
        </p>
      )}
    </div>
  );
}
