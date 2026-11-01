import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** One sentence plus (optionally) one action. No illustrations. */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Ignored — kept for older call sites. */
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-border-strong bg-surface px-6 py-10 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium text-ink">{title}</p>
      {description ? <p className="max-w-sm text-[13px] leading-relaxed text-ink-3">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
