/** Column names, aliases and allowed values for the Rolodex importer. Shared by the import page and the API. */

export type ContactField =
  | "firstName"
  | "lastName"
  | "fullName"
  | "firm"
  | "title"
  | "group"
  | "city"
  | "email"
  | "linkedinUrl"
  | "phone"
  | "track"
  | "school"
  | "howConnected"
  | "referredBy"
  | "stage"
  | "priority"
  | "notes"
  | "tags"
  | "doNotContact"
  | "connectedOn";

export type InteractionField = "email" | "firstName" | "lastName" | "firm" | "date" | "type" | "summary" | "advice" | "personal" | "nextStep" | "nextStepDue";

export const CONTACT_FIELD_LABELS: Record<ContactField, string> = {
  firstName: "First Name",
  lastName: "Last Name",
  fullName: "Full Name",
  firm: "Firm",
  title: "Title",
  group: "Group / Team",
  city: "City",
  email: "Email",
  linkedinUrl: "LinkedIn URL",
  phone: "Phone",
  track: "Track",
  school: "School",
  howConnected: "How You're Connected",
  referredBy: "Referred By",
  stage: "Relationship Stage",
  priority: "Priority",
  notes: "Personal Notes",
  tags: "Tags",
  doNotContact: "Do Not Contact",
  connectedOn: "Connected On",
};

/** Lowercase, letters and digits only: "First Name *" → "firstname". */
export const normHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

const CONTACT_ALIASES: Record<ContactField, string[]> = {
  firstName: ["first name", "firstname", "first", "given name"],
  lastName: ["last name", "lastname", "last", "surname", "family name"],
  fullName: ["name", "full name", "contact name", "contact"],
  firm: ["firm", "company", "organization", "organisation", "employer", "company name", "bank", "fund"],
  title: ["title", "position", "job title", "role"],
  group: ["group / team", "group", "team", "group team", "department", "coverage"],
  city: ["city", "location", "office", "where", "based in"],
  email: ["email", "email address", "e-mail", "work email", "contact email", "mail"],
  linkedinUrl: ["linkedin url", "url", "linkedin", "profile url", "linkedin profile", "profile"],
  phone: ["phone", "phone number", "mobile", "cell"],
  track: ["track", "industry", "recruiting track", "category"],
  school: ["school", "university", "college", "alma mater"],
  howConnected: ["how you're connected", "how connected", "how we met", "connection", "how you met", "source"],
  referredBy: ["referred by", "referrer", "intro from"],
  stage: ["relationship stage", "stage", "status"],
  priority: ["priority", "tier"],
  notes: ["personal notes", "notes", "note", "comments"],
  tags: ["tags", "tag", "labels"],
  doNotContact: ["do not contact", "dnc"],
  connectedOn: ["connected on", "connected", "connection date"],
};

const INTERACTION_ALIASES: Record<InteractionField, string[]> = {
  email: ["contact email", "email", "email address"],
  firstName: ["first name", "firstname", "first"],
  lastName: ["last name", "lastname", "last"],
  firm: ["firm", "company"],
  date: ["date", "interaction date", "date of interaction", "when"],
  type: ["type", "interaction type", "kind"],
  summary: ["summary / notes", "summary", "notes", "what we discussed", "discussed"],
  advice: ["advice they gave", "advice"],
  personal: ["personal details mentioned", "personal details", "personal"],
  nextStep: ["next step", "next steps", "follow up"],
  nextStepDue: ["next step due", "due", "due date", "follow up date"],
};

function lookup<F extends string>(aliases: Record<F, string[]>) {
  const m = new Map<string, F>();
  for (const [f, xs] of Object.entries(aliases) as [F, string[]][]) for (const x of xs) if (!m.has(normHeader(x))) m.set(normHeader(x), f);
  return m;
}
const CONTACT_LOOKUP = lookup(CONTACT_ALIASES);
const INTERACTION_LOOKUP = lookup(INTERACTION_ALIASES);

export const contactFieldFor = (header: string): ContactField | null => CONTACT_LOOKUP.get(normHeader(header)) ?? null;
export const interactionFieldFor = (header: string): InteractionField | null => INTERACTION_LOOKUP.get(normHeader(header)) ?? null;

export type TabKind = "contacts" | "interactions" | "linkedin" | null;

/** Finds the real header row (LinkedIn exports have note rows above it) and what kind of tab this is. */
export function detectTab(rows: string[][]): { headerRow: number; kind: TabKind } {
  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const hs = rows[r].map(normHeader);
    const has = (x: string) => hs.includes(x);
    if (has("date") && has("type")) return { headerRow: r, kind: "interactions" };
    if (has("firstname") && has("connectedon")) return { headerRow: r, kind: "linkedin" };
    if (has("firstname") || has("fullname") || has("name")) return { headerRow: r, kind: "contacts" };
  }
  return { headerRow: 0, kind: null };
}

export const LISTS = {
  track: ["IB", "PE", "VC", "Growth Equity", "Private Credit", "Hedge Fund", "Equity Research", "Consulting", "Corporate", "Other"],
  howConnected: ["Alumni – MSU", "Club alumni", "Referral", "Cold outreach", "Event / info session", "Family / friend", "LinkedIn connection", "Recruiter", "Other"],
  stage: ["Not contacted", "Emailed – no reply", "Replied", "Call scheduled", "Chatted", "Ongoing relationship", "Referred me", "Interviewing", "Not pursuing"],
  priority: ["A – top target", "B – active", "C – keep warm"],
  doNotContact: ["Yes", "No"],
  type: [
    "Cold email sent",
    "Follow-up email sent",
    "They replied",
    "LinkedIn message sent",
    "Coffee chat",
    "Phone call",
    "Video call",
    "In-person meeting",
    "Event / info session",
    "Interview",
    "Thank-you sent",
    "Referral / resume sent",
  ],
} as const;
export type ListName = keyof typeof LISTS;

/** The prompt from the template's "Start here" tab. */
export const CLAUDE_CONVERT_PROMPT = `Convert my networking records into the attached Prospect Rolodex Import Template. Rules:
1. Keep the template's sheet names and column headers exactly. Delete the sample rows.
2. Contacts tab: one row per person. Don't guess emails or LinkedIn URLs — leave them blank if I didn't provide them.
3. Interactions tab: every email I sent, reply I got, call, meeting, or event becomes its own row with the real date (YYYY-MM-DD). Never invent or estimate a date; if a date is unknown, skip that row and put the detail in the person's Personal Notes.
4. Type, Track, Relationship Stage, and Priority must use the exact values from the Lists tab.
5. Put what we discussed in Summary / Notes, advice in Advice They Gave, and personal details (hometown, interests) in Personal Details Mentioned.
6. If I mentioned a next step or a date to follow up, fill Next Step and Next Step Due.
7. Give me back the completed .xlsx file, then list anything you weren't sure about.`;
