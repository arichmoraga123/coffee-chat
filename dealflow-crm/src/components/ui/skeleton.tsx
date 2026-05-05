import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("skeleton-shimmer rounded-md bg-zinc-800/90", className)}
      aria-hidden
    />
  );
}
