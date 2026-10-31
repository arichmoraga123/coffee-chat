import { prisma } from "@/lib/prisma";
import { requireAdminUserId } from "@/lib/auth";
import { lessonsForWorkbook, workbookKeys } from "@/lib/learn/lessons";
import { blobConfigured } from "@/lib/learn/blob-storage";
import { WorkbookUploader } from "@/components/learn/admin/workbook-uploader";

export const dynamic = "force-dynamic";

export default async function LearnResourcesPage() {
  await requireAdminUserId();
  const [resources, counts] = await Promise.all([
    prisma.lessonResource.findMany({ orderBy: [{ workbookKey: "asc" }, { kind: "asc" }, { version: "desc" }] }),
    prisma.resourceDownload.groupBy({ by: ["resourceId"], _count: { _all: true } }),
  ]);
  const countBy = new Map(counts.map((c) => [c.resourceId, c._count._all]));
  const keys = workbookKeys();
  const latest = new Set<string>();
  const seen = new Set<string>();
  for (const r of resources) {
    const k = `${r.workbookKey}:${r.kind}`;
    if (!seen.has(k)) {
      seen.add(k);
      latest.add(r.id);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Learn · Workbooks</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Upload the practice workbooks and answer keys. Students get the newest version; answer keys unlock only after a
          student finishes a lesson that uses the workbook.
        </p>
      </div>
      {!blobConfigured() ? (
        <p className="rounded-lg border border-amber-700/50 bg-amber-950/30 p-3 text-sm text-amber-200">
          Storage isn&apos;t connected yet. In Vercel, add a Blob store to this project (Storage → Blob) so
          a read-write token env var (e.g. BLOB_READ_WRITE_TOKEN) is set, then redeploy.
        </p>
      ) : null}
      <WorkbookUploader keys={keys} />

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2">Workbook</th>
              <th className="px-3 py-2">Kind</th>
              <th className="px-3 py-2">Version</th>
              <th className="px-3 py-2">Lessons</th>
              <th className="px-3 py-2">Size</th>
              <th className="px-3 py-2">Downloads</th>
              <th className="px-3 py-2">Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => {
              const rows = resources.filter((r) => r.workbookKey === key);
              const lessons = lessonsForWorkbook(key).map((l) => l.id.replace("-", ".")).join(", ");
              if (!rows.length) {
                return (
                  <tr key={key} className="border-t border-white/5 text-zinc-500">
                    <td className="px-3 py-2 font-mono text-xs">{key}</td>
                    <td className="px-3 py-2" colSpan={2}>
                      Not uploaded
                    </td>
                    <td className="px-3 py-2">{lessons}</td>
                    <td colSpan={3} />
                  </tr>
                );
              }
              return rows.map((r) => (
                <tr key={r.id} className={`border-t border-white/5 ${latest.has(r.id) ? "" : "text-zinc-500"}`}>
                  <td className="px-3 py-2 font-mono text-xs">{r.workbookKey}</td>
                  <td className="px-3 py-2">{r.kind === "answer_key" ? "Answer key" : "Student"}</td>
                  <td className="px-3 py-2">
                    v{r.version}
                    {latest.has(r.id) ? <span className="ml-1 text-xs text-emerald-400">live</span> : null}
                  </td>
                  <td className="px-3 py-2">{lessons}</td>
                  <td className="px-3 py-2">{Math.round(r.sizeBytes / 1024)} KB</td>
                  <td className="px-3 py-2 font-mono">{countBy.get(r.id) ?? 0}</td>
                  <td className="px-3 py-2 text-xs text-zinc-400">{r.createdAt.toISOString().slice(0, 10)}</td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
