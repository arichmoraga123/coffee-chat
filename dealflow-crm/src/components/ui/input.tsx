import { cn } from "@/lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-9 w-full rounded-md border border-white/10 bg-zinc-950/90 px-3 text-sm text-zinc-100 outline-none ring-cyan-400/80 focus:ring-1",
        props.className,
      )}
    />
  );
}
