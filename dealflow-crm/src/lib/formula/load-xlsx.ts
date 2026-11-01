import * as XLSX from "xlsx";
import { addr, parseAddr, type CellData, type SheetData } from "@/lib/formula/engine";

/** SheetJS workbook → engine sheets (values, formulas, number formats, column widths). */
export function sheetsFromXlsx(data: ArrayBuffer | Uint8Array): SheetData[] {
  const wb = XLSX.read(data instanceof Uint8Array ? data : new Uint8Array(data), { type: "array", cellFormula: true, cellNF: true, cellDates: false, cellStyles: true });
  return wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    const cells: Record<string, CellData> = {};
    let cols = 1;
    let rows = 1;
    for (const key of Object.keys(ws)) {
      if (key.startsWith("!")) continue;
      const c = ws[key] as XLSX.CellObject;
      const p = parseAddr(key);
      if (!p) continue;
      const d: CellData = {};
      if (c.f) d.f = `=${c.f}`;
      if (c.t === "n") d.v = c.v as number;
      else if (c.t === "s") d.v = String(c.v ?? "");
      else if (c.t === "b") d.v = Boolean(c.v);
      else if (c.t === "e") d.v = null;
      if (c.z && typeof c.z === "string" && c.z !== "General") d.z = c.z;
      if (d.f === undefined && (d.v === undefined || d.v === "")) continue;
      cells[addr(p.col, p.row)] = d;
      cols = Math.max(cols, p.col);
      rows = Math.max(rows, p.row);
    }
    const widths = (ws["!cols"] ?? []).map((c) => (c?.wpx ? Math.round(c.wpx) : c?.wch ? Math.round(c.wch * 7 + 10) : 0));
    return { name, cells, cols, rows, widths };
  });
}

/** Engine sheets → .xlsx bytes (formulas kept, cached values included). */
export function sheetsToXlsx(sheets: SheetData[], value: (sheet: string, a: string) => unknown): Uint8Array {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws: XLSX.WorkSheet = {};
    for (const [a, c] of Object.entries(s.cells)) {
      const v = value(s.name, a);
      const cell: XLSX.CellObject = typeof v === "number" ? { t: "n", v } : typeof v === "boolean" ? { t: "b", v } : v === null || v === undefined || typeof v === "object" ? { t: "z" } : { t: "s", v: String(v) };
      if (c.f) cell.f = c.f.replace(/^=/, "");
      if (c.z) cell.z = c.z;
      ws[a] = cell;
    }
    ws["!ref"] = `A1:${addr(Math.max(1, s.cols), Math.max(1, s.rows))}`;
    if (s.widths?.length) ws["!cols"] = s.widths.map((w) => (w ? { wpx: w } : {}));
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
}
