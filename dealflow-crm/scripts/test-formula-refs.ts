/** npm run test-formula-refs — reference shifting, F4 and point-mode rules for the guided spreadsheet. */
import { canPoint, cycleAnchor, rangeText, refAt, shiftFormula } from "../src/lib/formula/refs";

let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
};

eq("shift down", shiftFormula("=B5/(1+C5)^D5", 0, 1), "=B6/(1+C6)^D6");
eq("shift keeps $", shiftFormula("=$B$5*B$5+$B5", 1, 1), "=$B$5*C$5+$B6");
eq("shift range", shiftFormula("=SUM(B5:B9)", 1, 0), "=SUM(C5:C9)");
eq("shift sheet ref", shiftFormula("='IRR & MOIC'!B5+Sheet2!C3", 0, 2), "='IRR & MOIC'!B7+Sheet2!C5");
eq("no shift in strings", shiftFormula('=IF(A1>0,"B5",A2)', 0, 1), '=IF(A2>0,"B5",A3)');
eq("functions untouched", shiftFormula("=LOG10(A1)+ATAN2(B1,C1)", 0, 1), "=LOG10(A2)+ATAN2(B2,C2)");
eq("out of range", shiftFormula("=A1", -1, 0), "=#REF!");
eq("values untouched", shiftFormula("1000", 1, 1), "1000");
eq("F4 1", cycleAnchor("=B5*2", 2).text, "=$B$5*2");
eq("F4 2", cycleAnchor("=$B$5*2", 3).text, "=B$5*2");
eq("F4 3", cycleAnchor("=B$5*2", 3).text, "=$B5*2");
eq("F4 4", cycleAnchor("=$B5*2", 3).text, "=B5*2");
eq("F4 range", cycleAnchor("=SUM(B5:B9)", 7).text, "=SUM($B$5:$B$9)");
eq("refAt", refAt("=A1+B22", 6), { start: 4, end: 7, text: "B22" });
eq("point after =", canPoint("=", 1), true);
eq("point after (", canPoint("=B6*(1+", 7), true);
eq("no point after ref", canPoint("=B6", 3), false);
eq("no point in value", canPoint("12", 2), false);
eq("range text", rangeText({ col: 2, row: 9 }, { col: 2, row: 5 }), "B5:B9");
console.log(fails ? `\n${fails} failed` : "\nAll reference helpers pass.");
process.exit(fails ? 1 : 0);
