import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-zinc-900/40 px-6 py-12 text-center",
        className,
      )}
    >
      <Icon className="size-10 stroke-[1.25] text-zinc-600" aria-hidden />
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {description ? <p className="max-w-sm text-xs leading-relaxed text-zinc-500">{description}</p> : null}
    </div>
  );
}
