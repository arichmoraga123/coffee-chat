"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** <details>/<summary>: title left, badge + chevron right. */
export function Accordion({
  title,
  badge,
  open,
  onToggle,
  className,
  children,
}: {
  title: React.ReactNode;
  badge?: React.ReactNode;
  open?: boolean;
  onToggle?: (open: boolean) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <details
      open={open}
      onToggle={(e) => onToggle?.((e.currentTarget as HTMLDetailsElement).open)}
      className={cn("group rounded-[var(--radius-lg)] border border-border bg-surface", className)}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 font-medium text-ink">{title}</span>
        <span className="flex shrink-0 items-center gap-2">
          {badge}
          <ChevronDown className="h-4 w-4 text-ink-3 transition-transform group-open:rotate-180" aria-hidden />
        </span>
      </summary>
      <div className="border-t border-divider px-5 py-4">{children}</div>
    </details>
  );
}
