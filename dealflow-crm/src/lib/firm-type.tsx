import { FirmType } from "@prisma/client";
import { cn } from "@/lib/utils";

export const FIRM_TYPE_ORDER: FirmType[] = [
  "IB",
  "PE",
  "GE",
  "VC",
  "HF",
  "CONSULTING",
  "CORPORATE",
  "OTHER",
];

export const FIRM_TYPE_LABELS: Record<FirmType, string> = {
  IB: "Investment Banking",
  PE: "Private Equity",
  GE: "Growth Equity",
  VC: "Venture Capital",
  HF: "Hedge Fund",
  CONSULTING: "Consulting",
  CORPORATE: "Corporate",
  OTHER: "Other",
};

export function firmTypeLabel(type: FirmType | string | null | undefined): string {
  if (type == null) return "Unset";
  if (type in FIRM_TYPE_LABELS) return FIRM_TYPE_LABELS[type as FirmType];
  return String(type);
}

export function parseFirmType(v: unknown): FirmType | null {
  if (v == null || v === "") return null;
  const s = String(v).trim() as FirmType;
  return FIRM_TYPE_ORDER.includes(s) ? s : null;
}

export function FirmTypeBadge({
  type,
  className,
}: {
  type: FirmType | string | null | undefined;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded border border-zinc-600 bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-300",
        className,
      )}
    >
      {firmTypeLabel(type)}
    </span>
  );
}
