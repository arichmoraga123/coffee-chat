import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { clubViewer, lessonOptions, postInput, visiblePost } from "@/lib/club-view";
import { TYPE_LABEL, audienceLabel, audienceUserIds, parseAudience, publicFiles, type PostType } from "@/lib/club-publish";
import { getLesson } from "@/lib/learn/lessons";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { SimpleMarkdown } from "@/components/ui/simple-markdown";
import { ItemAdminMenu } from "@/components/club/item-admin-menu";
import { PostMemberActions, RemindButton } from "@/components/club/post-actions";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const size = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export default async function ClubPostPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const v = await clubViewer(userId);
  if (!v) notFound();
  const post = await prisma.clubPost.findUnique({ where: { id }, include: { author: { select: { name: true } }, progress: true } });
  if (!post || post.clubId !== v.clubId || !visiblePost(v, post) || (post.archivedAt && !v.canPost)) notFound();
  const files = publicFiles(post.files);
  const mine = post.progress.find((p) => p.userId === userId);
  const label = TYPE_LABEL[post.type as PostType] ?? "Post";

  let insight: React.ReactNode = null;
  if (v.canPost) {
    const audience = (await audienceUserIds(v.clubId, parseAudience(post.audience))).filter((u) => u !== post.authorId);
    const names = new Map((await prisma.user.findMany({ where: { id: { in: audience } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));
    const opened = new Set(post.progress.filter((p) => p.viewedAt).map((p) => p.userId));
    const done = new Set(post.progress.filter((p) => p.doneAt).map((p) => p.userId));
    const unopened = audience.filter((u) => !opened.has(u));
    const notDone = audience.filter((u) => !done.has(u));
    const downloads = post.progress.reduce((n, p) => n + p.downloads, 0);
    insight = (
      <Card title="Insight" action={<span className="text-ink-3">{audienceLabel(post.audience)}</span>}>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-divider sm:grid-cols-4">
          {[
            [`${audience.filter((u) => opened.has(u)).length}/${audience.length}`, "Opened"],
            [downloads, "Downloads"],
            [post.allowDone ? `${audience.filter((u) => done.has(u)).length}/${audience.length}` : "—", "Done"],
            [unopened.length, "Haven't opened"],
          ].map(([val, l]) => (
            <div key={String(l)} className="bg-surface px-3 py-2">
              <StatTile value={val as string | number} label={String(l)} />
            </div>
          ))}
        </div>
        {unopened.length ? (
          <div className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] font-medium text-ink-2">Who hasn&apos;t opened this?</p>
              <RemindButton postId={post.id} who="unopened" count={unopened.length} label={`Remind ${unopened.length}`} />
            </div>
            <p className="mt-1 text-[13px] text-ink-3">{unopened.map((u) => names.get(u) ?? "Member").join(", ")}</p>
          </div>
        ) : null}
        {post.allowDone && notDone.length ? (
          <div className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] font-medium text-ink-2">Not done yet</p>
              <RemindButton postId={post.id} who="notdone" count={notDone.length} label={`Remind ${notDone.length}`} />
            </div>
            <p className="mt-1 text-[13px] text-ink-3">{notDone.map((u) => names.get(u) ?? "Member").join(", ")}</p>
          </div>
        ) : null}
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        crumbs={[{ label: "Content", href: "/club/content" }, { label }]}
        title={post.title}
        subtitle={`${label} · ${post.author.name} · ${fmt(post.createdAt)}${post.dueDate ? ` · Due ${fmt(post.dueDate)}` : ""}${post.archivedAt ? " · Archived" : ""}`}
        actions={
          <span className="flex flex-wrap items-center gap-2">
            {v.canPost ? <ItemAdminMenu target={{ kind: "post", id: post.id, input: postInput(post) }} isAdmin={v.isAdmin} lessons={lessonOptions()} archived={Boolean(post.archivedAt)} afterDelete="/club/content" /> : null}
            <PostMemberActions postId={post.id} allowDone={post.allowDone} done={Boolean(mine?.doneAt)} />
          </span>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {post.content ? (
            <Card className="p-5">
              <SimpleMarkdown text={post.content} className="text-sm leading-relaxed text-ink" />
            </Card>
          ) : null}
          {files.length || post.links.length ? (
            <Card title="Files and links">
              <ul className="divide-y divide-divider">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate text-ink">{f.name}</span>
                    <a href={`/api/club/files/post/${post.id}/${f.id}`} className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-accent hover:underline">
                      <Download className="size-4" /> {size(f.size)}
                    </a>
                  </li>
                ))}
                {post.links.map((l) => (
                  <li key={l} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <a href={l} target="_blank" rel="noreferrer" className="min-w-0 truncate text-accent hover:underline">
                      {l.replace(/^https?:\/\//, "")}
                    </a>
                    <ExternalLink className="size-4 shrink-0 text-ink-3" aria-hidden />
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          {insight}
        </div>
        <div className="space-y-4">
          {post.lessonIds.length ? (
            <Card title="Related lessons">
              <ul className="space-y-1.5 text-sm">
                {post.lessonIds.map((lid) => {
                  const l = getLesson(lid);
                  return l ? (
                    <li key={lid}>
                      <Link href={`/learn/${lid}`} className="text-accent hover:underline">
                        {lid.replace("-", ".")} {l.title}
                      </Link>
                    </li>
                  ) : null;
                })}
              </ul>
            </Card>
          ) : null}
          {post.tags.length ? (
            <Card title="Tags">
              <div className="flex flex-wrap gap-1.5">
                {post.tags.map((t) => (
                  <span key={t} className="rounded bg-surface-2 px-2 py-0.5 text-xs text-ink-2">
                    {t}
                  </span>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
