import Papa from "papaparse";
import * as XLSX from "xlsx";

export type ImportField =
  | "fullName"
  | "firstName"
  | "lastName"
  | "firm"
  | "title"
  | "email"
  | "linkedinUrl"
  | "phone"
  | "notes"
  | "location"
  | "lastInteractionDate"
  | "skip";

export const IMPORT_FIELD_OPTIONS: { value: ImportField; label: string }[] = [
  { value: "fullName", label: "Full Name" },
  { value: "firstName", label: "First Name" },
  { value: "lastName", label: "Last Name" },
  { value: "firm", label: "Firm/Company" },
  { value: "title", label: "Title/Role" },
  { value: "email", label: "Email" },
  { value: "linkedinUrl", label: "LinkedIn URL" },
  { value: "phone", label: "Phone" },
  { value: "notes", label: "Notes" },
  { value: "location", label: "Location" },
  { value: "lastInteractionDate", label: "Last Interaction Date" },
  { value: "skip", label: "Skip this column" },
];

const LINKEDIN_HEADERS = [
  "First Name",
  "Last Name",
  "URL",
  "Email Address",
  "Company",
  "Position",
  "Connected On",
];

/** True if this row is the LinkedIn Connections header row. */
export function isLinkedInHeaderRow(row: string[]): boolean {
  if (row.length < LINKEDIN_HEADERS.length) return false;
  return LINKEDIN_HEADERS.every((h, i) => String(row[i] ?? "").trim() === h);
}

/** True if headers match the LinkedIn Connections export pattern. */
export function isLinkedInExport(headers: string[]): boolean {
  return isLinkedInHeaderRow(headers);
}

/**
 * Scan raw rows for LinkedIn header (first cell === "First Name" and full pattern).
 * Returns the index of the header row, or -1 if not found.
 */
export function findLinkedInHeaderRowIndex(rows: string[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const first = String(rows[i]?.[0] ?? "").trim();
    if (first === "First Name" && isLinkedInHeaderRow(rows[i])) {
      return i;
    }
  }
  // Fallback: any row whose first cell is exactly "First Name"
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i]?.[0] ?? "").trim() === "First Name") {
      return i;
    }
  }
  return -1;
}

/**
 * Turn raw spreadsheet rows into headers + data rows.
 * LinkedIn Connections.csv has Notes/disclaimer preamble before the real header —
 * we skip until we find the "First Name" header row.
 */
export function extractHeadersAndRows(rawRows: string[][]): {
  headers: string[];
  rows: string[][];
  isLinkedIn: boolean;
} {
  if (!rawRows.length) return { headers: [], rows: [], isLinkedIn: false };

  const linkedInIdx = findLinkedInHeaderRowIndex(rawRows);
  if (linkedInIdx >= 0) {
    const headers = (rawRows[linkedInIdx] ?? []).map((c) => String(c ?? "").trim());
    const rows = rawRows
      .slice(linkedInIdx + 1)
      .map((r) => (r ?? []).map((c) => String(c ?? "")))
      .filter((r) => r.some((c) => c.trim() !== ""));
    return { headers, rows, isLinkedIn: true };
  }

  const [headerRow, ...dataRows] = rawRows;
  return {
    headers: (headerRow ?? []).map((c) => String(c ?? "").trim()),
    rows: dataRows.map((r) => (r ?? []).map((c) => String(c ?? ""))),
    isLinkedIn: false,
  };
}

export function autoDetectMapping(headers: string[]): Record<number, ImportField> {
  const mapping: Record<number, ImportField> = {};
  headers.forEach((header, idx) => {
    const h = header.trim().toLowerCase();
    if (!h) {
      mapping[idx] = "skip";
      return;
    }
    if (h === "first name") mapping[idx] = "firstName";
    else if (h === "last name") mapping[idx] = "lastName";
    else if (h === "full name" || h === "name") mapping[idx] = "fullName";
    else if (h.includes("company") || h.includes("firm") || h === "organization") mapping[idx] = "firm";
    else if (h.includes("email")) mapping[idx] = "email";
    else if (h.includes("title") || h.includes("position") || h.includes("role")) mapping[idx] = "title";
    else if (h.includes("linkedin") || h === "url") mapping[idx] = "linkedinUrl";
    else if (h.includes("phone") || h.includes("mobile")) mapping[idx] = "phone";
    else if (h === "connected on" || h.includes("last interaction") || h === "date") {
      mapping[idx] = "lastInteractionDate";
    } else if (h.includes("note")) mapping[idx] = "notes";
    else if (h.includes("location") || h.includes("city")) mapping[idx] = "location";
    else mapping[idx] = "skip";
  });
  return mapping;
}

export function linkedInAutoMapping(): Record<number, ImportField> {
  return {
    0: "firstName",
    1: "lastName",
    2: "linkedinUrl",
    3: "email",
    4: "firm",
    5: "title",
    6: "lastInteractionDate",
  };
}

export type ParsedSpreadsheet = {
  headers: string[];
  rows: string[][];
  isLinkedIn?: boolean;
};

function parseCsvText(text: string): string[][] {
  // Keep empty lines so we can still find the header after blank rows;
  // extractHeadersAndRows filters empty data rows afterward.
  const result = Papa.parse<string[]>(text, {
    skipEmptyLines: false,
  });
  return (result.data ?? [])
    .map((r) => (r ?? []).map((c) => String(c ?? "")))
    .filter((r) => r.some((c) => c.trim() !== "") || r.length > 0);
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheet> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") {
    const text = await file.text();
    const raw = parseCsvText(text);
    return extractHeadersAndRows(raw);
  }
  if (ext === "xlsx" || ext === "xls") {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });
    const raw = (data ?? []).map((r) => (r ?? []).map((c) => String(c ?? "")));
    return extractHeadersAndRows(raw);
  }
  throw new Error("Unsupported file type. Use .csv or .xlsx");
}

/** Parse LinkedIn "Connected On" dates like "20 Jul 2026" or ISO strings. */
export function parseImportDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // LinkedIn format: "20 Jul 2026" / "20 Jul 2024"
  const linkedInMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (linkedInMatch) {
    const [, day, mon, year] = linkedInMatch;
    const months: Record<string, number> = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };
    const month = months[mon.toLowerCase()];
    if (month !== undefined) {
      const d = new Date(Date.UTC(Number(year), month, Number(day)));
      if (!Number.isNaN(d.getTime())) return d;
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return null;
}

export type MappedContactRow = {
  fullName: string;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  firm: string;
  title: string;
  location: string;
  notes: string;
  lastInteractionDate: string | null;
};

export function mapRowToContact(
  row: string[],
  mapping: Record<number, ImportField>,
): MappedContactRow | null {
  let firstName = "";
  let lastName = "";
  let fullName = "";
  let email = "";
  let phone: string | null = null;
  let linkedinUrl: string | null = null;
  let firm = "";
  let title = "";
  let location = "";
  let notes = "";
  let lastInteractionDate: string | null = null;

  for (const [idxStr, field] of Object.entries(mapping)) {
    const idx = Number(idxStr);
    const val = (row[idx] ?? "").trim();
    if (!val || field === "skip") continue;
    switch (field) {
      case "firstName":
        firstName = val;
        break;
      case "lastName":
        lastName = val;
        break;
      case "fullName":
        fullName = val;
        break;
      case "email":
        email = val;
        break;
      case "phone":
        phone = val;
        break;
      case "linkedinUrl":
        linkedinUrl = val;
        break;
      case "firm":
        firm = val;
        break;
      case "title":
        title = val;
        break;
      case "location":
        location = val;
        break;
      case "notes":
        notes = val;
        break;
      case "lastInteractionDate": {
        const d = parseImportDate(val);
        lastInteractionDate = d ? d.toISOString() : null;
        break;
      }
    }
  }

  if (!fullName) {
    fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  }
  if (!fullName) return null;

  return {
    fullName,
    email,
    phone,
    linkedinUrl,
    firm: firm || "Unknown",
    title: title || "Unknown",
    location: location || "",
    notes,
    lastInteractionDate,
  };
}

export function parseServerSpreadsheet(
  buffer: Buffer,
  filename: string,
): ParsedSpreadsheet {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "csv") {
    const text = buffer.toString("utf-8");
    const raw = parseCsvText(text);
    return extractHeadersAndRows(raw);
  }
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });
  const raw = (data ?? []).map((r) => (r ?? []).map((c) => String(c ?? "")));
  return extractHeadersAndRows(raw);
}
