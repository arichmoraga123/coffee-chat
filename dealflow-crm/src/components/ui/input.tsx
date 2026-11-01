import { cn } from "@/lib/utils";

export const INPUT_CLASS =
  "h-9 w-full rounded-[var(--radius)] border border-border-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-3 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(INPUT_CLASS, props.className)} />;
}
