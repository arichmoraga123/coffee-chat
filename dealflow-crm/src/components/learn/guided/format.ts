import * as XLSX from "xlsx";
import { isErr, type Scalar } from "@/lib/formula/engine";

/** Cell display text using the workbook's number format (SheetJS SSF), like Excel. */
export function fmtCell(v: Scalar, z?: string | null): string {
  if (v === null || v === undefined) return "";
  if (isErr(v)) return v.error;
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") {
    if (z) {
      try {
        return XLSX.SSF.format(z, v);
      } catch {
        /* fall through */
      }
    }
    return Math.abs(v) >= 1000 ? v.toLocaleString("en-US", { maximumFractionDigits: 2 }) : String(Math.round(v * 10_000) / 10_000);
  }
  return String(v);
}
