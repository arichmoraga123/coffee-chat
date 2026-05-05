import { cn } from "@/lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-9 w-full rounded-md border border-[#2a2a2a] bg-[#111111] px-3 text-sm text-[#f0f0f0] outline-none focus:border-[#3a3a3a] focus:ring-1 focus:ring-[#4a6fa5]/40",
        props.className,
      )}
    />
  );
}
