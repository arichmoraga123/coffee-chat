/**
 * Turns uploaded sheet rows into opening records (one per city). Pure: no database, so the
 * upload test can run it directly on the template.
 */
import type { SheetTab } from "@/lib/sheet-rows";
import {
  FIELD_LABELS,
  mapHeaders,
  matchList,
  normalizeFirmName,
  parseClassYears,
  parseDateCell,
  splitCities,
  type OpeningField,
} from "@/lib/openings";

export type ParsedOpening = {
  /** 1-based row number in the file (for messages). */
  row: number;
  tab: string;
  firmName: string;
  firmNorm: string;
  program: string;
  roleType: string | null;
  track: string | null;
  group: string | null;
  classYears: string[];
  recruitingSummer: number | null;
  city: string;
  opensOn: Date | null;
  deadline: Date | null;
  deadlineType: string;
  statusOverride: string | null;
  link: string | null;
  source: string | null;
  notes: string | null;
};

export type RowError = { tab: string; row: number; reason: string };
export type ValueWarning = { field: string; value: string; suggestion: string | null; count: number };

export type ParseResult = {
  openings: ParsedOpening[];
  errors: RowError[];
  warnings: ValueWarning[];
  /** Data rows read (before splitting cities). */
  rowsRead: number;
  tabsUsed: string[];
  headerProblems: string[];
};

const clean = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();

export function parseOpeningTabs(tabs: SheetTab[]): ParseResult {
  const out: ParseResult = { openings: [], errors: [], warnings: [], rowsRead: 0, tabsUsed: [], headerProblems: [] };
  const warn = new Map<string, ValueWarning>();
  const addWarning = (field: OpeningField, value: string, suggestion: string | null) => {
    const k = `${field}|${value}`;
    const w = warn.get(k) ?? { field: FIELD_LABELS[field], value, suggestion, count: 0 };
    w.count++;
    warn.set(k, w);
  };

  for (const tab of tabs) {
    const mapped = mapHeaders(tab.rows);
    if (!mapped) continue;
    if (mapped.missing.length) {
      out.headerProblems.push(`${tab.name}: missing ${mapped.missing.map((f) => FIELD_LABELS[f]).join(", ")} column`);
      continue;
    }
    out.tabsUsed.push(tab.name);
    for (let i = mapped.headerRow + 1; i < tab.rows.length; i++) {
      const cells = tab.rows[i];
      if (!cells.some((c) => clean(c))) continue;
      const v: Partial<Record<OpeningField, string>> = {};
      mapped.columns.forEach((f, ci) => {
        if (f) v[f] = clean(cells[ci]);
      });
      const rowNo = i + 1;
      out.rowsRead++;
      const fail = (reason: string) => out.errors.push({ tab: tab.name, row: rowNo, reason });

      const firmName = v.firm ?? "";
      const program = v.program ?? "";
      const cityRaw = v.city ?? "";
      if (!firmName) {
        fail("Firm is blank");
        continue;
      }
      if (!program) {
        fail("Program / Position is blank");
        continue;
      }
      if (!cityRaw) {
        fail("City is blank");
        continue;
      }

      // Dates: never guessed. Words like Rolling / TBC become a blank date plus a Deadline Type.
      const opens = parseDateCell(v.opensOn);
      const deadline = parseDateCell(v.deadline);
      if (opens.kind === "invalid") {
        fail(`Couldn't read Opens On "${v.opensOn}" — use YYYY-MM-DD`);
        continue;
      }
      if (deadline.kind === "invalid") {
        fail(`Couldn't read Deadline "${v.deadline}" — use YYYY-MM-DD`);
        continue;
      }
      if (opens.date && deadline.date && deadline.date < opens.date) {
        fail("Deadline is before Opens On");
        continue;
      }

      let deadlineType = deadline.date ? "Fixed" : deadline.kind === "rolling" || opens.kind === "rolling" ? "Rolling" : "Unknown";
      if (v.deadlineType) {
        const m = matchList("deadlineType", v.deadlineType);
        if (m.value) {
          if (!m.exact) addWarning("deadlineType", v.deadlineType, m.value);
          // A typed date always wins over a "Rolling" label.
          deadlineType = deadline.date && m.value !== "Fixed" ? "Fixed" : m.value;
        } else addWarning("deadlineType", v.deadlineType, null);
      }

      let statusOverride: string | null = null;
      if (v.status) {
        const m = matchList("status", v.status);
        if (m.value) {
          statusOverride = m.value;
          if (!m.exact) addWarning("status", v.status, m.value);
        } else addWarning("status", v.status, null);
      }

      let roleType: string | null = null;
      if (v.roleType) {
        const m = matchList("roleType", v.roleType);
        roleType = m.value ?? "Other";
        if (!m.exact) addWarning("roleType", v.roleType, m.value ?? "Other");
      }

      let track: string | null = null;
      if (v.track) {
        const m = matchList("track", v.track);
        track = m.value ?? v.track;
        if (!m.exact) addWarning("track", v.track, m.value);
      }

      const cy = parseClassYears(v.classYears ?? "");
      for (const u of cy.unknown) addWarning("classYears", u, null);

      let recruitingSummer: number | null = null;
      if (v.recruitingSummer) {
        const n = Number(v.recruitingSummer.replace(/[^\d]/g, ""));
        if (Number.isInteger(n) && n >= 2000 && n <= 2100) recruitingSummer = n;
        else {
          fail(`Recruiting Summer "${v.recruitingSummer}" isn't a year`);
          continue;
        }
      } else {
        // A year written in the program name ("2027 Summer Analyst") is used as the summer.
        const m = /\b(20\d{2})\b/.exec(program);
        if (m) recruitingSummer = Number(m[1]);
      }

      let link: string | null = v.link || null;
      if (link && !/^https?:\/\//i.test(link)) link = /^[\w-]+(\.[\w-]+)+(\/|$)/.test(link) ? `https://${link}` : null;
      if (v.link && !link) addWarning("link", v.link, null);

      const cities = splitCities(cityRaw);
      for (const city of cities) {
        out.openings.push({
          row: rowNo,
          tab: tab.name,
          firmName,
          firmNorm: normalizeFirmName(firmName) || firmName.toLowerCase(),
          program,
          roleType,
          track,
          group: v.group || null,
          classYears: cy.years,
          recruitingSummer,
          city,
          opensOn: opens.date,
          deadline: deadline.date,
          deadlineType,
          statusOverride,
          link,
          source: v.source || null,
          notes: v.notes || null,
        });
      }
    }
  }
  out.warnings = [...warn.values()];
  return out;
}
