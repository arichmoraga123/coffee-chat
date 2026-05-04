import { cn } from "@/lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm outline-none ring-cyan-400 focus:ring-1",
        props.className,
      )}
    />
  );
}
