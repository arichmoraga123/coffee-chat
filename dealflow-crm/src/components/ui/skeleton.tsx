import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton-shimmer rounded-[var(--radius-sm)] bg-surface-2", className)} aria-hidden />;
}
