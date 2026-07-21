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

export function isLinkedInExport(headers: string[]): boolean {
  if (headers.length !== LINKEDIN_HEADERS.length) return false;
  return LINKEDIN_HEADERS.every((h, i) => headers[i]?.trim() === h);
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
    else if (h.includes("note")) mapping[idx] = "notes";
    else if (h.includes("location") || h.includes("city")) mapping[idx] = "location";
    else if (h === "connected on") mapping[idx] = "skip";
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
    6: "skip",
  };
}

export type ParsedSpreadsheet = {
  headers: string[];
  rows: string[][];
};

export async function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheet> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") {
    const text = await file.text();
    const result = Papa.parse<string[]>(text, { skipEmptyLines: true });
    if (!result.data.length) return { headers: [], rows: [] };
    const [headers, ...rows] = result.data;
    return { headers: headers.map(String), rows: rows.map((r) => r.map(String)) };
  }
  if (ext === "xlsx" || ext === "xls") {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });
    if (!data.length) return { headers: [], rows: [] };
    const [headers, ...rows] = data;
    return {
      headers: (headers ?? []).map(String),
      rows: rows.map((r) => (r ?? []).map(String)),
    };
  }
  throw new Error("Unsupported file type. Use .csv or .xlsx");
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
  };
}

export function parseServerSpreadsheet(
  buffer: Buffer,
  filename: string,
): ParsedSpreadsheet {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "csv") {
    const text = buffer.toString("utf-8");
    const result = Papa.parse<string[]>(text, { skipEmptyLines: true });
    if (!result.data.length) return { headers: [], rows: [] };
    const [headers, ...rows] = result.data;
    return { headers: headers.map(String), rows: rows.map((r) => r.map(String)) };
  }
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });
  if (!data.length) return { headers: [], rows: [] };
  const [headers, ...rows] = data;
  return {
    headers: (headers ?? []).map(String),
    rows: rows.map((r) => (r ?? []).map(String)),
  };
}
