import { createHash } from "node:crypto";

/** Matches seed pattern for `Deal.dedupeKey`. */
export function dealDedupeKey(title: string, announcedAt: Date | string): string {
  const d = typeof announcedAt === "string" ? new Date(announcedAt) : announcedAt;
  const day = Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
  return createHash("sha256").update(`deal|${title.trim()}|${day}`).digest("hex");
}
