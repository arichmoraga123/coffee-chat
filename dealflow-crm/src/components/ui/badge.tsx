import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "accent" | "warn" | "danger" | "info" | "success";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-ink-2",
  accent: "bg-accent-tint text-accent",
  warn: "bg-warn-bg text-warn",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
  success: "bg-success-bg text-success",
};

export function Badge({ tone = "neutral", className, children }: { tone?: BadgeTone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold", TONES[tone], className)}>
      {children}
    </span>
  );
}

/** Outlined neutral chip, e.g. "Blackstone · Coffee chat". */
export function Chip({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded border border-border-strong px-2 py-0.5 text-xs text-ink-2", className)}>
      {children}
    </span>
  );
}

/** Small accent pill for counts that need action (daily set left, unread). */
export function CountPill({ count, className }: { count: number; className?: string }) {
  if (!count) return null;
  return (
    <span className={cn("ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-on-accent", className)}>
      {count}
    </span>
  );
}
