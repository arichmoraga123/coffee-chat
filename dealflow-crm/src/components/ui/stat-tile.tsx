import { cn } from "@/lib/utils";

/** Big number + caption. Tone only for status. */
export function StatTile({
  value,
  label,
  tone,
  className,
}: {
  value: React.ReactNode;
  label: React.ReactNode;
  tone?: "success" | "danger" | "warn";
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p
        className={cn(
          "text-[22px] font-semibold leading-tight text-ink",
          tone === "success" && "text-success",
          tone === "danger" && "text-danger",
          tone === "warn" && "text-warn",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[13px] text-ink-3">{label}</p>
    </div>
  );
}
