import * as XLSX from "xlsx";
import { parseCsv } from "@/lib/csv";

export type SheetTab = { name: string; rows: string[][] };

/**
 * Reads an .xlsx/.xls workbook or a .csv into plain string rows per tab. Date cells come through as Excel
 * serial numbers (the importer converts them), so nothing depends on the browser's time zone.
 */
export async function fileToTabs(file: File | { name: string; arrayBuffer: () => Promise<ArrayBuffer> }): Promise<SheetTab[]> {
  const buf = await file.arrayBuffer();
  if (/\.(csv|txt)$/i.test(file.name)) {
    const text = new TextDecoder("utf-8").decode(buf).replace(/^﻿/, "");
    return [{ name: file.name.replace(/\.[^.]+$/, ""), rows: parseCsv(text) }];
  }
  const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
  return wb.SheetNames.filter((n) => !/^(start here|field guide|lists|instructions|readme)$/i.test(n.trim())).map((name) => {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: true, defval: "", blankrows: false });
    return { name, rows: rows.map((r) => r.map((c) => (c === null || c === undefined ? "" : String(c)))) };
  });
}
