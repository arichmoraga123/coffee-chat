import Link from "next/link";
import { Chip } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { MemberProfile } from "@/lib/club-profiles";

export function Hidden() {
  return <span className="text-[13px] italic text-ink-3">Hidden by member</span>;
}

export function FirmChips({ firms, max }: { firms: MemberProfile["firmsInContact"]; max?: number }) {
  if (firms === null) return <Hidden />;
  if (!firms.length) return <span className="text-[13px] text-ink-3">None yet</span>;
  const shown = max ? firms.slice(0, max) : firms;
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((f) => (
        <Chip key={f.firm}>
          {f.firm} · {f.stage}
        </Chip>
      ))}
      {max && firms.length > max ? <span className="self-center text-xs text-ink-3">+{firms.length - max}</span> : null}
    </span>
  );
}

export function TargetsLine({ targets }: { targets: MemberProfile["targets"] }) {
  if (targets === null) return <Hidden />;
  const items = [...targets.groups, ...targets.firms];
  if (!items.length) return <span className="text-[13px] text-ink-3">Not set</span>;
  return <span className="text-[13px] text-ink-2">{items.join(", ")}</span>;
}

export function LearningBars({ learning }: { learning: MemberProfile["learning"] }) {
  if (learning === null) return <Hidden />;
  return (
    <ul className="space-y-2">
      {learning.map((m) => (
        <li key={m.module} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center gap-3 text-[13px]">
          <span className="truncate text-ink-2">
            {m.module}. {m.title}
          </span>
          <ProgressBar value={m.done} max={m.total} size="sm" label={`${m.done}/${m.total}`} />
        </li>
      ))}
    </ul>
  );
}

export function MemberActions({ userId, self }: { userId: string; self: boolean }) {
  if (self) return <Link href="/settings/club-sharing" className="text-[13px] font-medium text-accent hover:underline">Edit what you share</Link>;
  return (
    <span className="flex gap-2">
      <Link href={`/messages/new?to=${userId}`} className="inline-flex h-8 items-center rounded-[var(--radius)] border border-border-strong bg-surface px-3 text-[13px] font-medium text-ink hover:bg-surface-2">
        Message
      </Link>
      <Link href={`/challenges/new?to=${userId}`} className="inline-flex h-8 items-center rounded-[var(--radius)] border border-border-strong bg-surface px-3 text-[13px] font-medium text-ink hover:bg-surface-2">
        Challenge
      </Link>
    </span>
  );
}
