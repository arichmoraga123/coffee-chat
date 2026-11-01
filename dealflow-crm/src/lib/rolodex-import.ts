import { randomBytes } from "node:crypto";
import type { FirmType, Prisma, RecruitingCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { lookupKnownFirmType } from "@/lib/known-firms";
import { normalizeFirmName, normalizeLinkedIn, trigramSimilarity } from "@/lib/contact-match";
import { INTERACTION_KINDS, kindOf, parseKind, stageFromKind, type InteractionKind } from "@/lib/followups";
import {
  CONTACT_FIELD_LABELS,
  LISTS,
  contactFieldFor,
  detectTab,
  interactionFieldFor,
  type ContactField,
  type InteractionField,
  type ListName,
} from "@/lib/rolodex-fields";

/**
 * Rolodex import v2 (Phase I). One planner builds the preview; the same planner runs again on "Import" and
 * its result is written in a single transaction tagged with an ImportBatch. Never invents dates.
 */

export type ImportSource = "rolodex_template" | "linkedin" | "csv";
export type ImportInput = {
  source: ImportSource;
  fileName: string;
  tabs: { name: string; rows: string[][] }[];
  acceptSuggestions?: boolean;
  /** Firm names from the file the user agreed to merge into the suggested existing firm. */
  acceptFirms?: string[];
};

export type RowIssue = { tab: string; row: number; reason: string; raw: string[] };
export type DiffLine = { field: string; current: string; incoming: string; action: "fill" | "kept" | "append" | "restore" };
export type Suggestion = { field: string; value: string; suggestion: string; count: number };
export type FirmSuggestion = { from: string; to: string; count: number };

export type ImportPreview = {
  counts: { contactsNew: number; contactsUpdated: number; interactions: number; tasks: number; skipped: number; errors: number };
  newContacts: { name: string; firm: string; list: string }[];
  updatedContacts: { id: string; name: string; firm: string; diff: DiffLine[] }[];
  newInteractions: { name: string; date: string; type: string; summary: string }[];
  skipped: RowIssue[];
  errors: RowIssue[];
  warnings: RowIssue[];
  suggestions: Suggestion[];
  firmSuggestions: FirmSuggestion[];
  newFirms: string[];
};

// ---------- value parsing ----------

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function utc(y: number, m: number, d: number): Date | null {
  if (y < 1980 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1 ? dt : null;
}

/** YYYY-MM-DD, M/D/YYYY, "14 Oct 2026", "Oct 14, 2026", or an Excel date serial. Anything else → null. */
export function parseDate(raw: string | undefined | null): Date | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{5})(\.\d+)?$/))) {
    const n = Number(m[1]);
    if (n < 29000 || n > 75000) return null;
    return new Date(Date.UTC(1899, 11, 30) + n * 86_400_000);
  }
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/))) return utc(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/))) return utc(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[1], +m[2]);
  if ((m = s.match(/^(\d{1,2})[ -]([A-Za-z]{3,})\.?[ -,]+(\d{4})$/))) {
    const mo = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
    return mo < 0 ? null : utc(+m[3], mo + 1, +m[1]);
  }
  if ((m = s.match(/^([A-Za-z]{3,})\.? (\d{1,2}),? (\d{4})$/))) {
    const mo = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
    return mo < 0 ? null : utc(+m[3], mo + 1, +m[2]);
  }
  return null;
}

const loose = (s: string) => s.toLowerCase().replace(/[–—-]/g, "-").replace(/[^a-z0-9/-]+/g, " ").trim();

const LIST_ALIASES: Partial<Record<ListName, [RegExp, string][]>> = {
  track: [
    [/invest.*bank|^ib$|banking/, "IB"],
    [/private equity|^pe$|buyout/, "PE"],
    [/venture|^vc$/, "VC"],
    [/growth/, "Growth Equity"],
    [/credit|debt/, "Private Credit"],
    [/hedge|^hf$/, "Hedge Fund"],
    [/research|^er$/, "Equity Research"],
    [/consult/, "Consulting"],
    [/corp/, "Corporate"],
  ],
  priority: [
    [/^a\b|top|high/, "A – top target"],
    [/^b\b|active|med/, "B – active"],
    [/^c\b|warm|low/, "C – keep warm"],
  ],
  doNotContact: [
    [/^(y|yes|true|1|x)$/, "Yes"],
    [/^(n|no|false|0)$/, "No"],
  ],
  stage: [
    [/not contacted|^new$/, "Not contacted"],
    [/no reply|emailed|sent/, "Emailed – no reply"],
    [/repl/, "Replied"],
    [/scheduled/, "Call scheduled"],
    [/chat|spoke|met/, "Chatted"],
    [/ongoing|warm|strong/, "Ongoing relationship"],
    [/referr/, "Referred me"],
    [/interview/, "Interviewing"],
    [/not pursu|pass|dead/, "Not pursuing"],
  ],
  howConnected: [
    [/alum.*msu|msu.*alum|michigan state/, "Alumni – MSU"],
    [/club/, "Club alumni"],
    [/referr|intro/, "Referral"],
    [/cold/, "Cold outreach"],
    [/event|info session|fair|summit/, "Event / info session"],
    [/family|friend/, "Family / friend"],
    [/linkedin/, "LinkedIn connection"],
    [/recruit/, "Recruiter"],
  ],
};

/** Exact list value → ok; close → suggestion; nothing close → invalid. */
function checkList(list: ListName, raw: string): { ok: string } | { suggestion: string } | { invalid: true } {
  const s = raw.trim();
  const values = LISTS[list] as readonly string[];
  if (values.includes(s)) return { ok: s };
  const l = loose(s);
  const same = values.find((v) => loose(v) === l);
  if (same) return { suggestion: same };
  if (list === "type") {
    const k = parseKind(s);
    if (k) return { suggestion: INTERACTION_KINDS[k].label };
  }
  for (const [re, v] of LIST_ALIASES[list] ?? []) if (re.test(l)) return { suggestion: v };
  let best: { v: string; sim: number } | null = null;
  for (const v of values) {
    const sim = trigramSimilarity(s, v);
    if (!best || sim > best.sim) best = { v, sim };
  }
  if (best && best.sim >= 0.35) return { suggestion: best.v };
  return { invalid: true };
}

const TRACK_CATEGORY: Record<string, RecruitingCategory> = {
  IB: "IB",
  PE: "PE",
  "Private Credit": "PE",
  VC: "VC",
  "Growth Equity": "GE",
  "Hedge Fund": "HF",
  "Equity Research": "HF",
};
const FIRM_TYPE_CATEGORY: Partial<Record<FirmType, RecruitingCategory>> = { PE: "PE", GE: "GE", VC: "VC", HF: "HF" };

const newId = () => `c${randomBytes(12).toString("hex")}`;
const placeholderEmail = () => `import+${randomBytes(8).toString("hex")}@placeholder.local`;
const isPlaceholder = (e: string | null | undefined) => !e || e.endsWith("@placeholder.local");
const nameKey = (first: string, last: string, firm: string) => `${`${first} ${last}`.toLowerCase().replace(/\s+/g, " ").trim()}|${normalizeFirmName(firm)}`;
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const splitList = (s: string) =>
  s
    .split(/[;,|]/)
    .map((x) => x.trim())
    .filter(Boolean);

// ---------- planning ----------

type FileContact = {
  id: string;
  existing: boolean;
  name: string;
  firmName: string;
  firmId: string;
  stageGiven: boolean;
  list: string;
  /** Contact row data for create, or field updates for an existing contact. */
  data: Record<string, unknown>;
  diff: DiffLine[];
  latestExisting: Date | null;
  newInteractions: { date: Date; kind: InteractionKind }[];
  existingList: string | null;
};

type Plan = {
  preview: ImportPreview;
  firmsToCreate: { id: string; name: string; type: FirmType | null; location: string }[];
  contacts: FileContact[];
  interactions: Prisma.InteractionCreateManyInput[];
  extraTasks: Prisma.TaskCreateManyInput[];
};

export async function planImport(userId: string, input: ImportInput): Promise<Plan> {
  const accept = Boolean(input.acceptSuggestions);
  const acceptFirms = new Set((input.acceptFirms ?? []).map((s) => s.toLowerCase()));

  const errors: RowIssue[] = [];
  const warnings: RowIssue[] = [];
  const skipped: RowIssue[] = [];
  const suggestionMap = new Map<string, Suggestion>();
  const firmSuggestionMap = new Map<string, FirmSuggestion>();

  /** Returns the value to store, or null; records suggestions. */
  const listValue = (list: ListName, label: string, raw: string): string | null => {
    if (!raw.trim()) return null;
    const r = checkList(list, raw);
    if ("ok" in r) return r.ok;
    if ("suggestion" in r) {
      const k = `${label}|${raw.trim()}`;
      const cur = suggestionMap.get(k) ?? { field: label, value: raw.trim(), suggestion: r.suggestion, count: 0 };
      cur.count++;
      suggestionMap.set(k, cur);
      return accept ? r.suggestion : null;
    }
    return null;
  };

  // Split tabs.
  let linkedin = input.source === "linkedin";
  const contactRows: { tab: string; row: number; raw: string[]; v: Partial<Record<ContactField, string>> }[] = [];
  const interactionRows: { tab: string; row: number; raw: string[]; v: Partial<Record<InteractionField, string>> }[] = [];
  for (const tab of input.tabs) {
    const { headerRow, kind } = detectTab(tab.rows);
    if (!kind) continue;
    if (kind === "linkedin") linkedin = true;
    const headers = tab.rows[headerRow] ?? [];
    for (let r = headerRow + 1; r < tab.rows.length; r++) {
      const raw = tab.rows[r].map((c) => String(c ?? "").trim());
      if (!raw.some(Boolean)) continue;
      if (kind === "interactions") {
        const v: Partial<Record<InteractionField, string>> = {};
        headers.forEach((h, i) => {
          const f = interactionFieldFor(h);
          if (f && raw[i] && !v[f]) v[f] = raw[i];
        });
        interactionRows.push({ tab: tab.name, row: r + 1, raw, v });
      } else {
        const v: Partial<Record<ContactField, string>> = {};
        headers.forEach((h, i) => {
          const f = contactFieldFor(h);
          if (f && raw[i] && !v[f]) v[f] = raw[i];
        });
        contactRows.push({ tab: tab.name, row: r + 1, raw, v });
      }
    }
  }

  // Existing data.
  const [existingContacts, existingFirms, existingInteractions] = await Promise.all([
    prisma.contact.findMany({
      where: { userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        linkedinUrl: true,
        firmId: true,
        firm: { select: { name: true } },
        title: true,
        group: true,
        location: true,
        phone: true,
        school: true,
        howWeMet: true,
        referredBy: true,
        relationshipStage: true,
        priority: true,
        notes: true,
        tags: true,
        doNotContact: true,
        notPursuing: true,
        connectedOn: true,
        deletedAt: true,
        list: true,
        lastInteractionDate: true,
      },
    }),
    prisma.firm.findMany({ where: { userId }, select: { id: true, name: true } }),
    prisma.interaction.findMany({
      where: { userId, deletedAt: null, autoCreated: false },
      select: { contactId: true, date: true, kind: true, type: true, notes: true },
    }),
  ]);

  // Firms.
  const firmByNorm = new Map<string, { id: string; name: string }>();
  for (const f of existingFirms) if (!firmByNorm.has(normalizeFirmName(f.name))) firmByNorm.set(normalizeFirmName(f.name), f);
  const firmsToCreate: Plan["firmsToCreate"] = [];
  const resolveFirm = (name: string, city: string): { id: string; name: string } => {
    const norm = normalizeFirmName(name) || name.toLowerCase();
    const hit = firmByNorm.get(norm);
    if (hit) return hit;
    let best: { f: { id: string; name: string }; sim: number } | null = null;
    for (const f of existingFirms) {
      const sim = trigramSimilarity(normalizeFirmName(name), normalizeFirmName(f.name));
      if (sim > 0.6 && (!best || sim > best.sim)) best = { f, sim };
    }
    if (best) {
      const s = firmSuggestionMap.get(name) ?? { from: name, to: best.f.name, count: 0 };
      s.count++;
      firmSuggestionMap.set(name, s);
      if (accept || acceptFirms.has(name.toLowerCase())) return best.f;
    }
    const created = { id: newId(), name: name.trim(), type: lookupKnownFirmType(name), location: city || "" };
    firmsToCreate.push(created);
    firmByNorm.set(norm, created);
    return created;
  };

  // Indexes for matching.
  const byEmail = new Map<string, FileContact>();
  const byLinkedIn = new Map<string, FileContact>();
  const byName = new Map<string, FileContact>();
  const exByEmail = new Map<string, (typeof existingContacts)[number]>();
  const exByLinkedIn = new Map<string, (typeof existingContacts)[number]>();
  const exByName = new Map<string, (typeof existingContacts)[number]>();
  for (const c of existingContacts) {
    if (!isPlaceholder(c.email)) exByEmail.set(c.email.toLowerCase(), c);
    if (c.linkedinUrl) exByLinkedIn.set(normalizeLinkedIn(c.linkedinUrl), c);
    const parts = c.fullName.trim().split(/\s+/);
    exByName.set(nameKey(parts[0] ?? "", parts.slice(1).join(" "), c.firm.name), c);
  }
  const latestByContact = new Map<string, Date>();
  const interactionKeys = new Set<string>();
  const dedupeKey = (contactId: string, date: Date, kind: string, summary: string | null | undefined) =>
    `${contactId}|${ymd(date)}|${kind}|${(summary ?? "").trim().slice(0, 60).toLowerCase()}`;
  for (const i of existingInteractions) {
    interactionKeys.add(dedupeKey(i.contactId, i.date, kindOf(i), i.notes));
    const cur = latestByContact.get(i.contactId);
    if (!cur || i.date > cur) latestByContact.set(i.contactId, i.date);
  }

  const fileContacts: FileContact[] = [];
  const touchedExisting = new Map<string, FileContact>();
  const firstRowOf = new Map<FileContact, number>();

  const existingAsFile = (ex: (typeof existingContacts)[number]): FileContact => {
    const cur = touchedExisting.get(ex.id);
    if (cur) return cur;
    const fc: FileContact = {
      id: ex.id,
      existing: true,
      name: ex.fullName,
      firmName: ex.firm.name,
      firmId: ex.firmId,
      stageGiven: false,
      list: ex.list,
      data: {},
      diff: [],
      latestExisting: latestByContact.get(ex.id) ?? null,
      newInteractions: [],
      existingList: ex.list,
    };
    touchedExisting.set(ex.id, fc);
    fileContacts.push(fc);
    return fc;
  };

  // ----- contacts -----
  for (const r of contactRows) {
    const v = r.v;
    let first = v.firstName ?? "";
    let last = v.lastName ?? "";
    if (!first && !last && v.fullName) {
      const parts = v.fullName.trim().split(/\s+/);
      first = parts[0] ?? "";
      last = parts.slice(1).join(" ");
    }
    if (!first && !last) {
      errors.push({ tab: r.tab, row: r.row, reason: "Missing First Name and Last Name.", raw: r.raw });
      continue;
    }
    const firmRaw = (v.firm ?? "").trim();
    if (!firmRaw) {
      if (linkedin) skipped.push({ tab: r.tab, row: r.row, reason: "No company listed on LinkedIn.", raw: r.raw });
      else errors.push({ tab: r.tab, row: r.row, reason: "Missing Firm.", raw: r.raw });
      continue;
    }
    const fullName = `${first} ${last}`.replace(/\s+/g, " ").trim();
    const email = (v.email ?? "").trim().toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) warnings.push({ tab: r.tab, row: r.row, reason: `Email "${v.email}" doesn't look valid, so it was left out.`, raw: r.raw });
    const goodEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
    const li = v.linkedinUrl ? normalizeLinkedIn(v.linkedinUrl) : "";
    const nk = nameKey(first, last, firmRaw);

    // Duplicate row inside the file?
    const dupInFile = (goodEmail && byEmail.get(goodEmail)) || (li && byLinkedIn.get(li)) || byName.get(nk);
    if (dupInFile && !dupInFile.existing) {
      skipped.push({ tab: r.tab, row: r.row, reason: `Same person as row ${firstRowOf.get(dupInFile) ?? "?"}.`, raw: r.raw });
      continue;
    }

    const track = listValue("track", "Track", v.track ?? "");
    const how = listValue("howConnected", CONTACT_FIELD_LABELS.howConnected, v.howConnected ?? "");
    const stage = listValue("stage", "Relationship Stage", v.stage ?? "");
    const prio = listValue("priority", "Priority", v.priority ?? "");
    const dnc = listValue("doNotContact", "Do Not Contact", v.doNotContact ?? "");
    const connectedOn = v.connectedOn ? parseDate(v.connectedOn) : null;
    if (v.connectedOn && !connectedOn) warnings.push({ tab: r.tab, row: r.row, reason: `Connected On "${v.connectedOn}" isn't a date, so it was left out.`, raw: r.raw });
    const tags = v.tags ? splitList(v.tags) : [];
    if (track && !TRACK_CATEGORY[track]) tags.push(track);

    const incoming = {
      title: v.title ?? "",
      group: v.group ?? "",
      location: v.city ?? "",
      phone: v.phone ?? "",
      school: v.school ?? "",
      howWeMet: how ?? (linkedin ? "LinkedIn connection" : ""),
      referredBy: v.referredBy ?? "",
      relationshipStage: stage ?? "",
      priority: prio ? prio[0] : "",
      linkedinUrl: v.linkedinUrl?.trim() ?? "",
      email: goodEmail,
    };

    const ex = (goodEmail && exByEmail.get(goodEmail)) || (li && exByLinkedIn.get(li)) || exByName.get(nk);
    if (ex) {
      const fc = existingAsFile(ex);
      firstRowOf.set(fc, r.row);
      const label: Record<string, string> = {
        title: "Title",
        group: "Group / Team",
        location: "City",
        phone: "Phone",
        school: "School",
        howWeMet: "How you're connected",
        referredBy: "Referred by",
        relationshipStage: "Relationship stage",
        priority: "Priority",
        linkedinUrl: "LinkedIn URL",
        email: "Email",
      };
      for (const [k, val] of Object.entries(incoming)) {
        if (!val) continue;
        const curRaw = (ex as Record<string, unknown>)[k];
        const cur = typeof curRaw === "string" ? curRaw : "";
        const empty = !cur || cur === "Unknown" || (k === "email" && isPlaceholder(cur));
        if (empty) {
          fc.data[k] = val;
          fc.diff.push({ field: label[k], current: "", incoming: val, action: "fill" });
        } else if (cur.trim().toLowerCase() !== val.trim().toLowerCase()) {
          fc.diff.push({ field: label[k], current: cur, incoming: val, action: "kept" });
        }
      }
      if (stage) fc.stageGiven = true;
      if (v.notes && !ex.notes.includes(v.notes.trim())) {
        fc.data.notes = ex.notes ? `${ex.notes}\n\n${v.notes.trim()}` : v.notes.trim();
        fc.diff.push({ field: "Notes", current: ex.notes, incoming: v.notes.trim(), action: "append" });
      }
      const newTags = tags.filter((t) => !ex.tags.includes(t));
      if (newTags.length) {
        fc.data.tags = [...ex.tags, ...newTags];
        fc.diff.push({ field: "Tags", current: ex.tags.join(", "), incoming: newTags.join(", "), action: "append" });
      }
      if (dnc === "Yes" && !ex.doNotContact) {
        fc.data.doNotContact = true;
        fc.diff.push({ field: "Do not contact", current: "No", incoming: "Yes", action: "fill" });
      }
      if (stage === "Not pursuing" && !ex.notPursuing) {
        fc.data.notPursuing = true;
        fc.diff.push({ field: "Not pursuing", current: "No", incoming: "Yes", action: "fill" });
      }
      if (connectedOn && !ex.connectedOn) {
        fc.data.connectedOn = connectedOn;
        fc.diff.push({ field: "Connected on", current: "", incoming: ymd(connectedOn), action: "fill" });
      }
      if (ex.deletedAt) {
        fc.data.deletedAt = null;
        fc.diff.push({ field: "Trash", current: "In Trash", incoming: "Restored", action: "restore" });
      }
      if (goodEmail) byEmail.set(goodEmail, fc);
      if (li) byLinkedIn.set(li, fc);
      byName.set(nk, fc);
      continue;
    }

    const firm = resolveFirm(firmRaw, incoming.location);
    const knownType = lookupKnownFirmType(firm.name);
    const fc: FileContact = {
      id: newId(),
      existing: false,
      name: fullName,
      firmName: firm.name,
      firmId: firm.id,
      stageGiven: Boolean(stage),
      list: linkedin ? "network" : "active",
      data: {
        fullName,
        email: goodEmail || placeholderEmail(),
        phone: incoming.phone || null,
        linkedinUrl: incoming.linkedinUrl || null,
        group: incoming.group,
        title: incoming.title,
        location: incoming.location,
        school: incoming.school,
        recruitingCategory: (track && TRACK_CATEGORY[track]) || (knownType && FIRM_TYPE_CATEGORY[knownType]) || "IB",
        referralProbability: "MEDIUM",
        notes: v.notes?.trim() ?? "",
        howWeMet: incoming.howWeMet || null,
        referredBy: incoming.referredBy || null,
        relationshipStage: stage ?? null,
        priority: incoming.priority || null,
        tags,
        doNotContact: dnc === "Yes",
        notPursuing: stage === "Not pursuing",
        connectedOn,
        list: linkedin ? "network" : "active",
        source: linkedin ? "linkedin" : "import",
        lastInteractionDate: null,
      },
      diff: [],
      latestExisting: null,
      newInteractions: [],
      existingList: null,
    };
    fileContacts.push(fc);
    firstRowOf.set(fc, r.row);
    if (goodEmail) byEmail.set(goodEmail, fc);
    if (li) byLinkedIn.set(li, fc);
    byName.set(nk, fc);
  }

  // ----- interactions -----
  const interactions: Prisma.InteractionCreateManyInput[] = [];
  const perContact = new Map<string, { id: string; date: Date; kind: InteractionKind; nextStep: string | null; due: Date | null; summary: string; row: RowIssue }[]>();
  for (const r of interactionRows) {
    const v = r.v;
    const issue = { tab: r.tab, row: r.row, raw: r.raw };
    const email = (v.email ?? "").trim().toLowerCase();
    let fc: FileContact | undefined = email ? byEmail.get(email) : undefined;
    if (!fc && email) {
      const ex = exByEmail.get(email);
      if (ex) fc = existingAsFile(ex);
    }
    if (!fc && (v.firstName || v.lastName)) {
      const nk = nameKey(v.firstName ?? "", v.lastName ?? "", v.firm ?? "");
      fc = byName.get(nk);
      if (!fc) {
        const ex = exByName.get(nk);
        if (ex) fc = existingAsFile(ex);
      }
    }
    if (!fc) {
      errors.push({ ...issue, reason: "No matching contact. Add the person to the Contacts tab, or fix Contact Email / First + Last + Firm." });
      continue;
    }
    const date = parseDate(v.date);
    if (!date) {
      errors.push({ ...issue, reason: v.date ? `"${v.date}" isn't a valid date. Use YYYY-MM-DD.` : "Missing Date. Interactions need the real date; none is filled in for you." });
      continue;
    }
    if (!v.type) {
      errors.push({ ...issue, reason: "Missing Type." });
      continue;
    }
    const typeLabel = listValue("type", "Interaction Type", v.type);
    if (!typeLabel) {
      const r2 = checkList("type", v.type);
      errors.push({
        ...issue,
        reason: "suggestion" in r2 ? `Type "${v.type}" isn't in the list. Accept the suggestion "${r2.suggestion}" to import it.` : `Type "${v.type}" isn't in the list.`,
      });
      continue;
    }
    const kind = parseKind(typeLabel)!;
    const summary = v.summary?.trim() ?? "";
    const key = dedupeKey(fc.id, date, kind, summary);
    if (interactionKeys.has(key)) {
      skipped.push({ ...issue, reason: `Already imported (${fc.name}, ${ymd(date)}, ${typeLabel}).` });
      continue;
    }
    interactionKeys.add(key);
    let due: Date | null = null;
    if (v.nextStepDue) {
      due = parseDate(v.nextStepDue);
      if (!due) warnings.push({ ...issue, reason: `Next Step Due "${v.nextStepDue}" isn't a date, so no reminder was set for this step.` });
    }
    const id = newId();
    interactions.push({
      id,
      userId,
      contactId: fc.id,
      date,
      kind,
      type: INTERACTION_KINDS[kind].legacy,
      notes: summary || null,
      adviceGiven: v.advice?.trim() || null,
      personalDetails: v.personal?.trim() || null,
      nextStep: v.nextStep?.trim() || null,
      nextStepDue: due,
    });
    fc.newInteractions.push({ date, kind });
    const list = perContact.get(fc.id) ?? [];
    list.push({ id, date, kind, nextStep: v.nextStep?.trim() || null, due, summary, row: { ...issue, reason: "" } });
    perContact.set(fc.id, list);
  }

  // ----- per-contact derived fields -----
  const today = new Date(new Date().toISOString().slice(0, 10));
  const extraTasks: Prisma.TaskCreateManyInput[] = [];
  let taskCount = 0;
  for (const fc of fileContacts) {
    const added = perContact.get(fc.id) ?? [];
    if (!added.length) continue;
    const latestNew = added.reduce((m, i) => (i.date > m.date ? i : m));
    const latest = fc.latestExisting && fc.latestExisting > latestNew.date ? fc.latestExisting : latestNew.date;
    fc.data.lastInteractionDate = latest;
    if (!fc.stageGiven && (!fc.latestExisting || latestNew.date >= fc.latestExisting)) fc.data.relationshipStage = stageFromKind(latestNew.kind);
    if (fc.existing && fc.existingList === "network") {
      fc.data.list = "active";
      fc.diff.push({ field: "List", current: "Network", incoming: "Contacts (has interactions)", action: "fill" });
    }
    if (!fc.existing && fc.list === "network") fc.data.list = "active";
    // The latest interaction's next step becomes a task through the follow-up rules; earlier still-open steps get their own task.
    for (const i of added) {
      if (!i.nextStep || !i.due) continue;
      taskCount++;
      const isLatest = i === latestNew && latest.getTime() === latestNew.date.getTime();
      if (isLatest) continue;
      if (i.due < today && added.some((o) => o.date > i.date)) continue; // superseded and already past
      extraTasks.push({
        userId,
        contactId: fc.id,
        dueDate: i.due,
        taskType: "FOLLOW_UP",
        kind: "manual",
        ruleKey: `step:${i.id}`,
        reason: `Next step: ${i.nextStep}`,
        notes: i.summary,
      });
    }
  }

  // ----- preview -----
  const newContacts = fileContacts.filter((c) => !c.existing);
  const updated = fileContacts.filter((c) => c.existing && (Object.keys(c.data).length || c.newInteractions.length));
  for (const c of fileContacts) {
    if (c.existing && !Object.keys(c.data).length && !c.newInteractions.length && firstRowOf.has(c)) {
      skipped.push({ tab: "Contacts", row: firstRowOf.get(c)!, reason: `${c.name} is already in Prospect with nothing new.`, raw: [] });
    }
  }
  const nameOf = new Map(fileContacts.map((c) => [c.id, c.name]));
  skipped.sort((a, b) => a.tab.localeCompare(b.tab) || a.row - b.row);

  const preview: ImportPreview = {
    counts: {
      contactsNew: newContacts.length,
      contactsUpdated: updated.length,
      interactions: interactions.length,
      tasks: taskCount,
      skipped: skipped.length,
      errors: errors.length,
    },
    newContacts: newContacts.slice(0, 500).map((c) => ({ name: c.name, firm: c.firmName, list: String(c.data.list ?? c.list) })),
    updatedContacts: updated.slice(0, 500).map((c) => ({
      id: c.id,
      name: c.name,
      firm: c.firmName,
      diff: c.newInteractions.length ? [...c.diff, { field: "Interactions", current: "", incoming: `+${c.newInteractions.length}`, action: "append" as const }] : c.diff,
    })),
    newInteractions: interactions.slice(0, 300).map((i) => ({
      name: nameOf.get(i.contactId) ?? "",
      date: ymd(i.date as Date),
      type: INTERACTION_KINDS[i.kind as InteractionKind].label,
      summary: (i.notes ?? "").slice(0, 120),
    })),
    skipped,
    errors,
    warnings,
    suggestions: [...suggestionMap.values()],
    firmSuggestions: [...firmSuggestionMap.values()],
    newFirms: firmsToCreate.map((f) => f.name),
  };

  return { preview, firmsToCreate, contacts: fileContacts.filter((c) => !c.existing || Object.keys(c.data).length), interactions, extraTasks };
}

/** Writes a plan in one transaction tagged with a new ImportBatch. Returns the batch id and touched contact ids. */
export async function commitImport(userId: string, input: ImportInput, plan: Plan) {
  const p = plan.preview.counts;
  const batchId = newId();
  await prisma.$transaction(
    async (tx) => {
      await tx.importBatch.create({
        data: {
          id: batchId,
          userId,
          source: input.source,
          fileName: input.fileName.slice(0, 200),
          counts: { contactsNew: p.contactsNew, contactsUpdated: p.contactsUpdated, interactions: p.interactions, tasks: p.tasks, skipped: p.skipped, errors: p.errors },
        },
      });
      if (plan.firmsToCreate.length) {
        await tx.firm.createMany({
          data: plan.firmsToCreate.map((f) => ({ id: f.id, name: f.name, type: f.type ?? "OTHER", location: f.location || "", focus: "", userId })),
          skipDuplicates: true,
        });
      }
      const creates = plan.contacts.filter((c) => !c.existing);
      if (creates.length) {
        await tx.contact.createMany({
          data: creates.map((c) => ({ ...(c.data as Prisma.ContactCreateManyInput), id: c.id, firmId: c.firmId, userId, importBatchId: batchId })),
        });
      }
      for (const c of plan.contacts.filter((x) => x.existing && Object.keys(x.data).length)) {
        await tx.contact.update({ where: { id: c.id }, data: c.data as Prisma.ContactUpdateInput });
      }
      if (plan.interactions.length) {
        await tx.interaction.createMany({ data: plan.interactions.map((i) => ({ ...i, importBatchId: batchId })) });
      }
      if (plan.extraTasks.length) await tx.task.createMany({ data: plan.extraTasks, skipDuplicates: true });
    },
    { timeout: 120_000, maxWait: 20_000 },
  );
  const touched = [...new Set([...plan.contacts.map((c) => c.id), ...plan.interactions.map((i) => i.contactId)])];
  return { batchId, touched };
}
