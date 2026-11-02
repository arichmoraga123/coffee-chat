/**
 * Recruiting openings (Part B): lists, header aliases, cell parsing and status rules.
 * Client-safe and script-safe (no server-only imports).
 */
import { normalizeFirmName, trigramSimilarity } from "@/lib/contact-match";

export const ROLE_TYPES = [
  "Summer Analyst",
  "Sophomore / early insight program",
  "Diversity program",
  "Off-cycle internship",
  "Full-time Analyst",
  "Externship / spring week",
  "Other",
] as const;
export const OPENING_TRACKS = [
  "IB",
  "PE",
  "VC",
  "Growth Equity",
  "Private Credit",
  "Hedge Fund / Markets",
  "Equity Research",
  "Consulting",
  "Corporate Finance",
  "Other",
] as const;
export const CLASS_YEARS = ["Freshman", "Sophomore", "Junior", "Senior"] as const;
export const DEADLINE_TYPES = ["Fixed", "Rolling", "Unknown"] as const;
export const OPENING_STATUSES = ["Not yet open", "Open", "Closed"] as const;
export type OpeningStatus = (typeof OPENING_STATUSES)[number] | "Unknown";

export const OPENINGS_TEMPLATE_URL = "/templates/Prospect_Recruiting_Openings_Template.xlsx";

/** Same text as the template's Start here tab. */
export const OPENINGS_CLAUDE_PROMPT =
  "Reformat the attached recruiting tracker export into the attached Prospect Recruiting Openings template. Keep the template's sheet names and headers exactly and delete the sample rows. One row per program; put multiple cities in one cell separated by semicolons. Dates as YYYY-MM-DD; never guess a date — leave it blank and set Deadline Type to Rolling or Unknown. Use only the values in the Lists tab for Role Type, Track, Deadline Type, and Status. Give me back the completed .xlsx and list any rows you weren't sure about.";

// ---------- headers ----------

export type OpeningField =
  | "firm"
  | "program"
  | "roleType"
  | "track"
  | "group"
  | "classYears"
  | "recruitingSummer"
  | "city"
  | "opensOn"
  | "deadline"
  | "deadlineType"
  | "status"
  | "link"
  | "source"
  | "notes";

export const FIELD_LABELS: Record<OpeningField, string> = {
  firm: "Firm",
  program: "Program / Position",
  roleType: "Role Type",
  track: "Track",
  group: "Group",
  classYears: "Class Years Eligible",
  recruitingSummer: "Recruiting Summer",
  city: "City",
  opensOn: "Opens On",
  deadline: "Deadline",
  deadlineType: "Deadline Type",
  status: "Status",
  link: "Application Link",
  source: "Source",
  notes: "Notes",
};

const ALIASES: Record<OpeningField, string[]> = {
  firm: ["firm", "company", "firm name", "company name", "employer", "bank"],
  program: ["program / position", "program/position", "program", "programme", "position", "role", "title", "job title", "position title"],
  roleType: ["role type", "type", "program type", "opportunity type"],
  track: ["track", "category", "sector", "division", "industry"],
  group: ["group", "team", "desk"],
  classYears: ["class years eligible", "class years", "class year", "year", "class", "eligible", "eligibility"],
  recruitingSummer: ["recruiting summer", "summer", "internship year", "cycle"],
  city: ["city", "location", "office", "cities", "locations"],
  opensOn: ["opens on", "opening date", "open date", "opens", "date opened", "application open"],
  deadline: ["deadline", "closing date", "close date", "apply by", "closes", "application deadline", "due date"],
  deadlineType: ["deadline type"],
  status: ["status", "application status"],
  link: ["application link", "link", "url", "apply link", "apply url", "application url", "website"],
  source: ["source"],
  notes: ["notes", "note", "comments", "comment", "details"],
};

const normHead = (h: string) => h.toLowerCase().replace(/\*/g, "").replace(/\s+/g, " ").trim();
const HEADER_LOOKUP = new Map<string, OpeningField>();
for (const [field, names] of Object.entries(ALIASES) as [OpeningField, string[]][]) for (const n of names) HEADER_LOOKUP.set(normHead(n), field);

export const fieldForHeader = (h: string): OpeningField | null => HEADER_LOOKUP.get(normHead(h)) ?? null;

/** Finds the header row (first 10 rows) and maps columns to fields. Firm, Program and City are required. */
export function mapHeaders(rows: string[][]): { headerRow: number; columns: (OpeningField | null)[]; missing: OpeningField[] } | null {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const columns = rows[i].map((h) => fieldForHeader(String(h ?? "")));
    const found = new Set(columns.filter(Boolean));
    if (found.has("firm") && (found.has("program") || found.has("city"))) {
      // The first column wins when two map to the same field.
      const seen = new Set<OpeningField>();
      const deduped = columns.map((f) => (f && !seen.has(f) ? (seen.add(f), f) : null));
      const missing = (["firm", "program", "city"] as OpeningField[]).filter((f) => !found.has(f));
      return { headerRow: i, columns: deduped, missing };
    }
  }
  return null;
}

// ---------- cells ----------

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const utc = (y: number, m: number, d: number) => {
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1 ? dt : null;
};

export type DateCell = { date: Date | null; kind: "date" | "blank" | "rolling" | "unknown" | "invalid" };

/** Real Excel dates (serials), YYYY-MM-DD, MM/DD/YYYY, "Nov 15, 2026". Rolling/ASAP/Open now and TBC/TBD/N/A are words, never dates. */
export function parseDateCell(raw: string | null | undefined): DateCell {
  const s = String(raw ?? "").trim();
  if (!s) return { date: null, kind: "blank" };
  if (/^(rolling|asap|open now|now open|ongoing)$/i.test(s)) return { date: null, kind: "rolling" };
  if (/^(tbc|tbd|tba|n\/?a|unknown|\?|-|—)$/i.test(s)) return { date: null, kind: "unknown" };
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{5})(\.\d+)?$/))) {
    const n = Number(m[1]);
    if (n < 36526 || n > 73050) return { date: null, kind: "invalid" };
    return { date: new Date(Date.UTC(1899, 11, 30) + n * 86_400_000), kind: "date" };
  }
  const ok = (d: Date | null): DateCell => (d ? { date: d, kind: "date" } : { date: null, kind: "invalid" });
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/))) return ok(utc(+m[1], +m[2], +m[3]));
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return ok(utc(+m[3], +m[1], +m[2]));
  if ((m = s.match(/^([A-Za-z]{3,})\.? (\d{1,2})(?:st|nd|rd|th)?,? (\d{4})$/))) {
    const mo = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
    return mo < 0 ? { date: null, kind: "invalid" } : ok(utc(+m[3], mo + 1, +m[2]));
  }
  if ((m = s.match(/^(\d{1,2}) ([A-Za-z]{3,})\.?,? (\d{4})$/))) {
    const mo = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
    return mo < 0 ? { date: null, kind: "invalid" } : ok(utc(+m[3], mo + 1, +m[1]));
  }
  return { date: null, kind: "invalid" };
}

/** "New York; Chicago" or "New York / Chicago" → two cities. */
export function splitCities(raw: string): string[] {
  return [...new Set(raw.split(/\s*[;/|]\s*|\s+&\s+|\n/).map((c) => c.trim()).filter(Boolean))];
}

const CLASS_ALIASES: [RegExp, (typeof CLASS_YEARS)[number]][] = [
  [/^(fr|fresh|freshman|freshmen|first[- ]?year|1st[- ]?year|year 1)$/i, "Freshman"],
  [/^(so|soph|sophomore|sophomores|second[- ]?year|2nd[- ]?year|year 2)$/i, "Sophomore"],
  [/^(jr|junior|juniors|third[- ]?year|3rd[- ]?year|year 3|penultimate)$/i, "Junior"],
  [/^(sr|senior|seniors|fourth[- ]?year|4th[- ]?year|year 4|final[- ]?year|graduating)$/i, "Senior"],
];

/** "Sophomore; Junior" → ["Sophomore", "Junior"]. "All" → every year. Unknown parts are returned separately. */
export function parseClassYears(raw: string): { years: string[]; unknown: string[] } {
  const s = raw.trim();
  if (!s) return { years: [], unknown: [] };
  if (/^(all|any|all years|all classes)$/i.test(s)) return { years: [...CLASS_YEARS], unknown: [] };
  const years = new Set<string>();
  const unknown: string[] = [];
  for (const part of s.split(/\s*[;,/|&]\s*|\s+and\s+/i).map((p) => p.trim()).filter(Boolean)) {
    const hit = CLASS_ALIASES.find(([re]) => re.test(part.replace(/\.$/, "")));
    if (hit) years.add(hit[1]);
    else unknown.push(part);
  }
  return { years: CLASS_YEARS.filter((y) => years.has(y)), unknown };
}

const LIST_ALIASES: Record<"roleType" | "track" | "deadlineType" | "status", [RegExp, string][]> = {
  roleType: [
    [/summer analyst|summer intern|^sa$|internship$/, "Summer Analyst"],
    [/insight|early|sophomore|explore|discovery/, "Sophomore / early insight program"],
    [/divers|women|inclusion|seo|mlt/, "Diversity program"],
    [/off[- ]?cycle|spring intern|fall intern|winter intern|co[- ]?op/, "Off-cycle internship"],
    [/full[- ]?time|^ft$|analyst program|graduate/, "Full-time Analyst"],
    [/extern|spring week|shadow/, "Externship / spring week"],
  ],
  track: [
    [/invest.*bank|^ib$|banking|m&a|advisory|capital markets/, "IB"],
    [/private equity|^pe$|buyout/, "PE"],
    [/venture|^vc$/, "VC"],
    [/growth/, "Growth Equity"],
    [/credit|debt|lending/, "Private Credit"],
    [/hedge|^hf$|markets|trading|s&t|sales and trading/, "Hedge Fund / Markets"],
    [/research|^er$/, "Equity Research"],
    [/consult/, "Consulting"],
    [/corp.*fin|^cf$|fp&a/, "Corporate Finance"],
  ],
  deadlineType: [
    [/fixed|hard|firm/, "Fixed"],
    [/rolling|asap/, "Rolling"],
    [/unknown|tbc|tbd|n\/?a/, "Unknown"],
  ],
  status: [
    [/not yet|upcoming|soon|closed until/, "Not yet open"],
    [/^open|accepting|live/, "Open"],
    [/closed|filled|expired/, "Closed"],
  ],
};
const LISTS = { roleType: ROLE_TYPES, track: OPENING_TRACKS, deadlineType: DEADLINE_TYPES, status: OPENING_STATUSES } as const;

/** Exact list value → ok; close → suggestion; nothing close → null. */
export function matchList(list: keyof typeof LISTS, raw: string): { value: string | null; exact: boolean } {
  const s = raw.trim();
  if (!s) return { value: null, exact: true };
  const exact = (LISTS[list] as readonly string[]).find((v) => v.toLowerCase() === s.toLowerCase());
  if (exact) return { value: exact, exact: true };
  const loose = s.toLowerCase();
  for (const [re, v] of LIST_ALIASES[list]) if (re.test(loose)) return { value: v, exact: false };
  return { value: null, exact: false };
}

// ---------- identity ----------

const normText = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export function openingKey(o: { clubId: string | null; firmNorm: string; program: string; city: string; recruitingSummer: number | null }): string {
  return [o.clubId ?? "", o.firmNorm, normText(o.program), normText(o.city), o.recruitingSummer ?? ""].join("|");
}

export { normalizeFirmName, trigramSimilarity };

// ---------- status ----------

/** Today's date (YYYY-MM-DD) in Eastern time. */
export function easternToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
}
const ymd = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : null);

/** Computed status: before Opens On → Not yet open; after Deadline → Closed; otherwise Open. No dates: Rolling → Open, else Unknown. */
export function openingStatus(
  o: { opensOn: Date | string | null; deadline: Date | string | null; deadlineType: string; statusOverride: string | null },
  today = easternToday(),
): OpeningStatus {
  if (o.statusOverride && (OPENING_STATUSES as readonly string[]).includes(o.statusOverride)) return o.statusOverride as OpeningStatus;
  const opens = ymd(o.opensOn);
  const deadline = ymd(o.deadline);
  if (opens && today < opens) return "Not yet open";
  if (deadline && today > deadline) return "Closed";
  if (opens || deadline) return "Open";
  return o.deadlineType === "Rolling" ? "Open" : "Unknown";
}

/** Days from today to a date (negative = past). */
export function daysUntil(d: Date | string, today = easternToday()): number {
  const a = Date.parse(`${today}T00:00:00Z`);
  const b = Date.parse(`${ymd(d)}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** Pipeline role for an opening (the Opportunity role field). */
export function opportunityRoleFor(o: { roleType: string | null; program: string }): string {
  if (o.roleType === "Summer Analyst") return "Summer Analyst";
  if (o.roleType === "Full-time Analyst") return "Full-Time Analyst";
  return o.roleType && o.roleType !== "Other" ? o.roleType : o.program.slice(0, 80);
}
