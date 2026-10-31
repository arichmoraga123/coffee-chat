/** Firm tag prefix used on Question.tags (e.g. "firm:Goldman Sachs"). */
export const FIRM_TAG_PREFIX = "firm:";

export function firmsFromTags(tags: string[]): string[] {
  return tags.filter((t) => t.startsWith(FIRM_TAG_PREFIX)).map((t) => t.slice(FIRM_TAG_PREFIX.length));
}
