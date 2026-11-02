/**
 * Deterministic resume formatting checks, measured from the PDF with unpdf (works on Vercel serverless).
 * Same file in → same results out. No server-only imports so scripts can run it.
 */
import { getDocumentProxy, getResolvedPDFJS } from "unpdf";

export type CheckId =
  | "length"
  | "pageFill"
  | "margins"
  | "fonts"
  | "bodySize"
  | "name"
  | "headers"
  | "dates"
  | "bullets"
  | "bulletsPerEntry"
  | "sectionOrder"
  | "contact"
  | "graphics";

export type FormatCheck = {
  id: CheckId;
  label: string;
  /** null = could not be measured on this file (not counted in the score). */
  pass: boolean | null;
  message: string;
  /** Length, margins and fonts count double. */
  weight: number;
};

export type FormatResult = {
  checks: FormatCheck[];
  /** 0–10, share of measured checks passed (weighted). */
  score: number;
  pages: number;
  /** Plain text of the resume, line by line (used for comparisons and .docx-free fallbacks). */
  text: string;
};

const LABELS: Record<CheckId, string> = {
  length: "One page",
  pageFill: "Page fill",
  margins: "Margins",
  fonts: "Font families",
  bodySize: "Body font size",
  name: "Name",
  headers: "Section headers",
  dates: "Dates",
  bullets: "Bullets",
  bulletsPerEntry: "Bullets per entry",
  sectionOrder: "Section order",
  contact: "Contact line",
  graphics: "No photos or graphics",
};
const DOUBLE: CheckId[] = ["length", "margins", "fonts"];

type Item = { str: string; x: number; y: number; w: number; size: number; font: string; bold: boolean; italic: boolean };
type Line = {
  page: number;
  y: number;
  x0: number;
  x1: number;
  size: number;
  text: string;
  items: Item[];
  bold: boolean;
  italic: boolean;
};

const BULLET_CHARS = "•●▪▫‣◦○■□➢➤►▶✓✔-–—*·⁃";
const SYMBOL_FONTS = /symbol|wingding|dingbat|webdings/i;
const HEADER_WORDS =
  /^(education|academics?|experience|work experience|professional experience|relevant experience|employment|work history|leadership(?: experience)?|leadership & involvement|leadership and involvement|activities|leadership & activities|leadership and activities|involvement|campus involvement|extracurricular(?:s| activities)?|skills|technical skills|skills & interests|skills and interests|skills, activities & interests|additional(?: information)?|interests|projects|honors(?: & awards)?|awards|certifications|volunteer(?:ing| experience)?|community service|publications|coursework|relevant coursework|summary|objective|profile)$/i;

const MONTH = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const DATE_TEXT = new RegExp(`\\b${MONTH}\\.?\\s+(?:19|20)\\d{2}\\b`, "gi");
const DATE_NUM = /\b(?:0?[1-9]|1[0-2])\/(?:19|20)?\d{2}\b/g;
const DATE_SEASON = /\b(?:spring|summer|fall|autumn|winter)\s+(?:19|20)\d{2}\b/gi;
const DATE_ANY = new RegExp(
  `(?:${MONTH}\\.?\\s+(?:19|20)\\d{2}|(?:0?[1-9]|1[0-2])\\/(?:19|20)?\\d{2}|(?:spring|summer|fall|autumn|winter)\\s+(?:19|20)\\d{2}|(?:19|20)\\d{2})\\s*(?:[-–—]|to)?\\s*(?:present|current|${MONTH}\\.?\\s+(?:19|20)\\d{2}|(?:0?[1-9]|1[0-2])\\/(?:19|20)?\\d{2}|(?:19|20)\\d{2})?\\s*$`,
  "i",
);

/** "ABCDEF+TimesNewRomanPS-BoldItalicMT" → "Times New Roman". Bold/italic variants are one family. */
export function normalizeFontFamily(raw: string): string {
  let n = raw.replace(/^[A-Z]{6}\+/, "");
  n = n.split(/[-,]/)[0];
  n = n.replace(/(PSMT|PS|MT|Std|Pro|LT)$/g, "");
  n = n.replace(/(Bold|Italic|Oblique|Regular|Light|Medium|Semibold|SemiBold|Black|Heavy|Book|Roman|Condensed|Cond)+$/g, "");
  n = n.replace(/(PSMT|PS|MT)$/g, "");
  n = n.replace(/([a-z])(?=[A-Z][a-z]{2,})/g, "$1 ").trim();
  return n || raw;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const inches = (pt: number) => `${(Math.round((pt / 72) * 10) / 10).toFixed(1)}″`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function mode(values: number[]): number {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0] ?? 0;
  let n = 0;
  for (const [v, c] of counts) if (c > n || (c === n && v < best)) [best, n] = [v, c];
  return best;
}

async function extract(data: Uint8Array) {
  const pdf = await getDocumentProxy(data, { fontExtraProperties: true });
  const { OPS } = await getResolvedPDFJS();
  const imageOps = new Set([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageXObjectRepeat, OPS.paintImageMaskXObject]);
  const lines: Line[] = [];
  let images = 0;
  let pageW = 612;
  let pageH = 792;
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    if (p === 1) {
      pageW = page.view[2] - page.view[0];
      pageH = page.view[3] - page.view[1];
    }
    const ops = await page.getOperatorList();
    images += ops.fnArray.filter((f) => imageOps.has(f)).length;
    const tc = await page.getTextContent();
    const items: Item[] = [];
    for (const raw of tc.items) {
      if (!("str" in raw) || !raw.str.trim()) continue;
      const t = raw.transform as number[];
      let fontName = "";
      try {
        fontName = (page.commonObjs.get(raw.fontName) as { name?: string } | undefined)?.name ?? "";
      } catch {
        /* font not loaded */
      }
      if (!fontName) fontName = tc.styles[raw.fontName]?.fontFamily ?? raw.fontName;
      items.push({
        str: raw.str,
        x: t[4] - page.view[0],
        y: t[5] - page.view[1],
        w: raw.width,
        size: r1(Math.hypot(t[2], t[3]) || raw.height),
        font: fontName,
        bold: /bold|black|heavy|semibold|demi/i.test(fontName),
        italic: /italic|oblique/i.test(fontName),
      });
    }
    // Group items into lines (same baseline within 2pt), top to bottom.
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    const pageLines: Item[][] = [];
    for (const it of items) {
      const line = pageLines.find((l) => Math.abs(l[0].y - it.y) <= 2);
      if (line) line.push(it);
      else pageLines.push([it]);
    }
    for (const l of pageLines) {
      l.sort((a, b) => a.x - b.x);
      let text = "";
      let lastEnd = -Infinity;
      for (const it of l) {
        if (text && it.x - lastEnd > 1.5 && !text.endsWith(" ")) text += it.x - lastEnd > 20 ? "   " : " ";
        text += it.str;
        lastEnd = it.x + it.w;
      }
      const chars = (pred: (i: Item) => boolean) => l.filter(pred).reduce((s, i) => s + i.str.trim().length, 0);
      const total = chars(() => true) || 1;
      lines.push({
        page: p,
        y: l[0].y,
        x0: Math.min(...l.map((i) => i.x)),
        x1: Math.max(...l.map((i) => i.x + i.w)),
        size: mode(l.flatMap((i) => Array(Math.max(1, i.str.trim().length)).fill(i.size))),
        text: text.replace(/\s+$/, ""),
        items: l,
        bold: chars((i) => i.bold) / total > 0.6,
        italic: chars((i) => i.italic) / total > 0.6,
      });
    }
  }
  return { pages: pdf.numPages, lines, images, pageW, pageH };
}

const bulletCharOf = (line: Line): string | null => {
  const c = line.text.trimStart()[0];
  if (!c || !BULLET_CHARS.includes(c)) return null;
  // A dash only counts as a bullet when followed by a space (not "-5%").
  if ("-–—*".includes(c) && !/^\s*[-–—*]\s/.test(line.text)) return null;
  return c;
};

function isHeader(line: Line, bodySize: number): boolean {
  const t = line.text.trim().replace(/[:|]+$/, "").trim();
  if (!t || t.length > 45 || bulletCharOf(line)) return false;
  if (HEADER_WORDS.test(t)) return true;
  const letters = t.replace(/[^A-Za-z]/g, "");
  return letters.length >= 4 && letters === letters.toUpperCase() && t.split(/\s+/).length <= 5 && (line.bold || line.size > bodySize);
}

export async function runFormatChecks(data: Uint8Array): Promise<FormatResult> {
  const { pages, lines, images, pageW, pageH } = await extract(data);
  const checks: FormatCheck[] = [];
  const add = (id: CheckId, pass: boolean | null, message: string) =>
    checks.push({ id, label: LABELS[id], pass, message, weight: DOUBLE.includes(id) ? 2 : 1 });
  const text = lines.map((l) => l.text).join("\n");

  if (!lines.length) {
    add("length", pages === 1, pages === 1 ? "One page." : `Your resume is ${pages} pages. Students should keep it to one.`);
    for (const id of Object.keys(LABELS) as CheckId[]) {
      if (id !== "length") add(id, null, "No selectable text found — export the PDF from Word or Google Docs (not a scan).");
    }
    return finish(checks, pages, text);
  }

  // Length
  add("length", pages === 1, pages === 1 ? "One page." : `Your resume is ${pages} pages. Students should keep it to one.`);

  const p1 = lines.filter((l) => l.page === 1);
  const charSizes = p1.flatMap((l) => l.items.flatMap((i) => Array(i.str.trim().length).fill(i.size) as number[]));
  const bodySize = mode(charSizes);

  // Page fill (page 1)
  const lowest = Math.min(...p1.map((l) => l.y));
  const fill = (pageH - lowest) / pageH;
  add(
    "pageFill",
    fill >= 0.85,
    fill >= 0.85
      ? "The page is well filled."
      : `About ${Math.round((1 - fill) * 100 / 5) * 5}% of the page is blank — add a project, activity, or skills line.`,
  );

  // Margins (page 1)
  const left = Math.min(...p1.map((l) => l.x0));
  const right = pageW - Math.max(...p1.map((l) => l.x1));
  const top = pageH - Math.max(...p1.map((l) => l.y + l.size * 0.8));
  const bottom = lowest - bodySize * 0.25;
  const marginIssues: string[] = [];
  const side = (name: string, v: number, checkLarge = true) => {
    if (v < 35) marginIssues.push(`${name} margin is ${inches(v)} — widen to at least 0.5″.`);
    else if (checkLarge && v > 73) marginIssues.push(`${name} margin is ${inches(v)} — narrow to 1.0″ or less.`);
  };
  side("Left", left);
  side("Right", right);
  side("Top", top);
  side("Bottom", bottom, false); // a big bottom gap is reported by Page fill
  add("margins", marginIssues.length === 0, marginIssues.length ? marginIssues.join(" ") : `Margins are between 0.5″ and 1.0″.`);

  // Font families (ignore bullet glyphs and symbol fonts)
  const famChars = new Map<string, number>();
  for (const l of lines)
    for (const i of l.items) {
      const s = i.str.trim();
      if (!s || SYMBOL_FONTS.test(i.font) || [...s].every((c) => BULLET_CHARS.includes(c) || c === "|")) continue;
      const fam = normalizeFontFamily(i.font);
      famChars.set(fam, (famChars.get(fam) ?? 0) + s.length);
    }
  const families = [...famChars.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).map(([f]) => f);
  add(
    "fonts",
    families.length <= 2,
    families.length <= 2
      ? `${families.length === 1 ? "One font" : "Two fonts"}: ${families.join(", ")}.`
      : `${families.length} fonts found: ${families.join(", ")}. Use one (two at most).`,
  );

  // Section headers
  const headers = p1.concat(lines.filter((l) => l.page > 1)).filter((l) => isHeader(l, bodySize));
  const headerSet = new Set(headers);

  // Bullets: glyph bullets, or (when the PDF draws bullets as shapes) consistently indented body lines.
  const bulletLines = lines.filter((l) => bulletCharOf(l));
  const glyphBullets = bulletLines.length >= 3;
  type Bullet = { start: Line; last: Line; lines: number; section: string };
  const bullets: Bullet[] = [];
  const entries: { section: string; count: number }[] = [];
  {
    const textRight = Math.max(...lines.map((l) => l.x1));
    const xs = lines.filter((l) => !headerSet.has(l) && l.x0 > left + 6 && l.x0 < pageW * 0.3).map((l) => Math.round(l.x0));
    const indentX = !glyphBullets && xs.length >= 3 ? mode(xs) : null;
    let section = "";
    let current: Bullet | null = null;
    let entryCount = 0;
    const closeEntry = () => {
      if (entryCount) entries.push({ section, count: entryCount });
      entryCount = 0;
    };
    for (const l of lines) {
      if (headerSet.has(l)) {
        closeEntry();
        current = null;
        section = l.text.trim();
        continue;
      }
      const near =
        current !== null &&
        l.page === current.last.page &&
        current.last.y - l.y < current.start.size * 1.7 &&
        Math.abs(l.size - current.start.size) <= 0.6;
      let isBullet: boolean;
      let continues: boolean;
      if (glyphBullets) {
        isBullet = Boolean(bulletCharOf(l));
        continues = !isBullet && near && l.x0 > current!.start.x0 + 2;
      } else {
        const indented = indentX !== null && Math.abs(l.x0 - indentX) <= 2;
        // Shapes-as-bullets: a wrapped line sits at the same indent right after a full-width line.
        continues = indented && near && current!.last.x1 >= textRight - 40;
        isBullet = indented && !continues;
      }
      if (continues && current) {
        current.lines++;
        current.last = l;
      } else if (isBullet) {
        current = { start: l, last: l, lines: 1, section };
        bullets.push(current);
        entryCount++;
      } else {
        closeEntry();
        current = null;
      }
    }
    closeEntry();
  }

  // Body font size: bullets (or all non-header body lines)
  const bodyLines = (bullets.length ? bullets.map((b) => b.start) : p1.filter((l) => !headerSet.has(l))).filter(
    (l) => l.text.trim().length > 15,
  );
  const sizes = [...new Set(bodyLines.map((l) => l.size))].sort((a, b) => a - b);
  const minS = sizes[0] ?? bodySize;
  const maxS = sizes[sizes.length - 1] ?? bodySize;
  const sizeOk = minS >= 10 && maxS <= 12 && maxS - minS <= 0.5;
  add(
    "bodySize",
    sizeOk,
    sizeOk
      ? `Body text is ${minS === maxS ? `${minS} pt` : `${minS}–${maxS} pt`}.`
      : maxS - minS > 0.5
        ? `${bullets.length ? "Bullet" : "Body"} text varies between ${minS} and ${maxS} pt. Use one size between 10 and 12 pt.`
        : `Body text is ${minS} pt — use 10 to 12 pt.`,
  );

  // Name: largest text on page 1, 14–20 pt
  const largest = p1.reduce((a, b) => (b.size > a.size ? b : a), p1[0]);
  const nameLine = p1[0];
  const nameOk = largest === nameLine || largest.size === nameLine.size;
  add(
    "name",
    nameOk && nameLine.size >= 14 && nameLine.size <= 20,
    !nameOk
      ? `Your name should be the largest text on the page ("${largest.text.trim().slice(0, 40)}" is bigger).`
      : nameLine.size < 14
        ? `Your name is ${nameLine.size} pt — make it 14–20 pt.`
        : nameLine.size > 20
          ? `Your name is ${nameLine.size} pt — bring it down to 14–20 pt.`
          : `Name is ${nameLine.size} pt and the largest text.`,
  );

  // Section headers: same size and style
  if (headers.length < 2) {
    add("headers", headers.length === 0 ? null : true, headers.length === 0 ? "No section headers detected." : "One section header.");
  } else {
    const styleOf = (l: Line) => `${l.size}|${l.bold ? "b" : ""}${l.italic ? "i" : ""}|${l.text === l.text.toUpperCase() ? "caps" : "mixed"}`;
    const styles = new Map<string, string[]>();
    for (const h of headers) styles.set(styleOf(h), [...(styles.get(styleOf(h)) ?? []), h.text.trim()]);
    const main = [...styles.entries()].sort((a, b) => b[1].length - a[1].length)[0][0];
    const odd = headers.filter((h) => styleOf(h) !== main).map((h) => h.text.trim());
    add(
      "headers",
      odd.length === 0,
      odd.length === 0
        ? `${headers.length} section headers, all the same style.`
        : `${odd.map((o) => `"${o}"`).join(", ")} ${odd.length === 1 ? "doesn't" : "don't"} match the other section headers. Use one size and style.`,
    );
  }

  // Dates: one format, right edges aligned
  const kinds = new Set<string>();
  for (const l of lines) {
    if (l.text.match(DATE_TEXT)) kinds.add("Month YYYY");
    if (l.text.match(DATE_NUM)) kinds.add("MM/YYYY");
    if (l.text.match(DATE_SEASON)) kinds.add("Season YYYY");
  }
  const dateItems: Item[] = [];
  for (const l of lines) {
    const last = l.items[l.items.length - 1];
    if (last && last.x > pageW * 0.55 && DATE_ANY.test(last.str.trim()) && /\d{2}/.test(last.str)) dateItems.push(last);
  }
  const rightEdges = dateItems.map((i) => i.x + i.w);
  const edge = rightEdges.length ? Math.max(...rightEdges) : 0;
  const misaligned = rightEdges.filter((e) => edge - e > 6).length;
  const mixed = kinds.has("Month YYYY") && kinds.has("MM/YYYY");
  const dateMsgs: string[] = [];
  if (mixed) dateMsgs.push(`Dates mix formats (${[...kinds].join(" and ")}). Pick one, like "May 2026".`);
  if (misaligned) dateMsgs.push(`Dates aren't right-aligned in ${plural(misaligned, "entry", "entries")}.`);
  add(
    "dates",
    kinds.size === 0 && !dateItems.length ? null : dateMsgs.length === 0,
    kinds.size === 0 && !dateItems.length ? "No dates found." : dateMsgs.length ? dateMsgs.join(" ") : "Dates use one format and line up on the right.",
  );

  // Bullets: same character, ≤ 2 lines each
  const chars = new Set(bulletLines.map((l) => bulletCharOf(l)));
  const long = bullets.filter((b) => b.lines > 2).length;
  const bulletMsgs: string[] = [];
  if (glyphBullets && chars.size > 1) bulletMsgs.push(`${chars.size} bullet styles found (${[...chars].join(" ")}). Use one.`);
  if (long) bulletMsgs.push(`${plural(long, "bullet")} ${long === 1 ? "runs" : "run"} to 3+ lines — tighten ${long === 1 ? "it" : "them"}.`);
  add(
    "bullets",
    bullets.length ? bulletMsgs.length === 0 : null,
    !bullets.length ? "No bullets detected." : bulletMsgs.length ? bulletMsgs.join(" ") : "Bullets are consistent and short.",
  );

  // Bullets per entry
  const isJob = (s: string) => /experience|employment|work/i.test(s) && !/leadership|volunteer/i.test(s);
  const isActivity = (s: string) => /leadership|activit|involvement|extracurricular|volunteer|community/i.test(s);
  const entryIssues: string[] = [];
  const jobsOff = entries.filter((e) => isJob(e.section) && (e.count < 2 || e.count > 5));
  const actsOff = entries.filter((e) => isActivity(e.section) && (e.count < 1 || e.count > 4));
  if (jobsOff.length)
    entryIssues.push(`${plural(jobsOff.length, "job")} ${jobsOff.length === 1 ? "has" : "have"} ${countList(jobsOff)} — use 2 to 5 per job.`);
  if (actsOff.length)
    entryIssues.push(`${plural(actsOff.length, "activity", "activities")} ${actsOff.length === 1 ? "has" : "have"} ${countList(actsOff)} — use 1 to 4.`);
  const measured = entries.some((e) => isJob(e.section) || isActivity(e.section));
  add(
    "bulletsPerEntry",
    measured ? entryIssues.length === 0 : null,
    !measured ? "Couldn't match bullets to jobs or activities." : entryIssues.length ? entryIssues.join(" ") : "Each entry has a good number of bullets.",
  );

  // Section order: Education first
  const firstHeader = headers[0]?.text.trim() ?? "";
  add(
    "sectionOrder",
    headers.length ? /^(education|academics?)/i.test(firstHeader) : null,
    !headers.length
      ? "No section headers detected."
      : /^(education|academics?)/i.test(firstHeader)
        ? "Education comes first."
        : `"${firstHeader}" comes first — move Education to the top (standard for students).`,
  );

  // Contact line
  const missing: string[] = [];
  if (!/[\w.+-]+@[\w-]+\.[\w.]+/.test(text)) missing.push("email");
  if (!/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(text)) missing.push("phone number");
  if (!/linkedin/i.test(text)) missing.push("LinkedIn URL");
  add(
    "contact",
    missing.length === 0,
    missing.length === 0 ? "Email, phone, and LinkedIn are all there." : `Add your ${missing.join(" and ").replace(/ and (?=.* and )/, ", ")}.`,
  );

  // Graphics
  add("graphics", images === 0, images === 0 ? "No photos or graphics." : `${plural(images, "image")} found — remove photos, logos, and graphics.`);

  return finish(checks, pages, text);
}

function countList(es: { count: number }[]): string {
  const list = es.map((e) => e.count).join(", ");
  return es.length === 1 && es[0].count === 1 ? "1 bullet" : `${list} bullets`;
}

function finish(checks: FormatCheck[], pages: number, text: string): FormatResult {
  let got = 0;
  let total = 0;
  for (const c of checks) {
    if (c.pass === null) continue;
    total += c.weight;
    if (c.pass) got += c.weight;
  }
  const score = total ? Math.round((got / total) * 100) / 10 : 0;
  return { checks, score, pages, text };
}
