import { InteractionType } from "@prisma/client";

const LABELS: Partial<Record<InteractionType, string>> = {
  COFFEE_CHAT: "Coffee chat",
  CALL: "Call",
  EMAIL: "Email",
  LINKEDIN: "LinkedIn",
  IN_PERSON: "In person",
};

export function interactionTypeLabel(type: string): string {
  if (type in LABELS) return LABELS[type as InteractionType] ?? type;
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
