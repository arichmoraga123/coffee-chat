import { cn } from "@/lib/utils";

/** Thin bar, always paired with a text label. */
export function ProgressBar({
  value,
  max = 100,
  label,
  className,
  size = "md",
}: {
  value: number;
  max?: number;
  /** e.g. "4 of 7 lessons" — shown to the right of the bar. Pass null to hide (then give it context nearby). */
  label?: React.ReactNode;
  className?: string;
  size?: "sm" | "md";
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn("min-w-0 flex-1 overflow-hidden rounded-full bg-divider", size === "sm" ? "h-1" : "h-1.5")}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      {label ? <span className="shrink-0 text-[13px] text-ink-3">{label}</span> : null}
    </div>
  );
}
