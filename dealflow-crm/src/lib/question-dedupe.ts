import { createHash } from "node:crypto";

export function questionDedupeKey(question: string): string {
  return createHash("sha256").update(question.trim()).digest("hex");
}
