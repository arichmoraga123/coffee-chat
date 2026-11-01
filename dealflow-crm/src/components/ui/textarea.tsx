import { cn } from "@/lib/utils";

export function Textarea(props: React.ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-24 w-full rounded-[var(--radius)] border border-border-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25",
        props.className,
      )}
    />
  );
}
