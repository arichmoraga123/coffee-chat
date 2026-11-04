/**
 * Reads fields out of a JSON object that is still being streamed (no closing quotes or braces yet),
 * so an email draft's subject and body can be shown while the model is still writing. Client-safe.
 */

/** The (possibly unfinished) string value of `key`, with JSON escapes decoded. Empty if it hasn't started. */
export function partialString(soFar: string, key: string): string {
  const m = new RegExp(`"${key}"\\s*:\\s*"`).exec(soFar);
  if (!m) return "";
  let out = "";
  for (let i = m.index + m[0].length; i < soFar.length; i++) {
    const c = soFar[i];
    if (c === '"') break;
    if (c !== "\\") {
      out += c;
      continue;
    }
    const n = soFar[i + 1];
    if (n === undefined) break; // escape cut off mid-stream
    if (n === "u") {
      const hex = soFar.slice(i + 2, i + 6);
      if (hex.length < 4) break;
      out += String.fromCharCode(parseInt(hex, 16));
      i += 5;
      continue;
    }
    out += ({ n: "\n", t: "\t", r: "\r", b: "\b", f: "\f" } as Record<string, string>)[n] ?? n;
    i++;
  }
  return out;
}

/** The finished strings in array `key` so far. */
export function partialStringArray(soFar: string, key: string): string[] {
  const m = new RegExp(`"${key}"\\s*:\\s*\\[`).exec(soFar);
  if (!m) return [];
  const rest = soFar.slice(m.index + m[0].length);
  const out: string[] = [];
  const re = /"((?:[^"\\]|\\.)*)"\s*([,\]])/g;
  let x: RegExpExecArray | null;
  while ((x = re.exec(rest))) {
    try {
      out.push(JSON.parse(`"${x[1]}"`) as string);
    } catch {
      break;
    }
    if (x[2] === "]") break;
  }
  return out;
}
